import { Typography, Card, CardContent, CardActions, Button, Box, Chip, Alert, TextField, Select, MenuItem, FormControl, InputLabel, Collapse, IconButton } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import { useState, useEffect, useRef } from 'react'
import { useGameSessionStore } from '@/stores/gameSessionStore'
import { useToast } from '@/hooks/useToast'
import { serverEvents, clientEvents } from '@/types/events'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import GroupIcon from '@mui/icons-material/Group'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import { AlphabetTypingGame, QuickMathsGame, ReflexTestGame, ColorSchemeGame } from '../challenges'

interface Challenge {
  id: string
  name: string
  description: string
  challengeType: 'custom' | 'standard'
  gameType?: string // For standard challenges: 'alphabet_typing', etc.
  reward: {
    type: 'points' | 'buff' | 'debuff'
    value: number | string // points amount or buff/debuff name
  }
  participants: string[]
  status: 'waiting' | 'active' | 'completed'
  winner?: string
  results?: Record<string, any> // For standard challenges: player results
}

function ChallengeTab() {
  const { showToast } = useToast()
  const { socket, username, gameid, isHost, joinChallenge, leaveChallenge, submitChallengeResult, activateChallenge, startChallenge, endChallenge } = useGameSessionStore()
  const [currentChallenge, setCurrentChallenge] = useState<Challenge | null>(null)
  const [hasJoined, setHasJoined] = useState(false)
  const [challengeResult, setChallengeResult] = useState<string>('')
  const [pastChallenges, setPastChallenges] = useState<Challenge[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [expandedResults, setExpandedResults] = useState<Record<string, boolean>>({})

  // Host state
  const [challengeName, setChallengeName] = useState('')
  const [challengeDescription, setChallengeDescription] = useState('')
  const [challengeType, setChallengeType] = useState<'custom' | 'standard'>('standard')
  const [gameType, setGameType] = useState<string>('alphabet_typing')
  const [rewardType, setRewardType] = useState<'points' | 'buff' | 'debuff'>('points')
  const [rewardValue, setRewardValue] = useState<string>('')
  const [selectedWinner, setSelectedWinner] = useState<string>('')
  const [showWinnerSelection, setShowWinnerSelection] = useState(false)
  const [standardChallengeActive, setStandardChallengeActive] = useState(false)
  const [typingGameTime, setTypingGameTime] = useState<number | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  // QuickMaths state
  const [currentMathProblem, setCurrentMathProblem] = useState<{ question: string; answer: number; problemIndex: number } | null>(null)
  const [mathCorrectAnswers, setMathCorrectAnswers] = useState(0)
  const [mathTotalProblems, setMathTotalProblems] = useState(10)
  const [mathTimer, setMathTimer] = useState<number | null>(null)
  const [mathFinishTime, setMathFinishTime] = useState<number | null>(null) // Finish time in milliseconds
  const quickMathsIncorrectRef = useRef<() => void>()
  // ReflexTest state
  const [reflexPrompt, setReflexPrompt] = useState<'wait' | 'press'>('wait')
  const [reflexReactionTime, setReflexReactionTime] = useState<number | null>(null)
  const [reflexDisqualified, setReflexDisqualified] = useState(false)
  // ColorScheme state
  const [currentColorQuestion, setCurrentColorQuestion] = useState<{ word?: string; fontColor?: string; isMatch?: boolean; combinations?: Array<{ word: string; fontColor: string; isMatch: boolean }>; questionIndex: number } | null>(null)
  const [colorCorrectAnswers, setColorCorrectAnswers] = useState(0)
  const [colorTimer, setColorTimer] = useState<number | null>(null)
  const [isWaitingForNextColor, setIsWaitingForNextColor] = useState(false)
  const [isColorIncorrect, setIsColorIncorrect] = useState(false)

  useEffect(() => {
    const handleChallengeUpdate = (challenge: Challenge | null) => {
      console.log('Received challenge update:', challenge)
      if (challenge) {
        // If we have a completed challenge and receive a new challenge (different ID), clear the old one
        setCurrentChallenge((prev) => {
          if (prev && prev.status === 'completed' && challenge.id !== prev.id) {
            // New challenge created, clear the old completed one
            return challenge
          }
          // If challenge is completed, preserve it even if we receive updates
          if (challenge.status === 'completed' && prev && prev.id === challenge.id) {
            // Preserve results if they exist in the previous challenge
            return {
              ...challenge,
              results: challenge.results || prev.results
            }
          }
          return challenge
        })
        if (username) {
          setHasJoined(challenge.participants.includes(username))
        }
        // If challenge becomes active and it's a standard challenge, don't reset countdown
        // The countdown will be set by the countdown event
        if (challenge.status === 'active' && challenge.challengeType === 'standard') {
          // Don't reset countdown here - let the countdown events handle it
          // Only reset if challenge goes back to waiting
        } else if (challenge.status === 'waiting') {
          // Reset state when challenge goes back to waiting
          setStandardChallengeActive(false)
          setTypingGameTime(null)
          setCountdown(null)
          setCurrentMathProblem(null)
          setMathCorrectAnswers(0)
          setMathTimer(null)
          setMathFinishTime(null)
          setReflexPrompt('wait')
          setReflexReactionTime(null)
          setReflexDisqualified(false)
        } else if (challenge.status === 'completed') {
          // When challenge completes, hide game components but keep results visible
          setStandardChallengeActive(false)
        }
      } else {
        // Only clear if we don't have a completed challenge to preserve
        setCurrentChallenge((prev) => {
          // If we have a completed challenge, keep it visible
          if (prev && prev.status === 'completed') {
            return prev
          }
          // Otherwise, clear it and reset state
          setHasJoined(false)
          setStandardChallengeActive(false)
          setTypingGameTime(null)
          setCountdown(null)
          setCurrentMathProblem(null)
          setMathCorrectAnswers(0)
          setMathTimer(null)
          setMathFinishTime(null)
          setReflexPrompt('wait')
          setReflexReactionTime(null)
          setReflexDisqualified(false)
          // Refresh past challenges when challenge ends
          if (isHost() && gameid) {
            socket.emit(clientEvents.getPastChallenges, { gameid })
          }
          return null
        })
      }
    }

    const handleChallengeComplete = (data: { challengeId: string; winner: string; reward: any }) => {
      console.log('Received challengeComplete:', data)
      // Don't update challenge here - wait for challengeUpdate which includes results
      // The challengeUpdate event will be sent with the completed challenge including results
      // Reset challenge game state (but keep finish time for display)
      setStandardChallengeActive(false)
      setCurrentMathProblem(null)
      setMathTimer(null)
      setMathCorrectAnswers(0)
      setCountdown(null)
      // Reset reflex test state
      setReflexPrompt('wait')
      setReflexReactionTime(null)
      setReflexDisqualified(false)
      // Reset color scheme state
      setColorCorrectAnswers(0)
      setColorTimer(null)
      setCurrentColorQuestion(null)
      setIsWaitingForNextColor(false)
      // Don't reset mathFinishTime - keep it to show in results
      
      if (data.winner === username) {
        let rewardText = '50 points (default)'
        if (data.reward) {
          if (data.reward.type === 'points') {
            const rewardValue = typeof data.reward.value === 'number' ? data.reward.value : (data.reward.value ? parseInt(String(data.reward.value)) : 50)
            rewardText = `${rewardValue} points`
          } else if (data.reward.type === 'buff') {
            rewardText = `Unique Buff: ${data.reward.value || 'challenge_reward'}`
          } else if (data.reward.type === 'debuff') {
            rewardText = `Unique Debuff: ${data.reward.value || 'challenge_reward'}`
          }
        }
        showToast(`Congratulations! You won the challenge! Reward: ${rewardText}`, 'success')
      } else {
        showToast(`${data.winner} won the challenge!`, 'info')
      }
    }

    const handleChallengeState = (challenge: Challenge | null) => {
      if (challenge) {
        console.log('Received challenge state:', challenge)
        setCurrentChallenge(challenge)
        if (username) {
          setHasJoined(challenge.participants.includes(username))
        }
      } else {
        setCurrentChallenge(null)
      }
    }

    const handlePastChallengesList = (data: { challenges: Challenge[] }) => {
      setPastChallenges(data.challenges)
    }

    const handleStandardChallengeCountdown = (data: { challengeId: string; countdown: number }) => {
      // Set countdown - check if it matches current challenge or if we don't have one yet
      setCurrentChallenge((prev) => {
        if (!prev || prev.id === data.challengeId) {
          setCountdown(data.countdown)
        }
        return prev
      })
      // Also set countdown directly as fallback in case of race conditions
      // This ensures countdown is set even if currentChallenge hasn't updated yet
      setCountdown((prevCountdown) => {
        // Only update if we're receiving countdown for the current challenge
        // or if we don't have a challenge set yet (race condition)
        if (!currentChallenge || currentChallenge.id === data.challengeId) {
          return data.countdown
        }
        return prevCountdown
      })
    }

    const handleStandardChallengeStart = (data: { challengeId: string; gameType: string }) => {
      console.log('Received standardChallengeStart:', data)
      // Use functional update to access latest currentChallenge state
      setCurrentChallenge((prev) => {
        if (prev && prev.id === data.challengeId) {
          console.log('Starting challenge game for', data.challengeId)
          setCountdown(null)
          setStandardChallengeActive(true)
          setTypingGameTime(null)
          // Reset correct answers counter for QuickMaths (but don't clear problem - server will send it)
          if (data.gameType === 'quick_maths') {
            setMathCorrectAnswers(0)
          }
          return prev
        }
        // If currentChallenge hasn't been set yet, still try to activate
        // This handles race conditions where start event arrives before challenge update
        if (!prev) {
          console.log('No current challenge yet, but received start event')
          // The challenge should be set soon, so we'll activate anyway
          setCountdown(null)
          setStandardChallengeActive(true)
          setTypingGameTime(null)
          // Reset correct answers counter for QuickMaths (but don't clear problem - server will send it)
          if (data.gameType === 'quick_maths') {
            setMathCorrectAnswers(0)
          }
          // Reset reflex test state
          if (data.gameType === 'reflex_test') {
            setReflexPrompt('wait')
            setReflexReactionTime(null)
            setReflexDisqualified(false)
          }
        }
        return prev
      })
    }

    const handleStandardChallengeResult = (data: { challengeId: string; username: string; result: number | { correctAnswers: number; finishTime?: number } }) => {
      // Update challenge results display
      if (currentChallenge && currentChallenge.id === data.challengeId) {
        setCurrentChallenge(prev => {
          if (!prev) return prev
          return {
            ...prev,
            results: {
              ...prev.results,
              [data.username]: data.result
            }
          }
        })
      }
    }

    const handleStandardChallengeEnd = () => {
      console.log('Received standardChallengeEnd')
      setStandardChallengeActive(false)
      setCurrentMathProblem(null)
      setMathTimer(null)
      // Note: challengeComplete will handle the actual end and winner selection
      // Don't reset mathFinishTime - keep it to show in results
    }

    const handleMathProblem = (data: { challengeId: string; problem: { question: string; answer: number; problemIndex: number }; totalProblems: number }) => {
      console.log('Received mathProblem:', data)
      // Always set the problem if we receive it - it will be used when the challenge is active
      // We'll verify the challengeId matches when rendering
      if (data.problem) {
        setCurrentMathProblem(data.problem)
        setMathTotalProblems(data.totalProblems)
        console.log('Set currentMathProblem to:', data.problem)
      } else {
        console.warn('Received mathProblem but problem is null/undefined')
      }
    }

    const handleMathAnswerFeedback = (data: { challengeId: string; username: string; isCorrect: boolean; correctAnswers: number; finished?: boolean; finishTime?: number }) => {
      console.log('Received mathAnswerFeedback:', data)
      // Always update if it's for this user, even if currentChallenge isn't set yet
      if (data.username === username) {
        setMathCorrectAnswers(data.correctAnswers)
        console.log('Updated mathCorrectAnswers to:', data.correctAnswers)
        if (data.finished && data.finishTime !== undefined) {
          setMathFinishTime(data.finishTime)
          setCurrentMathProblem(null) // Clear the problem so completion message shows
          console.log('Player finished all problems in:', data.finishTime, 'ms')
        }
        if (!data.isCorrect && quickMathsIncorrectRef.current) {
          quickMathsIncorrectRef.current()
        }
      }
    }

    const handleStandardChallengeTimer = (data: { challengeId: string; timeLeft: number }) => {
      console.log('Received standardChallengeTimer:', data)
      // Always set timer - it will be used when the challenge is active
      // Timer is used by both QuickMaths and ColorScheme
      setMathTimer(data.timeLeft)
      setColorTimer(data.timeLeft)
    }

    const handleColorQuestion = (data: { challengeId: string; question: { word?: string; fontColor?: string; isMatch?: boolean; combinations?: Array<{ word: string; fontColor: string; isMatch: boolean }>; questionIndex: number } }) => {
      console.log('Received colorQuestion:', data)
      if (data.question) {
        setCurrentColorQuestion(data.question as any)
        // Only clear waiting state if we're not in the middle of showing an incorrect answer
        // The incorrect state will be cleared when the new question arrives
        if (!isColorIncorrect) {
          setIsWaitingForNextColor(false)
        }
        // Clear incorrect state when new question arrives
        setIsColorIncorrect(false)
      }
    }

    const handleColorAnswerFeedback = (data: { challengeId: string; username: string; isCorrect: boolean; correctAnswers: number; waitForNext?: boolean }) => {
      console.log('Received colorAnswerFeedback:', data, 'waitForNext:', data.waitForNext)
      if (data.username === username) {
        setColorCorrectAnswers(data.correctAnswers)
        if (!data.isCorrect) {
          console.log('Setting isColorIncorrect to true, waitForNext:', data.waitForNext)
          setIsColorIncorrect(true)
          // Only set waiting if waitForNext is true or undefined (default to true for incorrect)
          if (data.waitForNext !== false) {
            setIsWaitingForNextColor(true)
          }
        } else {
          // Correct answer - clear incorrect state
          setIsColorIncorrect(false)
          setIsWaitingForNextColor(false)
        }
        // If waitForNext is explicitly false, clear waiting state (next question is ready)
        if (data.waitForNext === false) {
          setIsWaitingForNextColor(false)
        }
      }
    }

    socket.on(serverEvents.challengeUpdate, handleChallengeUpdate)
    socket.on(serverEvents.challengeComplete, handleChallengeComplete)
    socket.on(serverEvents.challengeState, handleChallengeState)
    socket.on(serverEvents.pastChallengesList, handlePastChallengesList)
    socket.on(serverEvents.standardChallengeCountdown, handleStandardChallengeCountdown)
    socket.on(serverEvents.standardChallengeStart, handleStandardChallengeStart)
    socket.on(serverEvents.standardChallengeResult, handleStandardChallengeResult)
    socket.on(serverEvents.standardChallengeEnd, handleStandardChallengeEnd)
    socket.on(serverEvents.mathProblem, handleMathProblem)
    socket.on(serverEvents.mathAnswerFeedback, handleMathAnswerFeedback)
    socket.on(serverEvents.standardChallengeTimer, handleStandardChallengeTimer)
    socket.on(serverEvents.reflexPromptUpdate, handleReflexPromptUpdate)
    socket.on(serverEvents.reflexResult, handleReflexResult)
    socket.on(serverEvents.colorQuestion, handleColorQuestion)
    socket.on(serverEvents.colorAnswerFeedback, handleColorAnswerFeedback)

    // Request current challenge state when component mounts
    if (gameid) {
      socket.emit(clientEvents.requestChallengeState, { gameid })
      // Request past challenges if host
      if (isHost()) {
        socket.emit(clientEvents.getPastChallenges, { gameid })
      }
    }

    return () => {
      socket.off(serverEvents.challengeUpdate, handleChallengeUpdate)
      socket.off(serverEvents.challengeComplete, handleChallengeComplete)
      socket.off(serverEvents.challengeState, handleChallengeState)
      socket.off(serverEvents.pastChallengesList, handlePastChallengesList)
      socket.off(serverEvents.standardChallengeCountdown, handleStandardChallengeCountdown)
      socket.off(serverEvents.standardChallengeStart, handleStandardChallengeStart)
      socket.off(serverEvents.standardChallengeResult, handleStandardChallengeResult)
      socket.off(serverEvents.standardChallengeEnd, handleStandardChallengeEnd)
      socket.off(serverEvents.mathProblem, handleMathProblem)
      socket.off(serverEvents.mathAnswerFeedback, handleMathAnswerFeedback)
      socket.off(serverEvents.standardChallengeTimer, handleStandardChallengeTimer)
      socket.off(serverEvents.reflexPromptUpdate, handleReflexPromptUpdate)
      socket.off(serverEvents.reflexResult, handleReflexResult)
      socket.off(serverEvents.colorQuestion, handleColorQuestion)
      socket.off(serverEvents.colorAnswerFeedback, handleColorAnswerFeedback)
    }
  }, [socket, username, gameid, isHost])

  const handleJoin = () => {
    if (!currentChallenge || !gameid || !username) return
    joinChallenge({ gameid, challengeId: currentChallenge.id, username })
    setHasJoined(true)
  }

  const handleLeave = () => {
    if (!currentChallenge || !gameid || !username) return
    leaveChallenge({ gameid, challengeId: currentChallenge.id, username })
    setHasJoined(false)
  }

  const handleSubmit = () => {
    if (!currentChallenge || !gameid) return

    if (currentChallenge.challengeType === 'standard') {
      // For standard challenges, submit the numeric result
      if (typingGameTime === null) return
      submitChallengeResult({
        gameid,
        challengeId: currentChallenge.id,
        result: typingGameTime,
        username: username || ''
      })
    } else {
      // For custom challenges, submit text result
      if (!challengeResult.trim()) return
      submitChallengeResult({
        gameid,
        challengeId: currentChallenge.id,
        result: challengeResult
      })
    }
  }

    const handleTypingGameComplete = (timeInSeconds: number) => {
      setTypingGameTime(timeInSeconds)
      // Auto-submit for standard challenges
      if (currentChallenge && currentChallenge.challengeType === 'standard' && gameid && username) {
        submitChallengeResult({
          gameid,
          challengeId: currentChallenge.id,
          result: timeInSeconds,
          username: username
        })
      }
    }

    const handleMathAnswerSubmit = (problemIndex: number, answer: number) => {
      if (!currentChallenge || !gameid || !username) return
      
      socket.emit(clientEvents.submitMathAnswer, {
        gameid,
        challengeId: currentChallenge.id,
        problemIndex,
        answer,
        username
      })
    }

    const handleReflexPress = () => {
      if (!currentChallenge || !gameid || !username) return
      
      socket.emit(clientEvents.submitReflexPress, {
        gameid,
        challengeId: currentChallenge.id,
        username
      })
    }

    const handleColorAnswerSubmit = (questionIndex: number, isMatch?: boolean, matches?: number) => {
      if (!currentChallenge || !gameid || !username) return
      
      socket.emit(clientEvents.submitColorAnswer, {
        gameid,
        challengeId: currentChallenge.id,
        questionIndex,
        isMatch,
        matches,
        username
      })
    }

    const handleReflexPromptUpdate = (data: { challengeId: string; prompt: 'wait' | 'press'; pressTime: number }) => {
      console.log('Received reflexPromptUpdate:', data)
      // Always set the prompt if we receive it - it will be used when the challenge is active
      // We'll verify the challengeId matches when rendering
      setReflexPrompt(data.prompt)
      console.log('Set reflexPrompt to:', data.prompt)
    }

    const handleReflexResult = (data: { challengeId: string; username: string; reactionTime: number | null; disqualified: boolean; disqualificationReason?: string | null }) => {
      if (currentChallenge && currentChallenge.id === data.challengeId && data.username === username) {
        setReflexReactionTime(data.reactionTime)
        setReflexDisqualified(data.disqualified)
      }
    }

  const handleActivateChallenge = () => {
    if (!gameid || !rewardValue.trim()) {
      showToast('Please fill in all required fields', 'warning')
      return
    }

    // Set default name/description for standard challenges BEFORE validation
    let finalName = challengeName
    let finalDescription = challengeDescription

    if (challengeType === 'standard') {
      if (gameType === 'alphabet_typing') {
        if (!finalName.trim()) finalName = 'Type the Alphabet Challenge'
        if (!finalDescription.trim()) finalDescription = 'Type the alphabet (a-z) as fast as you can! The fastest time wins.'
      } else if (gameType === 'quick_maths') {
        if (!finalName.trim()) finalName = 'Quick Maths Challenge'
        if (!finalDescription.trim()) finalDescription = 'Answer math problems as fast as you can! Most correct answers wins.'
      } else if (gameType === 'reflex_test') {
        if (!finalName.trim()) finalName = 'Reflex Test Challenge'
        if (!finalDescription.trim()) finalDescription = 'Wait for the PRESS! prompt and click as fast as you can! Fastest reaction time wins.'
      } else if (gameType === 'color_scheme') {
        if (!finalName.trim()) finalName = 'Color Scheme Challenge'
        if (!finalDescription.trim()) finalDescription = 'Match the color name with the font color! Most correct answers wins.'
      } else {
        // For any other standard challenge type, use generic defaults
        if (!finalName.trim()) finalName = 'Standard Challenge'
        if (!finalDescription.trim()) finalDescription = 'Complete the challenge to win!'
      }
    }

    // Now validate with the final values (after defaults are set)
    // Only require name for custom challenges (standard challenges should have defaults)
    if (challengeType === 'custom' && !finalName.trim()) {
      showToast('Please fill in all required fields', 'warning')
      return
    }

    if (challengeType === 'custom' && !finalDescription.trim()) {
      showToast('Please fill in all fields', 'warning')
      return
    }

    const reward = {
      type: rewardType,
      value: rewardType === 'points' ? parseInt(rewardValue) : rewardValue
    }

    activateChallenge({
      gameid,
      challengeType,
      gameType: challengeType === 'standard' ? gameType : undefined,
      name: finalName,
      description: finalDescription,
      reward
    })

    // Reset form
    setChallengeName('')
    setChallengeDescription('')
    setChallengeType('standard')
    setGameType('alphabet_typing')
    setRewardType('points')
    setRewardValue('')
    setShowCreateForm(false)

    // Refresh past challenges
    if (gameid) {
      socket.emit(clientEvents.getPastChallenges, { gameid })
    }
  }

  const handleStartChallenge = () => {
    if (!currentChallenge || !gameid) return
    startChallenge({ gameid, challengeId: currentChallenge.id })
  }

  const handleEndChallenge = () => {
    if (!currentChallenge || !gameid) return
    
    // For reflex_test, auto-determine winner (server will handle it)
    if (currentChallenge.gameType === 'reflex_test') {
      endChallenge({ gameid, challengeId: currentChallenge.id, winner: '' }) // Empty winner - server will determine
      // Refresh past challenges after ending
      if (gameid) {
        setTimeout(() => {
          socket.emit(clientEvents.getPastChallenges, { gameid })
        }, 500)
      }
    } else {
      setShowWinnerSelection(true)
    }
  }

  const handleConfirmWinner = () => {
    if (!currentChallenge || !gameid || !selectedWinner) {
      showToast('Please select a winner', 'warning')
      return
    }
    endChallenge({ gameid, challengeId: currentChallenge.id, winner: selectedWinner })
    setShowWinnerSelection(false)
    setSelectedWinner('')

    // Refresh past challenges after ending
    if (gameid) {
      setTimeout(() => {
        socket.emit(clientEvents.getPastChallenges, { gameid })
      }, 500)
    }
  }

  const handleCancelWinnerSelection = () => {
    setShowWinnerSelection(false)
    setSelectedWinner('')
  }

  const formatReward = (reward: Challenge['reward']) => {
    if (reward.type === 'points') {
      return `${reward.value} points`
    } else if (reward.type === 'buff') {
      return `Unique Buff: ${reward.value}`
    } else {
      return `Unique Debuff: ${reward.value}`
    }
  }

  // Host view
  if (isHost()) {
    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" gutterBottom>
            Challenge Management
          </Typography>
          {!showCreateForm && (
            <Button
              variant="contained"
              color="primary"
              onClick={() => setShowCreateForm(true)}
            >
              Create New Challenge
            </Button>
          )}
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Create and manage challenges for players to compete in!
        </Typography>

        {showCreateForm && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Create New Challenge
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Challenge Type</InputLabel>
                  <Select
                    value={challengeType}
                    onChange={(e) => setChallengeType(e.target.value as 'custom' | 'standard')}
                  >
                    <MenuItem value="standard">Standard Game</MenuItem>
                    <MenuItem value="custom">Custom</MenuItem>
                  </Select>
                </FormControl>

                {challengeType === 'standard' && (
                  <FormControl fullWidth>
                    <InputLabel>Game Type</InputLabel>
                    <Select
                      value={gameType}
                      onChange={(e) => setGameType(e.target.value)}
                    >
                      <MenuItem value="alphabet_typing">Type the Alphabet</MenuItem>
                      <MenuItem value="quick_maths">Quick Maths</MenuItem>
                      <MenuItem value="reflex_test">Reflex Test</MenuItem>
                      <MenuItem value="color_scheme">Color Scheme</MenuItem>
                    </Select>
                  </FormControl>
                )}

                <TextField
                  label="Challenge Name"
                  value={challengeName}
                  onChange={(e) => setChallengeName(e.target.value)}
                  fullWidth
                  helperText={challengeType === 'standard' ? 'Leave empty to use default name' : ''}
                />
                {challengeType === 'custom' && (
                  <TextField
                    label="Description"
                    value={challengeDescription}
                    onChange={(e) => setChallengeDescription(e.target.value)}
                    fullWidth
                    multiline
                    rows={3}
                  />
                )}
                <FormControl fullWidth>
                  <InputLabel>Reward Type</InputLabel>
                  <Select
                    value={rewardType}
                    onChange={(e) => setRewardType(e.target.value as 'points' | 'buff' | 'debuff')}
                  >
                    <MenuItem value="points">Points</MenuItem>
                    <MenuItem value="buff">Unique Buff</MenuItem>
                    <MenuItem value="debuff">Unique Debuff</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  label={rewardType === 'points' ? 'Points Amount' : 'Buff/Debuff Name'}
                  value={rewardValue}
                  onChange={(e) => setRewardValue(e.target.value)}
                  fullWidth
                  type={rewardType === 'points' ? 'number' : 'text'}
                />
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleActivateChallenge}
                    sx={{ flex: 1 }}
                  >
                    Activate Challenge
                  </Button>
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={() => {
                      setShowCreateForm(false)
                      setChallengeName('')
                      setChallengeDescription('')
                      setRewardType('points')
                      setRewardValue('')
                    }}
                  >
                    Cancel
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}

        {currentChallenge && (
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <EmojiEventsIcon sx={{ mr: 1 }} />
                <Typography variant="h6">
                  {currentChallenge.name}
                </Typography>
                <Chip
                  label={currentChallenge.status.toUpperCase()}
                  color={
                    currentChallenge.status === 'active' ? 'success' :
                      currentChallenge.status === 'completed' ? 'default' : 'warning'
                  }
                  sx={{ ml: 2 }}
                />
              </Box>

              <Typography variant="body1" sx={{ mb: 2 }}>
                {currentChallenge.description}
              </Typography>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Reward: <strong>{formatReward(currentChallenge.reward)}</strong>
                </Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <GroupIcon sx={{ mr: 1 }} />
                  <Typography variant="body2">
                    Participants ({currentChallenge.participants.length})
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {currentChallenge.participants.map((participant) => (
                    <Chip
                      key={participant}
                      label={participant}
                      size="small"
                    />
                  ))}
                </Box>
              </Box>

              {currentChallenge.status === 'completed' && currentChallenge.winner && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  <Typography variant="body1">
                    Winner: <strong>{currentChallenge.winner}</strong>
                  </Typography>
                </Alert>
              )}
            </CardContent>
            <CardActions>
              {currentChallenge.status === 'waiting' && (
                <Button
                  fullWidth
                  variant="contained"
                  color="success"
                  startIcon={<PlayArrowIcon />}
                  onClick={handleStartChallenge}
                  disabled={currentChallenge.participants.length === 0}
                >
                  Start Challenge
                </Button>
              )}
              {currentChallenge.status === 'active' && !showWinnerSelection && (
                <Button
                  fullWidth
                  variant="contained"
                  color="error"
                  onClick={handleEndChallenge}
                >
                  End Challenge & Select Winner
                </Button>
              )}
              {currentChallenge.status === 'active' && showWinnerSelection && (
                <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <FormControl fullWidth>
                    <InputLabel>Select Winner</InputLabel>
                    <Select
                      value={selectedWinner}
                      onChange={(e) => setSelectedWinner(e.target.value)}
                      label="Select Winner"
                    >
                      {currentChallenge.participants.map((participant) => (
                        <MenuItem key={participant} value={participant}>
                          {participant}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="contained"
                      color="success"
                      onClick={handleConfirmWinner}
                      disabled={!selectedWinner}
                      sx={{ flex: 1 }}
                    >
                      Confirm Winner
                    </Button>
                    <Button
                      variant="outlined"
                      color="secondary"
                      onClick={handleCancelWinnerSelection}
                      sx={{ flex: 1 }}
                    >
                      Cancel
                    </Button>
                  </Box>
                </Box>
              )}
            </CardActions>
          </Card>
        )}

        {pastChallenges.length > 0 && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom>
              Past Challenges
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {pastChallenges.map((challenge) => {
                const hasResults = challenge.results && Object.keys(challenge.results).length > 0
                const isExpanded = expandedResults[challenge.id] || false
                
                return (
                  <Card key={challenge.id}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <EmojiEventsIcon sx={{ mr: 1 }} />
                        <Typography variant="h6">
                          {challenge.name}
                        </Typography>
                        <Chip
                          label={challenge.status.toUpperCase()}
                          color="default"
                          size="small"
                          sx={{ ml: 2 }}
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {challenge.description}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                        <Typography variant="body2">
                          <strong>Reward:</strong> {formatReward(challenge.reward)}
                        </Typography>
                        {challenge.winner && (
                          <Typography variant="body2" color="success.main">
                            <strong>Winner:</strong> {challenge.winner}
                          </Typography>
                        )}
                        <Typography variant="body2" color="text.secondary">
                          <strong>Participants:</strong> {challenge.participants.length}
                        </Typography>
                        {hasResults && (
                          <IconButton
                            size="small"
                            onClick={() => setExpandedResults(prev => ({
                              ...prev,
                              [challenge.id]: !prev[challenge.id]
                            }))}
                            sx={{ ml: 'auto' }}
                          >
                            {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                          </IconButton>
                        )}
                      </Box>
                      {hasResults && (
                        <Collapse in={isExpanded}>
                          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="h6" gutterBottom>
                              Final Results
                            </Typography>
                            {challenge.gameType === 'alphabet_typing' && challenge.results && (
                              <Box>
                                {Object.entries(challenge.results)
                                  .sort(([, a], [, b]) => {
                                    const aTime = typeof a === 'number' ? a : parseFloat(a as string)
                                    const bTime = typeof b === 'number' ? b : parseFloat(b as string)
                                    if (!isNaN(aTime) && !isNaN(bTime)) {
                                      return aTime - bTime
                                    }
                                    if (!isNaN(aTime)) return -1
                                    if (!isNaN(bTime)) return 1
                                    return 0
                                  })
                                  .map(([player, resultData]) => {
                                    const time = typeof resultData === 'number' ? resultData : parseFloat(resultData as string)
                                    const timeSeconds = !isNaN(time) ? time.toFixed(2) : 'N/A'
                                    return (
                                      <Typography key={player} variant="body1" sx={{ mb: 0.5 }}>
                                        <strong>{player}:</strong> {timeSeconds}s
                                        {player === challenge.winner && ' 🏆'}
                                      </Typography>
                                    )
                                  })}
                              </Box>
                            )}
                            {challenge.gameType === 'quick_maths' && challenge.results && (
                              <Box>
                                {Object.entries(challenge.results)
                                  .sort(([, a], [, b]) => {
                                    const aData = a as { correctAnswers: number; finishTime?: number }
                                    const bData = b as { correctAnswers: number; finishTime?: number }
                                    if (bData.correctAnswers !== aData.correctAnswers) {
                                      return bData.correctAnswers - aData.correctAnswers
                                    }
                                    if (aData.finishTime && bData.finishTime) {
                                      return aData.finishTime - bData.finishTime
                                    }
                                    if (aData.finishTime) return -1
                                    if (bData.finishTime) return 1
                                    return 0
                                  })
                                  .map(([player, resultData]) => {
                                    const data = resultData as { correctAnswers: number; finishTime?: number }
                                    const finishTimeSeconds = data.finishTime ? (data.finishTime / 1000).toFixed(2) : null
                                    return (
                                      <Typography key={player} variant="body1" sx={{ mb: 0.5 }}>
                                        <strong>{player}:</strong> {data.correctAnswers} correct {data.correctAnswers === 1 ? 'answer' : 'answers'}
                                        {finishTimeSeconds && ` in ${finishTimeSeconds}s`}
                                        {player === challenge.winner && ' 🏆'}
                                      </Typography>
                                    )
                                  })}
                              </Box>
                            )}
                            {challenge.gameType === 'reflex_test' && challenge.results && (
                              <Box>
                                {Object.entries(challenge.results)
                                  .sort(([, a], [, b]) => {
                                    const aData = a as { reactionTime: number | null; disqualified: boolean }
                                    const bData = b as { reactionTime: number | null; disqualified: boolean }
                                    if (aData.disqualified && !bData.disqualified) return 1
                                    if (!aData.disqualified && bData.disqualified) return -1
                                    if (!aData.disqualified && !bData.disqualified) {
                                      if (aData.reactionTime !== null && bData.reactionTime !== null) {
                                        return aData.reactionTime - bData.reactionTime
                                      }
                                      if (aData.reactionTime !== null) return -1
                                      if (bData.reactionTime !== null) return 1
                                    }
                                    return 0
                                  })
                                  .map(([player, resultData]) => {
                                    const data = resultData as { reactionTime: number | null; disqualified: boolean; disqualificationReason?: string | null }
                                    if (data.disqualified) {
                                      let message = ''
                                      if (data.disqualificationReason === 'too_early') {
                                        message = `${player} slow down, please`
                                      } else if (data.disqualificationReason === 'too_slow') {
                                        message = `${player} has to be quicker than that`
                                      } else {
                                        message = `${player} slow down, please`
                                      }
                                      return (
                                        <Typography key={player} variant="body1" sx={{ mb: 0.5, color: 'error.main' }}>
                                          {message}
                                        </Typography>
                                      )
                                    } else {
                                      const reactionTimeSeconds = data.reactionTime ? (data.reactionTime / 1000).toFixed(3) : 'N/A'
                                      return (
                                        <Typography key={player} variant="body1" sx={{ mb: 0.5 }}>
                                          <strong>{player}:</strong> {reactionTimeSeconds}s
                                          {player === challenge.winner && ' 🏆'}
                                        </Typography>
                                      )
                                    }
                                  })}
                              </Box>
                            )}
                          </Box>
                        </Collapse>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </Box>
          </Box>
        )}
      </Box>
    )
  }

  // Player view
  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Challenges
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Join challenges activated by the host to compete for exclusive rewards!
      </Typography>

      {!currentChallenge ? (
        <Alert severity="info">
          No active challenge. Wait for the host to activate a challenge!
        </Alert>
      ) : (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <EmojiEventsIcon sx={{ mr: 1 }} />
              <Typography variant="h6">
                {currentChallenge.name}
              </Typography>
              <Chip
                label={currentChallenge.status.toUpperCase()}
                color={
                  currentChallenge.status === 'active' ? 'success' :
                    currentChallenge.status === 'completed' ? 'default' : 'warning'
                }
                sx={{ ml: 2 }}
              />
            </Box>

            <Typography variant="body1" sx={{ mb: 2 }}>
              {currentChallenge.description}
            </Typography>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Reward: <strong>{formatReward(currentChallenge.reward)}</strong>
              </Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <GroupIcon sx={{ mr: 1 }} />
                <Typography variant="body2">
                  Participants ({currentChallenge.participants.length})
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {currentChallenge.participants.map((participant) => (
                  <Chip
                    key={participant}
                    label={participant}
                    size="small"
                    color={participant === username ? 'primary' : 'default'}
                    icon={participant === username ? <CheckCircleIcon /> : undefined}
                  />
                ))}
              </Box>
            </Box>

            {currentChallenge.status === 'active' && hasJoined && (
              <Box sx={{ mt: 3 }}>
                {currentChallenge.challengeType === 'standard' ? (
                  <Box>
                    {currentChallenge.gameType === 'alphabet_typing' && currentChallenge.status === 'active' && (
                      <AlphabetTypingGame
                        onComplete={handleTypingGameComplete}
                        isActive={standardChallengeActive}
                        countdown={countdown}
                      />
                    )}
                    {currentChallenge.gameType === 'quick_maths' && mathFinishTime === null && currentChallenge.status === 'active' && (
                      <QuickMathsGame
                        onAnswerSubmit={handleMathAnswerSubmit}
                        isActive={standardChallengeActive}
                        countdown={countdown}
                        currentProblem={currentMathProblem}
                        correctAnswers={mathCorrectAnswers}
                        totalProblems={mathTotalProblems}
                        timeLeft={mathTimer}
                        onIncorrectAnswerRef={quickMathsIncorrectRef}
                      />
                    )}
                    {currentChallenge.gameType === 'reflex_test' && currentChallenge.status === 'active' && (
                      <ReflexTestGame
                        onPress={handleReflexPress}
                        isActive={standardChallengeActive}
                        countdown={countdown}
                        prompt={reflexPrompt}
                        isDisqualified={reflexDisqualified}
                        reactionTime={reflexReactionTime}
                      />
                    )}
                    {currentChallenge.gameType === 'color_scheme' && currentChallenge.status === 'active' && (
                      <ColorSchemeGame
                        onAnswerSubmit={handleColorAnswerSubmit}
                        isActive={standardChallengeActive}
                        countdown={countdown}
                        currentQuestion={currentColorQuestion}
                        correctAnswers={colorCorrectAnswers}
                        timeLeft={colorTimer}
                        isWaitingForNext={isWaitingForNextColor}
                        isIncorrect={isColorIncorrect}
                      />
                    )}
                    {typingGameTime !== null && currentChallenge.gameType === 'alphabet_typing' && (
                      <Alert severity="success" sx={{ mt: 2 }}>
                        <Typography variant="body1">
                          Your time: {typingGameTime.toFixed(2)} seconds
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Waiting for other players to finish...
                        </Typography>
                      </Alert>
                    )}
                    {mathFinishTime !== null && currentChallenge.gameType === 'quick_maths' && currentChallenge.status === 'active' && (
                      <Alert severity="success" sx={{ mt: 2 }}>
                        <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1 }}>
                          🎉 You completed all problems in: {(mathFinishTime / 1000).toFixed(2)} seconds
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Waiting for the timer to complete before announcing results...
                          {mathTimer !== null && mathTimer > 0 && (
                            <span> ({Math.floor(mathTimer / 60)}:{(mathTimer % 60).toString().padStart(2, '0')} remaining)</span>
                          )}
                        </Typography>
                      </Alert>
                    )}
                  </Box>
                ) : (
                  <Box>
                    <Typography variant="body2" gutterBottom>
                      Submit your result:
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                      <input
                        type="text"
                        value={challengeResult}
                        onChange={(e) => setChallengeResult(e.target.value)}
                        placeholder="Enter your result..."
                        style={{
                          flex: 1,
                          padding: '8px',
                          fontSize: '16px',
                          border: '1px solid #ccc',
                          borderRadius: '4px'
                        }}
                      />
                      <Button
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={!challengeResult.trim()}
                      >
                        Submit
                      </Button>
                    </Box>
                  </Box>
                )}
              </Box>
            )}

            {currentChallenge.status === 'completed' && currentChallenge.winner && (
              <Alert severity="success" sx={{ mt: 2 }}>
                <Typography variant="body1">
                  Winner: <strong>{currentChallenge.winner}</strong>
                </Typography>
                <Typography variant="body2">
                  Reward: {formatReward(currentChallenge.reward)}
                </Typography>
                {currentChallenge.gameType === 'alphabet_typing' && currentChallenge.results && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Final Results
                    </Typography>
                    {Object.entries(currentChallenge.results)
                      .sort(([, a], [, b]) => {
                        // Sort by time (ascending - fastest wins)
                        const aTime = typeof a === 'number' ? a : parseFloat(a as string)
                        const bTime = typeof b === 'number' ? b : parseFloat(b as string)
                        if (!isNaN(aTime) && !isNaN(bTime)) {
                          return aTime - bTime
                        }
                        if (!isNaN(aTime)) return -1
                        if (!isNaN(bTime)) return 1
                        return 0
                      })
                      .map(([player, resultData]) => {
                        const time = typeof resultData === 'number' ? resultData : parseFloat(resultData as string)
                        const timeSeconds = !isNaN(time) ? time.toFixed(2) : 'N/A'
                        return (
                          <Typography key={player} variant="body1" sx={{ mb: 0.5 }}>
                            <strong>{player}:</strong> {timeSeconds}s
                            {player === currentChallenge.winner && ' 🏆'}
                          </Typography>
                        )
                      })}
                  </Box>
                )}
                {currentChallenge.gameType === 'quick_maths' && currentChallenge.results && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Final Results
                    </Typography>
                    {Object.entries(currentChallenge.results)
                      .sort(([, a], [, b]) => {
                        // Sort by correct answers first (descending), then by finish time (ascending)
                        const aData = a as { correctAnswers: number; finishTime?: number }
                        const bData = b as { correctAnswers: number; finishTime?: number }
                        if (bData.correctAnswers !== aData.correctAnswers) {
                          return bData.correctAnswers - aData.correctAnswers
                        }
                        // If tied, fastest time wins
                        if (aData.finishTime && bData.finishTime) {
                          return aData.finishTime - bData.finishTime
                        }
                        if (aData.finishTime) return -1 // a finished, b didn't
                        if (bData.finishTime) return 1 // b finished, a didn't
                        return 0
                      })
                      .map(([player, resultData]) => {
                        const data = resultData as { correctAnswers: number; finishTime?: number }
                        const finishTimeSeconds = data.finishTime ? (data.finishTime / 1000).toFixed(2) : null
                        return (
                          <Typography key={player} variant="body1" sx={{ mb: 0.5 }}>
                            <strong>{player}:</strong> {data.correctAnswers} correct {data.correctAnswers === 1 ? 'answer' : 'answers'}
                            {finishTimeSeconds && ` in ${finishTimeSeconds}s`}
                            {player === currentChallenge.winner && ' 🏆'}
                          </Typography>
                        )
                      })}
                  </Box>
                )}
                {currentChallenge.gameType === 'color_scheme' && currentChallenge.results && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Final Results
                    </Typography>
                    {Object.entries(currentChallenge.results)
                      .sort(([, a], [, b]) => {
                        // Sort by correct answers (descending - most wins)
                        const aCorrect = typeof a === 'number' ? a : parseInt(a as string)
                        const bCorrect = typeof b === 'number' ? b : parseInt(b as string)
                        if (!isNaN(aCorrect) && !isNaN(bCorrect)) {
                          return bCorrect - aCorrect
                        }
                        if (!isNaN(aCorrect)) return -1
                        if (!isNaN(bCorrect)) return 1
                        return 0
                      })
                      .map(([player, resultData]) => {
                        const correct = typeof resultData === 'number' ? resultData : parseInt(resultData as string)
                        const correctCount = !isNaN(correct) ? correct : 0
                        return (
                          <Typography key={player} variant="body1" sx={{ mb: 0.5 }}>
                            <strong>{player}:</strong> {correctCount} correct
                            {player === currentChallenge.winner && ' 🏆'}
                          </Typography>
                        )
                      })}
                  </Box>
                )}
                {currentChallenge.gameType === 'reflex_test' && currentChallenge.results && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Final Results
                    </Typography>
                    {Object.entries(currentChallenge.results)
                      .sort(([, a], [, b]) => {
                        // Sort: non-disqualified first, then by reaction time (ascending - fastest wins)
                        const aData = a as { reactionTime: number | null; disqualified: boolean }
                        const bData = b as { reactionTime: number | null; disqualified: boolean }
                        
                        // Disqualified players go to the end
                        if (aData.disqualified && !bData.disqualified) return 1
                        if (!aData.disqualified && bData.disqualified) return -1
                        
                        // Both disqualified or both qualified - sort by reaction time
                        if (!aData.disqualified && !bData.disqualified) {
                          if (aData.reactionTime !== null && bData.reactionTime !== null) {
                            return aData.reactionTime - bData.reactionTime // Fastest first
                          }
                          if (aData.reactionTime !== null) return -1
                          if (bData.reactionTime !== null) return 1
                        }
                        return 0
                      })
                      .map(([player, resultData]) => {
                        const data = resultData as { reactionTime: number | null; disqualified: boolean; disqualificationReason?: string | null }
                        if (data.disqualified) {
                          // Show different message based on disqualification reason
                          let message = ''
                          if (data.disqualificationReason === 'too_early') {
                            message = `${player} slow down, please`
                          } else if (data.disqualificationReason === 'too_slow') {
                            message = `${player} has to be quicker than that`
                          } else {
                            message = `${player} slow down, please` // Default message
                          }
                          return (
                            <Typography key={player} variant="body1" sx={{ mb: 0.5, color: 'error.main' }}>
                              {message}
                            </Typography>
                          )
                        } else {
                          const reactionTimeSeconds = data.reactionTime ? (data.reactionTime / 1000).toFixed(3) : 'N/A'
                          return (
                            <Typography key={player} variant="body1" sx={{ mb: 0.5 }}>
                              <strong>{player}:</strong> {reactionTimeSeconds}s
                              {player === currentChallenge.winner && ' 🏆'}
                            </Typography>
                          )
                        }
                      })}
                  </Box>
                )}
              </Alert>
            )}
          </CardContent>
          <CardActions>
            {currentChallenge.status === 'waiting' && (
              <>
                {!hasJoined ? (
                  <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    onClick={handleJoin}
                  >
                    Join Challenge
                  </Button>
                ) : (
                  <Button
                    fullWidth
                    variant="outlined"
                    color="secondary"
                    onClick={handleLeave}
                  >
                    Leave Challenge
                  </Button>
                )}
              </>
            )}
            {currentChallenge.status === 'active' && !hasJoined && (
              <Alert severity="warning" sx={{ width: '100%' }}>
                Challenge is active. You cannot join now.
              </Alert>
            )}
          </CardActions>
        </Card>
      )}
    </Box>
  )
}

export default ChallengeTab

