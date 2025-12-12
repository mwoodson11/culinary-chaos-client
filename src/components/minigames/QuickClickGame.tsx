import { Box, Typography, Button } from '@mui/material'
import { useState, useRef, useEffect } from 'react'

interface QuickClickGameProps {
  onComplete: (clicks: number) => void
  timeLeft: number
}

function QuickClickGame({ onComplete, timeLeft }: QuickClickGameProps) {
  const [clickCount, setClickCount] = useState(0)
  const clickCountRef = useRef(0)
  const hasCompletedRef = useRef(false)

  // Reset click count and completion flag when component mounts
  useEffect(() => {
    clickCountRef.current = 0
    setClickCount(0)
    hasCompletedRef.current = false
  }, [])

  // Auto-complete when time runs out (only once)
  useEffect(() => {
    if (timeLeft <= 0 && !hasCompletedRef.current) {
      hasCompletedRef.current = true
      onComplete(clickCountRef.current)
    }
  }, [timeLeft, onComplete])

  const handleClick = () => {
    if (timeLeft > 0) {
      clickCountRef.current += 1
      setClickCount(clickCountRef.current)
    }
  }

  return (
    <Box sx={{ mt: 3, p: 4, bgcolor: 'background.paper', borderRadius: 2, boxShadow: 3, textAlign: 'center' }}>
      <Typography variant="h5" gutterBottom>
        Quick Click Challenge!
      </Typography>
      <Typography variant="h6" color="error" sx={{ mb: 3 }}>
        Time: {timeLeft}s
      </Typography>
      <Typography variant="h4" color="primary" sx={{ mb: 3 }}>
        Clicks: {clickCount}
      </Typography>
      <Button
        variant="contained"
        color="primary"
        size="large"
        onClick={handleClick}
        disabled={timeLeft === 0}
        sx={{
          minWidth: 200,
          minHeight: 100,
          fontSize: '1.5rem',
          fontWeight: 'bold',
          '&:hover': {
            transform: 'scale(1.05)',
          },
          transition: 'transform 0.1s',
        }}
      >
        CLICK ME!
      </Button>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        Click as fast as you can! Points = clicks rounded up to nearest 5.
      </Typography>
    </Box>
  )
}

export default QuickClickGame

