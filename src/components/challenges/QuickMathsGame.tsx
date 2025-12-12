import { Box, Typography, TextField, Paper, Button, Alert } from '@mui/material'
import { useState, useEffect, useRef } from 'react'
import CalculateIcon from '@mui/icons-material/Calculate'

interface MathProblem {
  question: string
  answer: number
  problemIndex: number
}

interface QuickMathsGameProps {
  onAnswerSubmit: (problemIndex: number, answer: number) => void
  isActive: boolean
  countdown?: number | null
  currentProblem: MathProblem | null
  correctAnswers: number
  totalProblems: number
  timeLeft?: number | null
  onIncorrectAnswerRef?: React.MutableRefObject<(() => void) | undefined>
}

function QuickMathsGame({ 
  onAnswerSubmit, 
  isActive, 
  countdown, 
  currentProblem,
  correctAnswers,
  totalProblems,
  timeLeft,
  onIncorrectAnswerRef
}: QuickMathsGameProps) {
  const [input, setInput] = useState('')
  const [showIncorrect, setShowIncorrect] = useState(false)
  const [showCorrect, setShowCorrect] = useState(false)
  const [isDisabled, setIsDisabled] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Expose handleIncorrectAnswer to parent via ref
  useEffect(() => {
    if (onIncorrectAnswerRef) {
      onIncorrectAnswerRef.current = () => {
        setShowIncorrect(true)
        setIsDisabled(true)
        setInput('')
        waitingForFeedbackRef.current = false // No longer waiting
        
        // Re-enable after 1 second
        setTimeout(() => {
          setShowIncorrect(false)
          setIsDisabled(false)
          if (inputRef.current) {
            inputRef.current.focus()
          }
        }, 1000)
      }
    }
  }, [onIncorrectAnswerRef])

  // Reset input when new problem arrives
  useEffect(() => {
    if (currentProblem) {
      setInput('')
      setShowIncorrect(false)
      setShowCorrect(false)
      setIsDisabled(false)
      if (inputRef.current && isActive) {
        inputRef.current.focus()
      }
    }
  }, [currentProblem, isActive])

  // Listen for correct answers by watching correctAnswers change
  const prevCorrectAnswersRef = useRef(correctAnswers)
  const waitingForFeedbackRef = useRef(false)
  
  useEffect(() => {
    // If correctAnswers increased and we were waiting for feedback, show correct feedback
    if (correctAnswers > prevCorrectAnswersRef.current && waitingForFeedbackRef.current) {
      setShowCorrect(true)
      setInput('') // Clear input
      setIsDisabled(true)
      waitingForFeedbackRef.current = false
      setTimeout(() => {
        setShowCorrect(false)
        setIsDisabled(false)
        if (inputRef.current) {
          inputRef.current.focus()
        }
      }, 1000)
    } else if (correctAnswers === prevCorrectAnswersRef.current && waitingForFeedbackRef.current) {
      // If correctAnswers didn't increase but we were waiting, it was incorrect (handled by ref)
      waitingForFeedbackRef.current = false
    }
    prevCorrectAnswersRef.current = correctAnswers
  }, [correctAnswers])

  // Show countdown if we have one
  if (countdown !== null && countdown !== undefined && countdown >= 0) {
    return (
      <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
        <Box>
          <Typography variant="h2" color="primary" sx={{ fontWeight: 'bold', mb: 2 }}>
            {countdown === 0 ? 'GO!' : countdown}
          </Typography>
          <Typography variant="h6" color="text.secondary">
            {countdown === 0 ? 'Get ready for math problems!' : 'Get ready!'}
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

  if (!currentProblem) {
    return (
      <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          Waiting for next problem...
        </Typography>
      </Paper>
    )
  }

  const handleSubmit = () => {
    if (isDisabled || !input.trim() || !currentProblem) return

    const answer = parseFloat(input.trim())
    if (isNaN(answer)) {
      return
    }

    // Disable input while waiting for feedback
    setIsDisabled(true)
    waitingForFeedbackRef.current = true
    onAnswerSubmit(currentProblem.problemIndex, answer)
  }


  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isDisabled) {
      handleSubmit()
    }
  }

  return (
    <Box>
      <Paper elevation={3} sx={{ p: 3, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CalculateIcon sx={{ mr: 1, fontSize: 30 }} />
            <Typography variant="h5">
              Quick Maths
            </Typography>
          </Box>
          {timeLeft !== null && timeLeft !== undefined && (
            <Typography variant="h5" color={timeLeft <= 10 ? 'error.main' : 'primary.main'} sx={{ fontWeight: 'bold' }}>
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </Typography>
          )}
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Answer as many math problems correctly as you can! Most correct answers wins.
        </Typography>

        <Box sx={{ mb: 3, textAlign: 'center' }}>
          <Typography variant="h6" color="primary" gutterBottom>
            Problem {currentProblem.problemIndex + 1} of {totalProblems}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 'bold', my: 3, fontFamily: 'monospace' }}>
            {currentProblem.question}
          </Typography>
        </Box>

        {showIncorrect && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Incorrect! Try again in 1 second.
          </Alert>
        )}
        {showCorrect && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Correct! Great job!
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
          <TextField
            inputRef={inputRef}
            fullWidth
            type="number"
            value={input}
            onChange={(e) => {
              if (!isDisabled) {
                setInput(e.target.value)
              }
            }}
            onKeyPress={handleKeyPress}
            placeholder="Enter your answer"
            disabled={isDisabled}
            autoFocus
            sx={{
              '& .MuiInputBase-input': {
                fontSize: '1.5rem',
                textAlign: 'center'
              }
            }}
          />
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={isDisabled || !input.trim()}
            size="large"
            sx={{ minWidth: 120 }}
          >
            Submit
          </Button>
        </Box>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="h6" color="success.main">
            Correct Answers: {correctAnswers}
          </Typography>
        </Box>
      </Paper>
    </Box>
  )
}

export default QuickMathsGame

