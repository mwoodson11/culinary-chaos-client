import { Container, Paper, TextField, Button, Typography, Box, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material'
import { useState } from 'react'
import { useGameSessionStore } from '@/stores/gameSessionStore'
import type * as IClient from '@/types/IClient'
import { useEffect } from 'react'
import { serverEvents } from '@/types/events'
import { useNavigate, Link } from 'react-router-dom'

const gameTypes = ['Baking Game', 'Mixing Game']

function CreateGameComponent() {
  const [selectedGameType, setSelectedGameType] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { createGame, socket } = useGameSessionStore()
  const navigate = useNavigate()

  useEffect(() => {
    const handleGameCreated = () => {
      navigate('/lobby')
    }

    const handleError = () => {
      navigate('/')
    }

    socket.on(serverEvents.roomUpdate, handleGameCreated)
    socket.on(serverEvents.error, handleError)

    return () => {
      socket.off(serverEvents.roomUpdate, handleGameCreated)
      socket.off(serverEvents.error, handleError)
    }
  }, [navigate, socket])

  const handleGameSelect = (gameType: string) => {
    setSelectedGameType(gameType)
    setIsDialogOpen(true)
  }

  const handleDialogClose = () => {
    setIsDialogOpen(false)
    setSelectedGameType(null)
  }

  const handleConfirm = () => {
    if (!selectedGameType) return

    const request: IClient.ICreateGame = {
      gameType: selectedGameType
    }
    createGame(request)
    setIsDialogOpen(false)
  }

  return (
    <Container sx={{ display: 'flex', justifyContent: 'center', height: '100%' }}>
      <Paper
        elevation={10}
        sx={{
          padding: '20px',
          margin: '20px',
          borderRadius: '10px',
          width: '100%',
          maxWidth: 400,
        }}
      >
        <Typography variant="h4" align="center" gutterBottom>
          Choose a Game
        </Typography>
        <Typography variant="h6" align="center" gutterBottom>
          Please make sure this device will serve as the host
        </Typography>
        <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {gameTypes.map((gameType) => (
            <Button
              key={gameType}
              variant="contained"
              color="primary"
              onClick={() => handleGameSelect(gameType)}
              sx={{ height: '150px' }}
            >
              {gameType}
            </Button>
          ))}
          <Button
            component={Link}
            to="/"
            variant="contained"
            color="secondary"
          >
            Back
          </Button>
        </Box>
      </Paper>

      <Dialog
        open={isDialogOpen}
        onClose={handleDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Game Disclaimer</DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            By proceeding with {selectedGameType}, you acknowledge that:
          </Typography>
          <Typography variant="body2" component="div" sx={{ pl: 2 }}>
            <ul>
              <li>You will be the host of this game session</li>
              <li>Your device will be used to display game content</li>
              <li>Other players will need to connect using the game code</li>
              <li>You are responsible for managing the game session</li>
            </ul>
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} color="secondary">
            Cancel
          </Button>
          <Button onClick={handleConfirm} color="primary" variant="contained">
            I Understand, Start Game
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}

export default CreateGameComponent