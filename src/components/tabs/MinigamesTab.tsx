import { Typography, Grid, Card, CardContent, CardActions, Button, Box } from '@mui/material'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useGameSessionStore } from '@/stores/gameSessionStore'
import { useToast } from '@/hooks/useToast'
import { clientEvents } from '@/types/events'
import SportsEsportsIcon from '@mui/icons-material/SportsEsports'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import { MemoryMatchGame, QuickClickGame, NumberGuessGame, TriviaGame } from '../minigames'

interface Minigame {
  id: string
  name: string
  description: string
  reward: number
  duration: number
  icon: React.ReactNode
}

const MINIGAME_COOLDOWN_SECONDS = 120 // 2 minutes

function MinigamesTab() {
  const { ToastContainer } = useToast() // Keep ToastContainer for rendering, but use store's showToast
  const { addPoints, activeBuffs, socket, username, gameid, showToast } = useGameSessionStore()
  const [activeGame, setActiveGame] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [cooldownRemaining, setCooldownRemaining] = useState<Record<string, number>>({})
  const [triviaDifficulty, setTriviaDifficulty] = useState<number | null>(null) // 50, 100, or 200
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null)
  const finishGameInProgressRef = useRef<boolean>(false) // Track if finishGame is currently executing

  // Get last minigame play time from localStorage for a specific game
  const getLastMinigameTime = (gameId: string): number | null => {
    if (!gameid || !username) return null
    const stored = localStorage.getItem(`minigameCooldown_${gameid}_${username}_${gameId}`)
    return stored ? parseInt(stored, 10) : null
  }

  // Set last minigame play time in localStorage for a specific game
  const setLastMinigameTime = (gameId: string, timestamp: number) => {
    if (!gameid || !username) return
    localStorage.setItem(`minigameCooldown_${gameid}_${username}_${gameId}`, timestamp.toString())
  }

  // Calculate remaining cooldown time for a specific game
  const calculateCooldownForGame = (gameId: string, cooldownSeconds: number = MINIGAME_COOLDOWN_SECONDS): number => {
    const lastPlayTime = getLastMinigameTime(gameId)
    if (!lastPlayTime) {
      return 0
    }
    
    const elapsed = Math.floor((Date.now() - lastPlayTime) / 1000)
    return Math.max(0, cooldownSeconds - elapsed)
  }

  // Get cooldown for Trivia (all difficulties share the same cooldown)
  const getTriviaCooldown = (): number => {
    // Check if there's a stored cooldown for trivia
    const lastTime = getLastMinigameTime('5_trivia')
    if (!lastTime) return 0
    
    // Get the difficulty that was used (stored in a separate key)
    const difficultyKey = localStorage.getItem(`trivia_last_difficulty_${gameid}_${username}`)
    if (!difficultyKey) return 0
    
    const difficulty = parseInt(difficultyKey)
    const cooldownMinutes = difficulty === 50 ? 2.5 : difficulty === 100 ? 5 : 10
    const cooldownSeconds = cooldownMinutes * 60
    return calculateCooldownForGame('5_trivia', cooldownSeconds)
  }

  // Update cooldown timer every second for all games
  useEffect(() => {
    if (!gameid || !username) {
      setCooldownRemaining({})
      return
    }

    // Calculate remaining cooldown time for all games
    // Game IDs: '1' (Quick Click), '2' (Memory Match), '4' (Number Guess), '5' (Trivia)
    const calculateAllCooldowns = () => {
      const cooldowns: Record<string, number> = {}
      const gameIds = ['1', '2', '4', '5']
      gameIds.forEach(gameId => {
        if (gameId === '5') {
          // Trivia has a single cooldown that applies to all difficulties
          cooldowns['5'] = getTriviaCooldown()
        } else {
          cooldowns[gameId] = calculateCooldownForGame(gameId)
        }
      })
      setCooldownRemaining(cooldowns)
    }

    // Calculate immediately
    calculateAllCooldowns()
    
    // Update every second
    cooldownTimerRef.current = setInterval(() => {
      calculateAllCooldowns()
    }, 1000)

    return () => {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current)
      }
    }
  }, [gameid, username])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current)
      }
    }
  }, [])

  const minigames: Minigame[] = [
    { 
      id: '1', 
      name: 'Quick Click', 
      description: 'Click as fast as you can for 5 seconds!',
      reward: 25,
      duration: 5,
      icon: <SportsEsportsIcon />
    },
    { 
      id: '2', 
      name: 'Memory Match', 
      description: 'Match pairs of cards in under 45 seconds',
      reward: 50,
      duration: 45,
      icon: <EmojiEventsIcon />
    },
    { 
      id: '4', 
      name: 'Number Guess', 
      description: 'Guess the number between 1 and 100!',
      reward: 1000,
      duration: 0, // No time limit
      icon: <SportsEsportsIcon />
    },
    { 
      id: '5', 
      name: 'Trivia', 
      description: 'Answer trivia questions for 50, 100, or 200 points!',
      reward: 200,
      duration: 20,
      icon: <EmojiEventsIcon />
    }
  ]

  const startGame = (game: Minigame, difficulty?: number) => {
    // For Trivia, check if trivia is on cooldown (applies to all difficulties)
    if (game.id === '5') {
      // Check if trivia is on cooldown (any difficulty)
      if (cooldownRemaining['5'] > 0) {
        return
      }
      
      if (!difficulty) {
        // Show difficulty selection - set activeGame to '5_select' to show selection UI
        setActiveGame('5_select')
        return
      }
      setTriviaDifficulty(difficulty)
    } else {
      // Check if cooldown is active for this specific game
      if (cooldownRemaining[game.id] > 0) {
        return
      }
    }

    // Clear completion flag when starting a new game
    finishGameInProgressRef.current = false
    setActiveGame(game.id)
    setTimeLeft(game.duration)
    
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    
    // Only set up timer for games with duration > 0
    if (game.duration > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (timerRef.current) {
              clearInterval(timerRef.current)
              timerRef.current = null
            }
            // For Quick Click, onComplete will be called by the component
            // For other games, finish with 0 clicks
            if (game.id !== '1') {
              finishGame(game, 0, 0)
            }
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
  }

  const handleQuickClickComplete = useCallback((clicks: number) => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    const game = minigames.find(g => g.id === '1')
    if (game && !finishGameInProgressRef.current) {
      finishGame(game, 0, clicks)
    }
  }, [])

  const handleMemoryMatchComplete = (matches: number, timedOut?: boolean) => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    const game = minigames.find(g => g.id === '2')
    if (game) {
      finishGame(game, matches, 0, 0, 0, timedOut)
    }
  }

  const handleNumberGuessComplete = (points: number) => {
    // Number Guess doesn't use a timer, so no need to clear it
    const game = minigames.find(g => g.id === '4')
    if (game) {
      finishGame(game, 0, 0, points)
    }
  }

  const handleTriviaComplete = (points: number, difficulty: number) => {
    // Trivia uses its own timer, so no need to clear the main timer
    const game = minigames.find(g => g.id === '5')
    if (game && triviaDifficulty) {
      finishGame(game, 0, 0, points, difficulty)
      setTriviaDifficulty(null)
    }
  }

  // Helper function to round down to nearest 5
  const roundDownToNearest5 = (num: number): number => {
    return Math.floor(num / 5) * 5
  }

  const handleQuit = () => {
    const game = minigames.find(g => g.id === activeGame)
    if (game) {
      // Clear timer if active
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      
      // Apply cooldown even when quitting early
      if (game.id === '5' && triviaDifficulty) {
        const cooldownMinutes = triviaDifficulty === 50 ? 2.5 : triviaDifficulty === 100 ? 5 : 10
        const cooldownSeconds = cooldownMinutes * 60
        setLastMinigameTime('5_trivia', Date.now())
        if (gameid && username) {
          localStorage.setItem(`trivia_last_difficulty_${gameid}_${username}`, String(triviaDifficulty))
        }
        setCooldownRemaining(prev => ({
          ...prev,
          ['5']: cooldownSeconds
        }))
      } else {
        setLastMinigameTime(game.id, Date.now())
        setCooldownRemaining(prev => ({
          ...prev,
          [game.id]: MINIGAME_COOLDOWN_SECONDS
        }))
      }
      
      // Exit the minigame
      setActiveGame(null)
      setTriviaDifficulty(null)
    }
  }

  const finishGame = (game: Minigame, matchesFound: number = 0, clicks: number = 0, numberGuessPoints: number = 0, triviaDifficulty: number = 0, timedOut: boolean = false) => {
    // Prevent duplicate calls - if finishGame is already executing, return early
    if (finishGameInProgressRef.current) {
      return
    }
    finishGameInProgressRef.current = true
    
    // Check if double points buff is active
    const doublePointsBuff = activeBuffs['buff1']
    const hasDoublePoints = doublePointsBuff && doublePointsBuff.expiresAt > Date.now()
    
    // Calculate reward based on game type
    let baseReward = game.reward
    if (game.id === '1') { // Quick Click game
      // Reward is number of clicks rounded down to nearest 5
      baseReward = roundDownToNearest5(clicks)
    } else if (game.id === '2') { // Memory Match game
      // Award points based on matches: 50 points for all 8 matches, scaled down
      baseReward = Math.floor((matchesFound / 8) * game.reward)
      if (matchesFound === 8) {
        baseReward = game.reward // Full reward for perfect score
      }
    } else if (game.id === '4') { // Number Guess game
      // Reward is determined by the game component based on attempts
      baseReward = numberGuessPoints
    } else if (game.id === '5') { // Trivia game
      // Reward is determined by the game component (0 if wrong, difficulty if correct)
      baseReward = numberGuessPoints // Reusing this parameter for trivia points
    }
    
    const finalReward = hasDoublePoints ? baseReward * 2 : baseReward
    
    addPoints(finalReward)
    
    // Set cooldown timer for this specific game - store current timestamp
    if (game.id === '5' && triviaDifficulty > 0) {
      // Trivia: all difficulties share the same cooldown based on selected difficulty
      const cooldownMinutes = triviaDifficulty === 50 ? 2.5 : triviaDifficulty === 100 ? 5 : 10
      const cooldownSeconds = cooldownMinutes * 60
      setLastMinigameTime('5_trivia', Date.now())
      // Store the difficulty used so we know the cooldown duration
      if (gameid && username) {
        localStorage.setItem(`trivia_last_difficulty_${gameid}_${username}`, String(triviaDifficulty))
      }
      // Update cooldown state immediately - applies to all trivia difficulties
      setCooldownRemaining(prev => ({
        ...prev,
        ['5']: cooldownSeconds
      }))
    } else {
      setLastMinigameTime(game.id, Date.now())
      // Update cooldown state immediately
      setCooldownRemaining(prev => ({
        ...prev,
        [game.id]: MINIGAME_COOLDOWN_SECONDS
      }))
    }
    
    // Emit minigame completion event
    if (gameid && username) {
      socket.emit(clientEvents.minigameComplete, {
        gameid,
        username,
        minigameName: game.name,
        pointsEarned: finalReward,
        hadDoublePoints: hasDoublePoints
      })
    }
    
    // Only show toast for Trivia if they earned points (got it correct)
    // For other games, always show toast
    // Use store's showToast (same instance used by debuff/buff toasts) to prevent flickering
    if (showToast) {
      if (game.id === '5') {
        // Trivia: Only show toast if they got points (correct answer)
        if (finalReward > 0) {
          showToast(`Congratulations! You earned ${finalReward} points!${hasDoublePoints ? ' (Double Points Active!)' : ''}`, 'success')
        }
        // If they got 0 points, the TriviaGame component already shows the feedback, so no toast needed
      } else {
        // Other games: Always show toast
        if (game.id === '2') {
          // Memory Match: Different messages for win vs loss vs timeout
          if (matchesFound === 8) {
            // Player won - show win message with points
            showToast(`You won! You earned ${finalReward} points!${hasDoublePoints ? ' (Double Points Active!)' : ''}`, 'success')
          } else if (timedOut) {
            // Player timed out - show nice try message
            showToast('Nice Try, play again later', 'info')
          } else {
            // Player lost - show try again message
            showToast('Try again later', 'info')
          }
        } else {
          // Other games: Standard toast
          if (game.id === '1') {
            // Quick Click: Show win message with points earned
            showToast(`You won! You earned ${finalReward} points!${hasDoublePoints ? ' (Double Points Active!)' : ''}`, 'success')
          } else {
            // Other games: Standard toast
            let resultMessage = ''
            showToast(`Congratulations! You earned ${finalReward} points!${resultMessage}${hasDoublePoints ? ' (Double Points Active!)' : ''}`, 'success')
          }
        }
      }
    }
    
    // Set active game to null after showing notification to allow toast to display
    setActiveGame(null)
    
    // Reset the flag after a delay to allow for legitimate re-completions
    setTimeout(() => {
      finishGameInProgressRef.current = false
    }, 2000)
  }

  return (
    <Box>
      <ToastContainer />
      <Typography variant="h5" gutterBottom>
        Minigames
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Play minigames to earn points that you can spend in the store!
      </Typography>

      {activeGame ? (
        // Show the active minigame, replacing the cards
        <>
          <Box sx={{ mb: 2, textAlign: 'center' }}>
            <Button
              variant="outlined"
              color="secondary"
              onClick={handleQuit}
              sx={{ mb: 2 }}
            >
              Quit
            </Button>
          </Box>
          {activeGame === '1' && (
            <QuickClickGame 
              onComplete={handleQuickClickComplete}
              timeLeft={timeLeft}
              onQuit={handleQuit}
            />
          )}

          {activeGame === '2' && (
            <MemoryMatchGame 
              onComplete={handleMemoryMatchComplete}
              timeLeft={timeLeft}
            />
          )}

          {activeGame === '4' && (
            <NumberGuessGame 
              onComplete={handleNumberGuessComplete}
              onQuit={handleQuit}
            />
          )}

          {activeGame === '5_select' && (
            <Box sx={{ mt: 3, p: 4, bgcolor: 'background.paper', borderRadius: 2, boxShadow: 3, textAlign: 'center' }}>
              <Button
                variant="outlined"
                color="secondary"
                onClick={handleQuit}
                sx={{ mb: 2 }}
              >
                Quit
              </Button>
              <Typography variant="h5" gutterBottom>
                Select Trivia Difficulty
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Choose your difficulty level. Higher points = harder questions = longer cooldown!
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                {[50, 100, 200].map((difficulty) => {
                  // All difficulties share the same cooldown
                  const cooldown = cooldownRemaining['5'] || 0
                  const cooldownMinutes = difficulty === 50 ? 2.5 : difficulty === 100 ? 5 : 10
                  const numChoices = difficulty === 50 ? 3 : difficulty === 100 ? 4 : 5
                  return (
                    <Card key={difficulty} sx={{ minWidth: 200 }}>
                      <CardContent>
                        <Typography variant="h6" color="primary" gutterBottom>
                          {difficulty} Points
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {numChoices} choices
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {cooldownMinutes} min cooldown
                        </Typography>
                        {cooldown > 0 && (
                          <Typography variant="body2" sx={{ mb: 2, color: 'warning.main' }}>
                            Cooldown: {Math.floor(cooldown / 60)}:{(cooldown % 60).toString().padStart(2, '0')}
                          </Typography>
                        )}
                        <Button
                          fullWidth
                          variant="contained"
                          color="primary"
                          onClick={() => startGame(minigames.find(g => g.id === '5')!, difficulty)}
                          disabled={cooldown > 0}
                        >
                          {cooldown > 0 
                            ? `Cooldown: ${Math.floor(cooldown / 60)}:${(cooldown % 60).toString().padStart(2, '0')}`
                            : 'Select'}
                        </Button>
                      </CardContent>
                    </Card>
                  )
                })}
              </Box>
            </Box>
          )}

          {activeGame === '5' && triviaDifficulty && (
            <TriviaGame 
              onComplete={handleTriviaComplete}
              difficulty={triviaDifficulty}
            />
          )}

          {activeGame && activeGame !== '1' && activeGame !== '2' && activeGame !== '4' && activeGame !== '5' && activeGame !== '5_select' && (
            <Box sx={{ mt: 3, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
              <Typography variant="body2" sx={{ color: 'info.contrastText' }}>
                Game in progress! Complete the minigame to earn points.
              </Typography>
            </Box>
          )}
        </>
      ) : (
        // Show the minigame cards when no game is active
        <Grid container spacing={2}>
          {minigames.map((game) => (
            <Grid item xs={12} sm={6} md={4} key={game.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    {game.icon}
                    <Typography variant="h6" sx={{ ml: 1 }}>
                      {game.name}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {game.description}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Duration: {game.duration} seconds
                  </Typography>
                  <Typography variant="h6" color="primary">
                    {game.id === '1' 
                      ? 'Reward: 1 Point for every click'
                      : game.id === '4'
                      ? 'Reward: 5-1000 points'
                      : game.id === '5'
                      ? 'Reward: 50, 100, or 200 points'
                      : `Reward: ${game.reward} points`}
                  </Typography>
                  {game.id === '5' ? (
                    <Box sx={{ mt: 2 }}>
                      {/* All trivia difficulties share the same cooldown */}
                      {(() => {
                        const cooldown = cooldownRemaining['5'] || 0
                        if (cooldown > 0) {
                          return (
                            <Typography variant="body2" sx={{ color: 'warning.main' }}>
                              Cooldown: {Math.floor(cooldown / 60)}:{(cooldown % 60).toString().padStart(2, '0')}
                            </Typography>
                          )
                        }
                        return null
                      })()}
                    </Box>
                  ) : cooldownRemaining[game.id] > 0 && (
                    <Typography variant="body2" sx={{ mt: 2, color: 'warning.main' }}>
                      Cooldown: {Math.floor(cooldownRemaining[game.id] / 60)}:{(cooldownRemaining[game.id] % 60).toString().padStart(2, '0')}
                    </Typography>
                  )}
                </CardContent>
                <CardActions>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => startGame(game)}
                    disabled={(cooldownRemaining[game.id] || 0) > 0}
                  >
                    {(cooldownRemaining[game.id] || 0) > 0 
                      ? `Cooldown: ${Math.floor(cooldownRemaining[game.id] / 60)}:${(cooldownRemaining[game.id] % 60).toString().padStart(2, '0')}`
                      : 'Play'}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  )
}

export default MinigamesTab

