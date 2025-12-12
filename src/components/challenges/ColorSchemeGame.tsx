import { Box, Typography, Button, Paper, Alert } from '@mui/material'
import { useState, useEffect } from 'react'

interface ColorCombination {
  word: string
  fontColor: string
  isMatch: boolean
  questionIndex: number
}

interface DoubleColorCombination {
  combinations: Array<{ word: string; fontColor: string; isMatch: boolean }>
  questionIndex: number
}

type ColorQuestion = ColorCombination | DoubleColorCombination | { word?: string; fontColor?: string; isMatch?: boolean; combinations?: Array<{ word: string; fontColor: string; isMatch: boolean }>; questionIndex: number }

interface ColorSchemeGameProps {
  onAnswerSubmit: (questionIndex: number, isMatch?: boolean, matches?: number) => void
  isActive: boolean
  countdown?: number | null
  currentQuestion: ColorQuestion | null
  correctAnswers: number
  timeLeft?: number | null
  isWaitingForNext?: boolean
  isIncorrect?: boolean
}

// Color name to hex mapping - only the specified colors
const colorMap: Record<string, string> = {
  'black': '#000000',
  'red': '#FF0000',
  'blue': '#0000FF',
  'green': '#008000',
  'orange': '#FFA500',
  'purple': '#800080',
  'pink': '#FFC0CB',
  'brown': '#654321', // Darker brown to distinguish from red
  'gray': '#808080',
  'grey': '#808080' // Support both spellings
}

function ColorSchemeGame({ 
  onAnswerSubmit, 
  isActive, 
  countdown, 
  currentQuestion,
  correctAnswers,
  timeLeft,
  isWaitingForNext,
  isIncorrect
}: ColorSchemeGameProps) {
  const [isDisabled, setIsDisabled] = useState(false)
  const [showIncorrect, setShowIncorrect] = useState(false)
  const [incorrectCountdown, setIncorrectCountdown] = useState<number | null>(null)

  // Reset state when new question arrives
  useEffect(() => {
    if (currentQuestion) {
      // Only re-enable buttons if we're not showing an incorrect answer
      if (!isIncorrect && !showIncorrect) {
        setIsDisabled(false)
      }
      // Only clear incorrect state if isIncorrect is false (new question arrived)
      if (!isIncorrect) {
        setShowIncorrect(false)
        setIncorrectCountdown(null)
      }
    }
  }, [currentQuestion, isIncorrect, showIncorrect])

  // Handle incorrect answer - show countdown and disable buttons
  useEffect(() => {
    if (isIncorrect && isWaitingForNext) {
      console.log('Showing incorrect message, starting countdown')
      setShowIncorrect(true)
      setIncorrectCountdown(3) // Start at 3 seconds
      setIsDisabled(true) // Disable buttons during cooldown
    } else if (!isIncorrect && !isWaitingForNext) {
      // Clear incorrect state when isIncorrect becomes false and waiting is cleared
      setShowIncorrect(false)
      setIncorrectCountdown(null)
      // Re-enable buttons when incorrect state is cleared and new question is ready
      if (currentQuestion) {
        setIsDisabled(false)
      }
    }
  }, [isIncorrect, isWaitingForNext, currentQuestion])

  // Handle incorrect answer countdown timer
  useEffect(() => {
    if (showIncorrect && incorrectCountdown !== null && incorrectCountdown > 0) {
      const timer = setTimeout(() => {
        setIncorrectCountdown(prev => {
          if (prev !== null && prev > 0) {
            return prev - 1
          }
          return prev
        })
      }, 1000)
      return () => clearTimeout(timer)
    } else if (showIncorrect && incorrectCountdown === 0 && !isWaitingForNext) {
      // Cooldown finished and waiting is cleared - re-enable buttons when new question arrives
      // Note: Buttons will be re-enabled when the new question arrives (handled in the other useEffect)
    }
  }, [showIncorrect, incorrectCountdown, isWaitingForNext])

  // Show countdown if we have one
  if (countdown !== null && countdown !== undefined && countdown >= 0) {
    return (
      <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
        <Box>
          <Typography variant="h2" color="primary" sx={{ fontWeight: 'bold', mb: 2 }}>
            {countdown === 0 ? 'GO!' : countdown}
          </Typography>
          <Typography variant="h6" color="text.secondary">
            {countdown === 0 ? 'Get ready for Color Scheme!' : 'Get ready!'}
          </Typography>
        </Box>
      </Paper>
    )
  }

  if (!isActive) {
    return (
      <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          Waiting for challenge to start...
        </Typography>
      </Paper>
    )
  }

  // If we're showing an incorrect answer, don't show the "waiting" message
  // Show the incorrect message with countdown instead
  // Only show "waiting" message if we're not showing incorrect feedback
  if ((isWaitingForNext || !currentQuestion) && !showIncorrect && !isIncorrect) {
    return (
      <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          {isWaitingForNext ? 'Waiting for next question...' : 'Waiting for question...'}
        </Typography>
      </Paper>
    )
  }
  
  // If we're showing incorrect but don't have a current question, show just the incorrect message
  if (showIncorrect && !currentQuestion) {
    return (
      <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            Incorrect!
          </Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            Waiting {incorrectCountdown} second{incorrectCountdown !== 1 ? 's' : ''} for next question...
          </Typography>
        </Alert>
      </Paper>
    )
  }

  const handleAnswer = (isMatch?: boolean, matches?: number) => {
    if (isDisabled || showIncorrect) return
    
    setIsDisabled(true)
    onAnswerSubmit(currentQuestion.questionIndex, isMatch, matches)
  }

  // Check if this is a double combination question (after question 10)
  const isDoubleQuestion = currentQuestion && 'combinations' in currentQuestion

  return (
    <Box>
      <Paper elevation={3} sx={{ p: 3, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h5">
            Color Scheme Challenge
          </Typography>
          {timeLeft !== null && timeLeft !== undefined && (
            <Typography variant="h5" color={timeLeft <= 10 ? 'error.main' : 'primary.main'} sx={{ fontWeight: 'bold' }}>
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </Typography>
          )}
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {isDoubleQuestion 
            ? 'How many color combinations match? Most correct answers wins!'
            : 'Does the word match the font color? Most correct answers wins!'}
        </Typography>

        {showIncorrect && incorrectCountdown !== null && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Incorrect!
            </Typography>
            <Typography variant="body1" sx={{ mt: 1 }}>
              Waiting {incorrectCountdown} second{incorrectCountdown !== 1 ? 's' : ''} for next question...
            </Typography>
          </Alert>
        )}

        {isDoubleQuestion ? (
          // Two combinations display
          <Box sx={{ mb: 4, textAlign: 'center' }}>
            <Box sx={{ display: 'flex', gap: 4, justifyContent: 'center', flexWrap: 'wrap' }}>
              {currentQuestion.combinations.map((combo, idx) => {
                const fontColorHex = colorMap[combo.fontColor.toLowerCase()] || combo.fontColor
                return (
                  <Box key={idx} sx={{ minHeight: 150, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography 
                      variant="h2" 
                      sx={{ 
                        fontWeight: 'bold',
                        color: fontColorHex,
                        textTransform: 'capitalize'
                      }}
                    >
                      {combo.word}
                    </Typography>
                  </Box>
                )
              })}
            </Box>
          </Box>
        ) : (
          // Single combination display
          <Box sx={{ mb: 4, textAlign: 'center', minHeight: 150, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography 
              variant="h2" 
              sx={{ 
                fontWeight: 'bold',
                color: colorMap[currentQuestion.fontColor.toLowerCase()] || currentQuestion.fontColor,
                textTransform: 'capitalize'
              }}
            >
              {currentQuestion.word}
            </Typography>
          </Box>
        )}

        {isDoubleQuestion ? (
          // Three buttons for double combinations: 2 matches, 1 match, no match
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 3 }}>
            <Button
              variant="contained"
              color="success"
              size="large"
              onClick={() => handleAnswer(undefined, 2)}
              disabled={isDisabled || showIncorrect}
              sx={{ minWidth: 150, fontSize: '1.2rem', py: 1.5 }}
            >
              2 Matches
            </Button>
            <Button
              variant="contained"
              color="warning"
              size="large"
              onClick={() => handleAnswer(undefined, 1)}
              disabled={isDisabled || showIncorrect}
              sx={{ minWidth: 150, fontSize: '1.2rem', py: 1.5 }}
            >
              1 Match
            </Button>
            <Button
              variant="contained"
              color="error"
              size="large"
              onClick={() => handleAnswer(undefined, 0)}
              disabled={isDisabled || showIncorrect}
              sx={{ minWidth: 150, fontSize: '1.2rem', py: 1.5 }}
            >
              No Match
            </Button>
          </Box>
        ) : (
          // Two buttons for single combination: Match, No Match
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 3 }}>
            <Button
              variant="contained"
              color="success"
              size="large"
              onClick={() => handleAnswer(true)}
              disabled={isDisabled || showIncorrect}
              sx={{ minWidth: 150, fontSize: '1.2rem', py: 1.5 }}
            >
              Match
            </Button>
            <Button
              variant="contained"
              color="error"
              size="large"
              onClick={() => handleAnswer(false)}
              disabled={isDisabled || showIncorrect}
              sx={{ minWidth: 150, fontSize: '1.2rem', py: 1.5 }}
            >
              No Match
            </Button>
          </Box>
        )}

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="h6" color="success.main">
            Correct Answers: {correctAnswers}
          </Typography>
        </Box>
      </Paper>
    </Box>
  )
}

export default ColorSchemeGame

