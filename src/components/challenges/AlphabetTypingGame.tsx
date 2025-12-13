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

  useEffect(() => {
    if (input.toLowerCase() === ALPHABET && startTime && !isComplete) {
      const endTime = Date.now()
      const timeInSeconds = (endTime - startTime) / 1000
      setIsComplete(true)
      setElapsedTime(timeInSeconds) // Set final time
      onComplete(timeInSeconds)
    }
  }, [input, startTime, isComplete, onComplete])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isActive || isComplete) return
    
    const value = e.target.value.toLowerCase()
    // Only allow typing if it matches the alphabet sequence
    if (value.length <= ALPHABET.length) {
      const expectedChar = ALPHABET[value.length - 1]
      if (value[value.length - 1] === expectedChar || value.length === 0) {
        setInput(value)
      }
    }
  }

  const getTimeElapsed = () => {
    if (!startTime) return '0.00'
    return elapsedTime.toFixed(2)
  }

  const getProgress = () => {
    return (input.length / ALPHABET.length) * 100
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
          Type the alphabet (a-z) as fast as you can! The fastest time wins.
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
                Progress: {input.length} / {ALPHABET.length} letters
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

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Type this:
              </Typography>
              <Box
                sx={{
                  width: '100%',
                  mb: 2,
                  // Make it scrollable horizontally on mobile if needed, but try to fit on screen
                  overflowX: { xs: 'auto', sm: 'visible' },
                  overflowY: 'hidden',
                  // Ensure it's always visible with proper height
                  py: 1,
                  // Smooth scrolling
                  scrollBehavior: 'smooth',
                  // Custom scrollbar styling
                  '&::-webkit-scrollbar': {
                    height: 6,
                  },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: 'primary.main',
                    borderRadius: 2,
                  },
                }}
              >
                <Typography
                  sx={{
                    fontFamily: 'monospace',
                    // Responsive letter spacing - smaller on mobile
                    letterSpacing: { xs: 0.5, sm: 1, md: 2 },
                    color: 'text.primary',
                    // Responsive font size - much smaller on mobile to fit on screen
                    fontSize: { xs: '0.9rem', sm: '1.2rem', md: '2rem' },
                    // Allow wrapping on very small screens, but prefer single line
                    whiteSpace: { xs: 'normal', sm: 'nowrap' },
                    // Word break to prevent overflow
                    wordBreak: { xs: 'break-all', sm: 'normal' },
                    // Line height for better readability when wrapped
                    lineHeight: { xs: 1.8, sm: 1.5, md: 1.2 },
                    // Ensure it doesn't overflow
                    maxWidth: '100%',
                  }}
                >
                  {ALPHABET.split('').map((char, index) => (
                    <span
                      key={index}
                      style={{
                        color: index < input.length ? 'green' : index === input.length ? 'blue' : 'gray',
                        textDecoration: index < input.length ? 'underline' : 'none'
                      }}
                    >
                      {char}
                    </span>
                  ))}
                </Typography>
              </Box>
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

