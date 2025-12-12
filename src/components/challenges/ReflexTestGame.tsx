import { Box, Typography, Paper, Button, Alert } from '@mui/material'
import { useState, useEffect } from 'react'
import SpeedIcon from '@mui/icons-material/Speed'

interface ReflexTestGameProps {
  onPress: () => void
  isActive: boolean
  countdown?: number | null
  prompt: 'wait' | 'press'
  isDisqualified: boolean
  reactionTime?: number | null // Reaction time in milliseconds
}

function ReflexTestGame({
  onPress,
  isActive,
  countdown,
  prompt,
  isDisqualified,
  reactionTime
}: ReflexTestGameProps) {
  const [hasPressed, setHasPressed] = useState(false)

  // Reset when prompt changes or game restarts
  useEffect(() => {
    if (prompt === 'wait') {
      setHasPressed(false)
    }
  }, [prompt])

  // Show countdown if we have one
  if (countdown !== null && countdown !== undefined && countdown >= 0) {
    return (
      <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
        <Box>
          <Typography variant="h2" color="primary" sx={{ fontWeight: 'bold', mb: 2 }}>
            {countdown === 0 ? 'GO!' : countdown}
          </Typography>
          <Typography variant="h6" color="text.secondary">
            {countdown === 0 ? 'Get ready to test your reflexes!' : 'Get ready!'}
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

  const handlePress = () => {
    if (hasPressed || isDisqualified) return
    setHasPressed(true)
    onPress()
  }

  return (
    <Box>
      <Paper elevation={3} sx={{ p: 3, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <SpeedIcon sx={{ mr: 1, fontSize: 30 }} />
          <Typography variant="h5">
            Reflex Test
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Wait for the "PRESS!" prompt, then click as fast as you can! Clicking too early will disqualify you.
        </Typography>

        {isDisqualified ? (
          <Alert severity="error" sx={{ mb: 3 }}>
            <Typography variant="h6">
              Disqualified!
            </Typography>
            <Typography variant="body2">
              You clicked too early. Please wait for the "PRESS!" prompt.
            </Typography>
          </Alert>
        ) : hasPressed && reactionTime !== null && reactionTime !== undefined ? (
          <Alert severity="success" sx={{ mb: 3 }}>
            <Typography variant="h6">
              ✓ Clicked!
            </Typography>
            <Typography variant="body2">
              Your reaction time: {(reactionTime / 1000).toFixed(3)} seconds
            </Typography>
          </Alert>
        ) : null}

        <Box sx={{ textAlign: 'center', my: 4 }}>
          <Typography 
            variant={prompt === 'press' ? 'h2' : 'h3'}
            color={prompt === 'press' ? 'error.main' : 'text.secondary'}
            sx={{ 
              fontWeight: 'bold',
              mb: 4,
              transition: 'all 0.3s ease'
            }}
          >
            {prompt === 'press' ? 'PRESS!' : 'Wait...'}
          </Typography>

          <Button
            variant="contained"
            color={prompt === 'press' ? 'error' : 'primary'}
            size="large"
            onClick={handlePress}
            disabled={hasPressed || isDisqualified}
            sx={{
              minWidth: 200,
              minHeight: 100,
              fontSize: '1.5rem',
              fontWeight: 'bold',
              '&:hover': {
                transform: prompt === 'press' ? 'scale(1.05)' : 'scale(1.02)',
              },
              transition: 'transform 0.1s',
            }}
          >
            {hasPressed ? 'Clicked!' : 'Click Me!'}
          </Button>
        </Box>
      </Paper>
    </Box>
  )
}

export default ReflexTestGame

