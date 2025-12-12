import { Box, Typography } from '@mui/material'
import { useEffect, useState } from 'react'

interface GameCountdownProps {
  onComplete: () => void
}

function GameCountdown({ onComplete }: GameCountdownProps) {
  const [count, setCount] = useState(5)
  const [showBegin, setShowBegin] = useState(false)

  useEffect(() => {
    if (count > 0) {
      const timer = setTimeout(() => {
        setCount(count - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (count === 0) {
      setShowBegin(true)
      const beginTimer = setTimeout(() => {
        onComplete()
      }, 1000) // Show "Begin!" for 1 second
      return () => clearTimeout(beginTimer)
    }
  }, [count, onComplete])

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'background.default',
      }}
    >
      <Typography
        variant="h1"
        sx={{
          fontSize: { xs: '4rem', sm: '6rem', md: '8rem' },
          fontWeight: 'bold',
          color: 'primary.main',
          animation: showBegin ? 'pulse 0.5s ease-in-out' : 'none',
          '@keyframes pulse': {
            '0%, 100%': {
              transform: 'scale(1)',
            },
            '50%': {
              transform: 'scale(1.2)',
            },
          },
        }}
      >
        {showBegin ? 'Begin!' : count}
      </Typography>
    </Box>
  )
}

export default GameCountdown

