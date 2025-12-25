import { Box, Typography, TextField, Paper } from '@mui/material'
import { useState, useEffect, useRef } from 'react'
import KeyboardIcon from '@mui/icons-material/Keyboard'

interface AlphabetTypingGameProps {
  onComplete: (timeInSeconds: number) => void
  isActive: boolean
  countdown?: number | null
}

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'

function AlphabetTypingGame({ onComplete, isActive, countdown }: AlphabetTypingGameProps) {
  const [currentLetterIndex, setCurrentLetterIndex] = useState(0)
  const [input, setInput] = useState('')
  const [startTime, setStartTime] = useState<number | null>(null)
  const [isComplete, setIsComplete] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isActive && !startTime && inputRef.current) {
      // Focus input when game becomes active
      inputRef.current.focus()
      const now = Date.now()
      setStartTime(now)
      setElapsedTime(0)
      setCurrentLetterIndex(0)
      setInput('')
      setIsComplete(false)
    }
  }, [isActive, startTime])

  // Continuous timer update
  useEffect(() => {
    if (!isActive || !startTime || isComplete) return

    const interval = setInterval(() => {
      const elapsed = ((Date.now() - startTime) / 1000)
      setElapsedTime(elapsed)
    }, 100) // Update every 100ms for smooth display

    return () => clearInterval(interval)
  }, [isActive, startTime, isComplete])

  // Check if all letters are complete
  useEffect(() => {
    if (currentLetterIndex >= ALPHABET.length && startTime && !isComplete) {
      const endTime = Date.now()
      const timeInSeconds = (endTime - startTime) / 1000
      setIsComplete(true)
      setElapsedTime(timeInSeconds) // Set final time
      onComplete(timeInSeconds)
    }
  }, [currentLetterIndex, startTime, isComplete, onComplete])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isActive || isComplete) return
    
    const value = e.target.value.toLowerCase()
    
    // If input is empty, just update state
    if (value.length === 0) {
      setInput('')
      return
    }
    
    // Get the current expected letter
    const expectedLetter = ALPHABET[currentLetterIndex]
    
    // Get the last character typed
    const lastChar = value[value.length - 1]
    
    // Check if the typed character matches the expected letter
    if (lastChar === expectedLetter) {
      // Correct letter typed - move to next letter
      if (currentLetterIndex < ALPHABET.length - 1) {
        setCurrentLetterIndex(prev => prev + 1)
      } else {
        // Last letter (Z) - complete the game
        setCurrentLetterIndex(ALPHABET.length)
      }
      // Always clear input after correct letter
      setInput('')
    } else {
      // Wrong letter - clear input immediately
      setInput('')
    }
  }

  const getTimeElapsed = () => {
    if (!startTime) return '0.00'
    return elapsedTime.toFixed(2)
  }

  const getProgress = () => {
    return (currentLetterIndex / ALPHABET.length) * 100
  }

  const getCurrentLetter = () => {
    if (currentLetterIndex >= ALPHABET.length) return ''
    return ALPHABET[currentLetterIndex].toUpperCase()
  }

  // Show countdown if we have one, even if not active yet
  if (countdown !== null && countdown !== undefined && countdown >= 0) {
    return (
      <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
        <Box>
          <Typography variant="h2" color="primary" sx={{ fontWeight: 'bold', mb: 2 }}>
            {countdown === 0 ? 'GO!' : countdown}
          </Typography>
          <Typography variant="h6" color="text.secondary">
            {countdown === 0 ? 'Start typing!' : 'Get ready!'}
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

  return (
    <Box>
      <Paper elevation={3} sx={{ p: 3, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <KeyboardIcon sx={{ mr: 1, fontSize: 30 }} />
          <Typography variant="h5">
            Type the Alphabet
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Type each letter one at a time as it appears. The fastest time wins!
        </Typography>

        {isComplete ? (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography variant="h4" color="success.main" gutterBottom>
              ✓ Complete!
            </Typography>
            <Typography variant="h6">
              Your time: {getTimeElapsed()} seconds
            </Typography>
          </Box>
        ) : (
          <>
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Progress: {currentLetterIndex} / {ALPHABET.length} letters
              </Typography>
              <Box
                sx={{
                  width: '100%',
                  height: 8,
                  bgcolor: 'grey.300',
                  borderRadius: 1,
                  overflow: 'hidden'
                }}
              >
                <Box
                  sx={{
                    width: `${getProgress()}%`,
                    height: '100%',
                    bgcolor: 'primary.main',
                    transition: 'width 0.3s ease'
                  }}
                />
              </Box>
            </Box>

            <Box sx={{ mb: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Type this letter:
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'monospace',
                  fontSize: { xs: '4rem', sm: '6rem', md: '8rem' },
                  fontWeight: 'bold',
                  color: 'primary.main',
                  letterSpacing: 0,
                  lineHeight: 1,
                  my: 2
                }}
              >
                {getCurrentLetter()}
              </Typography>
            </Box>

            <TextField
              inputRef={inputRef}
              fullWidth
              value={input}
              onChange={handleInputChange}
              placeholder="Start typing..."
              disabled={isComplete}
              autoFocus
              sx={{
                '& .MuiInputBase-input': {
                  fontFamily: 'monospace',
                  fontSize: '1.5rem',
                  letterSpacing: 2
                }
              }}
            />

            {startTime && (
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Typography variant="h6" color="primary">
                  Time: {getTimeElapsed()}s
                </Typography>
              </Box>
            )}
          </>
        )}
      </Paper>
    </Box>
  )
}

export default AlphabetTypingGame

