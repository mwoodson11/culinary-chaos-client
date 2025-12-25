import { Box, Typography, Button, TextField, Paper, Alert } from '@mui/material'
import { useState, useRef } from 'react'

interface NumberGuessGameProps {
  onComplete: (points: number) => void
  onQuit?: () => void
}

// Reward points based on attempt number
const getRewardPoints = (attempt: number): number => {
  const rewards = [1000, 750, 500, 250, 125, 65, 30, 15, 10, 5]
  if (attempt <= rewards.length) {
    return rewards[attempt - 1]
  }
  return 5 // After 10 attempts, stay at 5
}

function NumberGuessGame({ onComplete }: NumberGuessGameProps) {
  const [targetNumber] = useState(() => Math.floor(Math.random() * 100) + 1)
  const [guess, setGuess] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [feedback, setFeedback] = useState<string>('')
  const [isComplete, setIsComplete] = useState(false)
  const [finalReward, setFinalReward] = useState(0)
  const hasCompletedRef = useRef(false)

  const currentReward = getRewardPoints(attempts + 1)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isComplete || hasCompletedRef.current) return

    const guessNum = parseInt(guess)
    
    if (isNaN(guessNum) || guessNum < 1 || guessNum > 100) {
      setFeedback('Please enter a number between 1 and 100')
      return
    }

    const newAttempts = attempts + 1
    setAttempts(newAttempts)

    if (guessNum === targetNumber) {
      // Correct guess!
      const reward = getRewardPoints(newAttempts)
      setFinalReward(reward)
      setIsComplete(true)
      hasCompletedRef.current = true
      setFeedback('')
      
      // Call onComplete after a short delay to show the congratulations message
      setTimeout(() => {
        onComplete(reward)
      }, 2000)
    } else if (guessNum < targetNumber) {
      setFeedback('Higher!')
    } else {
      setFeedback('Lower!')
    }

    setGuess('')
  }

  return (
    <Box sx={{ mt: 3, p: 4, bgcolor: 'background.paper', borderRadius: 2, boxShadow: 3, textAlign: 'center' }}>
      <Typography variant="h5" gutterBottom>
        Number Guess Challenge!
      </Typography>
      
      {isComplete ? (
        <Box>
          <Alert severity="success" sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              🎉 Congratulations! 🎉
            </Typography>
            <Typography variant="body1">
              You guessed the number correctly!
            </Typography>
            <Typography variant="h5" color="primary" sx={{ mt: 2, fontWeight: 'bold' }}>
              You earned {finalReward} points!
            </Typography>
          </Alert>
        </Box>
      ) : (
        <>
          <Paper elevation={2} sx={{ p: 3, mb: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              Current Reward: {currentReward} points
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              {attempts > 0 && `Attempt ${attempts} - Reward decreases with each wrong guess!`}
            </Typography>
          </Paper>

          <Typography variant="body1" sx={{ mb: 2 }}>
            I'm thinking of a number between 1 and 100. Can you guess it?
          </Typography>

          {attempts > 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body1" fontWeight="bold">
                {feedback}
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                Attempts: {attempts}
              </Typography>
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
            <TextField
              type="number"
              label="Your Guess (1-100)"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              inputProps={{ min: 1, max: 100 }}
              variant="outlined"
              fullWidth
              sx={{ mb: 2, maxWidth: 300, mx: 'auto' }}
              autoFocus
              disabled={isComplete}
            />
            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              disabled={isComplete || !guess}
              sx={{ minWidth: 200 }}
            >
              Submit Guess
            </Button>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
            The reward decreases with each incorrect guess. Guess correctly to earn points!
          </Typography>
        </>
      )}
    </Box>
  )
}

export default NumberGuessGame

