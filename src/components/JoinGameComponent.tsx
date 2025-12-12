import { Container, Paper, TextField, Button, Typography, Box, Divider, Card, CardContent, CardActions, Grid, Chip } from '@mui/material'
import { useState, useEffect } from 'react'
import { useGameSessionStore } from '@/stores/gameSessionStore'
import type * as IClient from '@/types/IClient'
import { serverEvents, clientEvents } from '@/types/events'
import { Link, useNavigate } from 'react-router-dom'
import ReplayIcon from '@mui/icons-material/Replay'
import PersonIcon from '@mui/icons-material/Person'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'

interface DisconnectedPlayer {
  username: string
  points: number
  role: 'host' | 'player'
}

function JoinGameComponent() {
  const [gameid, setGameid] = useState('1000')
  const [name, setName] = useState('')
  const [gameidError, setGameidError] = useState('')
  const [disconnectedPlayers, setDisconnectedPlayers] = useState<DisconnectedPlayer[]>([])
  const [showDisconnectedPlayers, setShowDisconnectedPlayers] = useState(false)
  const { joinGame, rejoinGame, socket } = useGameSessionStore()
  const navigate = useNavigate()

  useEffect(() => {
    const handleGameJoined = () => {
      navigate('/lobby')
    }

    const handleRejoinSuccess = (data: { recipe?: any; gameStarted?: boolean }) => {
      // If game has started (recipe exists or gameStarted flag is true), go directly to game play
      // Otherwise, go to lobby
      console.log('Rejoin success:', data)
      // Use setTimeout to ensure state is updated before navigation
      setTimeout(() => {
        if (data?.recipe || data?.gameStarted) {
          console.log('Game started, navigating to game play')
          // Use replace: true to prevent back navigation and ensure we stay on game play
          navigate('/game/play', { replace: true })
        } else {
          console.log('Game not started, navigating to lobby')
          navigate('/lobby', { replace: true })
        }
      }, 100)
    }

    const handleGameStart = () => {
      // If game starts while on join page (shouldn't happen, but handle it)
      const currentIsHost = useGameSessionStore.getState().isHost()
      if (currentIsHost) {
        navigate('/game/play')
      } else {
        navigate('/game/countdown', { replace: true })
      }
    }

    const handleDisconnectedPlayersList = (data: { gameid: string; players: DisconnectedPlayer[]; gameStarted?: boolean }) => {
      // Only show disconnected players if the game has started
      if (data.gameStarted && data.players.length > 0) {
        // Game has started and there are disconnected players - show them
        setDisconnectedPlayers(data.players)
        setShowDisconnectedPlayers(true)
      } else {
        // Game hasn't started OR no disconnected players - go directly to join form
        setDisconnectedPlayers([])
        setShowDisconnectedPlayers(true) // Set to true to show join form, but with empty list
      }
    }

    const handleError = (message: string) => {
      alert(message)
    }

    socket.on(serverEvents.roomUpdate, handleGameJoined)
    socket.on(serverEvents.rejoinSuccess, handleRejoinSuccess)
    socket.on(serverEvents.gameStart, handleGameStart)
    socket.on(serverEvents.disconnectedPlayersList, handleDisconnectedPlayersList)
    socket.on(serverEvents.error, handleError)

    return () => {
      socket.off(serverEvents.roomUpdate, handleGameJoined)
      socket.off(serverEvents.rejoinSuccess, handleRejoinSuccess)
      socket.off(serverEvents.gameStart, handleGameStart)
      socket.off(serverEvents.disconnectedPlayersList, handleDisconnectedPlayersList)
      socket.off(serverEvents.error, handleError)
    }
  }, [navigate, socket])

  const validateGameId = (value: string) => {
    if (!value) {
      setGameidError('You must enter a game ID')
      return false
    }
    if (value.length !== 4) {
      setGameidError('Game ID must be 4 characters')
      return false
    }
    setGameidError('')
    return true
  }

  const handleGameIdSubmit = () => {
    if (!validateGameId(gameid)) return
    // Fetch disconnected players for this game (only returns players if game has started)
    socket.emit(clientEvents.getDisconnectedPlayers, gameid)
  }

  const handleResumeAsPlayer = (player: DisconnectedPlayer) => {
    const request: IClient.IRejoinGame = {
      username: player.username,
      gameid: gameid
    }
    rejoinGame(request)
  }

  const handleJoinAsNew = () => {
    const request: IClient.IJoinGame = {
      username: name || generateRandomName(),
      gameid: gameid
    }
    joinGame(request)
  }

  const generateRandomName = () => {
    const adjectives = ['Happy', 'Clever', 'Brave', 'Swift', 'Bright', 'Witty', 'Jolly', 'Nimble', 'Bold', 'Calm']
    const nouns = ['Baker', 'Chef', 'Cook', 'Pastry', 'Cake', 'Cookie', 'Muffin', 'Pie', 'Bread', 'Dough']
    const randomNum = Math.floor(Math.random() * 1000)
    const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)]
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)]
    return `${randomAdj}${randomNoun}${randomNum}`
  }

  return (
    <Container sx={{ display: 'flex', justifyContent: 'center', height: '100%', py: 4 }}>
      <Paper
        elevation={10}
        sx={{
          padding: '20px',
          margin: '20px',
          borderRadius: '10px',
          width: '100%',
          maxWidth: 600,
        }}
      >
        <Typography variant="h4" align="center" gutterBottom>
          Join Game
        </Typography>

        {!showDisconnectedPlayers ? (
          // Step 1: Enter Game ID
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Game ID"
              value={gameid}
              onChange={(e) => {
                setGameid(e.target.value.toUpperCase())
                setGameidError('')
              }}
              required
              fullWidth
              error={!!gameidError}
              helperText={gameidError || "Enter the 4-character game ID"}
              inputProps={{ maxLength: 4, style: { textTransform: 'uppercase' } }}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={handleGameIdSubmit}
              disabled={!gameid || gameid.length !== 4}
            >
              Continue
            </Button>
            <Button
              component={Link}
              to="/"
              variant="outlined"
              color="secondary"
            >
              Back
            </Button>
          </Box>
        ) : (
          // Step 2: Show disconnected players or join as new
          <Box>
            {disconnectedPlayers.length > 0 && (
              <>
                <Typography variant="h6" gutterBottom>
                  Disconnected Players
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Select a disconnected player to resume their session, or join as a new player.
                </Typography>
              </>
            )}

            {disconnectedPlayers.length > 0 ? (
              <>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  {disconnectedPlayers.map((player) => (
                    <Grid item xs={12} sm={6} key={player.username}>
                      <Card>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <PersonIcon />
                              <Typography variant="h6">{player.username}</Typography>
                            </Box>
                            <Chip 
                              label={player.role.toUpperCase()} 
                              color={player.role === 'host' ? 'primary' : 'default'}
                              size="small"
                            />
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <EmojiEventsIcon fontSize="small" color="primary" />
                            <Typography variant="body2">{player.points} points</Typography>
                          </Box>
                        </CardContent>
                        <CardActions>
                          <Button
                            fullWidth
                            variant="contained"
                            color="success"
                            startIcon={<ReplayIcon />}
                            onClick={() => handleResumeAsPlayer(player)}
                          >
                            Resume as {player.username}
                          </Button>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
                <Divider sx={{ my: 2 }}>OR</Divider>
              </>
            ) : null}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Name (Optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                fullWidth
                helperText="Leave blank for a random name"
                inputProps={{ maxLength: 10 }}
              />
              <Button
                variant="contained"
                color="primary"
                onClick={handleJoinAsNew}
              >
                Join as New Player
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  setShowDisconnectedPlayers(false)
                  setDisconnectedPlayers([])
                }}
              >
                Back
              </Button>
            </Box>
          </Box>
        )}
      </Paper>
    </Container>
  )
}

export default JoinGameComponent 