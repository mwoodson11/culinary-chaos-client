import { useState, useEffect } from 'react'
import { Paper, Typography, Box, Chip, IconButton, Slide } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import BuildIcon from '@mui/icons-material/Build'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import CloseIcon from '@mui/icons-material/Close'
import VisibilityIcon from '@mui/icons-material/Visibility'

interface PlayerInfo {
  username: string
  points: number
  tools: any[]
  activeBuffs: any[]
  activeDebuffs: any[]
}

interface ViewingEyeToastProps {
  targetPlayer: string
  playerInfo: PlayerInfo
  duration: number
  onClose: () => void
}

function ViewingEyeToast({ targetPlayer, playerInfo, duration, onClose }: ViewingEyeToastProps) {
  const theme = useTheme()
  const [timeLeft, setTimeLeft] = useState(duration)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    if (timeLeft <= 0) {
      setIsVisible(false)
      setTimeout(() => {
        onClose()
      }, 300) // Wait for slide animation
      return
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setIsVisible(false)
          setTimeout(() => {
            onClose()
          }, 300)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft, onClose])

  if (!isVisible) {
    return null
  }

  return (
    <Slide direction="left" in={isVisible} mountOnEnter unmountOnExit>
      <Paper
        elevation={8}
        sx={{
          position: 'fixed',
          top: 20,
          right: 20,
          zIndex: 9999,
          minWidth: 350,
          maxWidth: 450,
          p: 3,
          backgroundColor: theme.palette.background.paper,
          border: `2px solid ${theme.palette.primary.main}`,
          borderRadius: 2
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <VisibilityIcon color="primary" />
            <Typography variant="h6" fontWeight="bold">
              Viewing: {playerInfo.username}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {timeLeft}s
            </Typography>
            <IconButton size="small" onClick={() => {
              setIsVisible(false)
              setTimeout(() => onClose(), 300)
            }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body1" color="primary" fontWeight="bold">
            Points: {playerInfo.points}
          </Typography>
        </Box>

        {/* Tools */}
        {playerInfo.tools.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              Tools:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {playerInfo.tools.map((tool) => (
                <Chip
                  key={tool.id}
                  icon={<BuildIcon />}
                  label={tool.name}
                  size="small"
                  color="default"
                  variant="outlined"
                />
              ))}
            </Box>
          </Box>
        )}

        {/* Active Buffs */}
        {playerInfo.activeBuffs.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              Active Buffs:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {playerInfo.activeBuffs.map((buff) => (
                <Chip
                  key={buff.id}
                  icon={<TrendingUpIcon />}
                  label={buff.name}
                  size="small"
                  color="success"
                  variant="filled"
                />
              ))}
            </Box>
          </Box>
        )}

        {/* Active Debuffs */}
        {playerInfo.activeDebuffs.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              Active Debuffs:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {playerInfo.activeDebuffs.map((debuff) => (
                <Chip
                  key={debuff.id}
                  icon={<TrendingDownIcon />}
                  label={debuff.name}
                  size="small"
                  color="error"
                  variant="filled"
                />
              ))}
            </Box>
          </Box>
        )}

        {playerInfo.tools.length === 0 && playerInfo.activeBuffs.length === 0 && playerInfo.activeDebuffs.length === 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            No tools or active effects
          </Typography>
        )}
      </Paper>
    </Slide>
  )
}

export default ViewingEyeToast

