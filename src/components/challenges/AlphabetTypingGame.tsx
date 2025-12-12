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
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isActive && !startTime && inputRef.current) {
      // Focus input when game becomes active
      inputRef.current.focus()
      setStartTime(Date.now())
    }
  }, [isActive, startTime])

  useEffect(() => {
    if (input.toLowerCase() === ALPHABET && startTime && !isComplete) {
      const endTime = Date.now()
      const timeInSeconds = (endTime - startTime) / 1000
      setIsComplete(true)
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
    if (!startTime) return 0
    return ((Date.now() - startTime) / 1000).toFixed(2)
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
              <Typography
                variant="h4"
                sx={{
                  fontFamily: 'monospace',
                  letterSpacing: 2,
                  color: 'text.primary',
                  mb: 2
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

