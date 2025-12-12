import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box } from '@mui/material'
import { useEffect } from 'react'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import { clientEvents, serverEvents } from '@/types/events'
import { useGameSessionStore } from '@/stores/gameSessionStore'

interface HostTimeDecisionDialogProps {
  open: boolean
  onClose: () => void
}

function HostTimeDecisionDialog({ open, onClose }: HostTimeDecisionDialogProps) {
  const { socket, gameid } = useGameSessionStore()

  // Listen for time added or game ended to close dialog
  useEffect(() => {
    const handleTimeAdded = () => {
      onClose()
    }

    const handleGameEnded = () => {
      onClose()
    }

    socket.on(serverEvents.timeAdded, handleTimeAdded)
    socket.on(serverEvents.gameEnded, handleGameEnded)

    return () => {
      socket.off(serverEvents.timeAdded, handleTimeAdded)
      socket.off(serverEvents.gameEnded, handleGameEnded)
    }
  }, [socket, onClose])

  const handleAddTime = () => {
    if (gameid) {
      socket.emit(clientEvents.addTime, { gameid, minutes: 5 })
    }
  }

  const handleEndGame = () => {
    if (gameid) {
      socket.emit(clientEvents.endGame, { gameid })
    }
  }

  return (
    <Dialog 
      open={open} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          p: 2
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <AccessTimeIcon sx={{ fontSize: 40, color: 'warning.main' }} />
          <Typography variant="h5" fontWeight="bold">
            Time's Up!
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1" sx={{ mb: 2 }}>
          The game timer has expired. Would you like to add 5 more minutes or end the game?
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 2 }}>
        <Button
          variant="contained"
          color="success"
          onClick={handleAddTime}
          size="large"
          sx={{ flex: 1 }}
        >
          Add 5 Minutes
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={handleEndGame}
          size="large"
          sx={{ flex: 1 }}
        >
          End Game
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default HostTimeDecisionDialog

