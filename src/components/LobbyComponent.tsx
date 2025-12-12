import { Container, Card, CardContent, CardHeader, CardActions, Button, Typography, Divider, List, ListItem, Box } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useGameSessionStore } from '@/stores/gameSessionStore'
import { useEffect } from 'react'
import { serverEvents, clientEvents } from '@/types/events'
import { useBeforeUnload } from '@/hooks/useBeforeUnload'

function LobbyComponent() {
  const navigate = useNavigate()
  const { gameid, gameType, players, leaveGame, socket, isHost, username } = useGameSessionStore()

  // Redirect to home if socket is connected but not connected to a game
  useEffect(() => {
    if (socket.connected && !gameid) {
      navigate('/', { replace: true })
    }
  }, [socket.connected, gameid, navigate])

  // Warn user before leaving/refreshing during lobby
  useBeforeUnload(
    gameid && socket.connected,
    'Are you sure you want to leave? You will be disconnected from the game lobby.'
  )

  useEffect(() => {
    const handleGameStart = () => {
      // If we already have a recipe (rejoining), go directly to game play
      // Otherwise, go to intro (new game start)
      const currentRecipe = useGameSessionStore.getState().selectedRecipe
      const currentIsHost = useGameSessionStore.getState().isHost()
      
      // Host goes directly to game, players see countdown
      if (currentIsHost) {
        if (currentRecipe) {
          navigate('/game/play', { replace: true })
        } else {
          navigate('/game/intro')
        }
      } else {
        // Players see countdown before game starts
        navigate('/game/countdown', { replace: true })
      }
    }

    const handleHostRecipeSelection = () => {
      // Host is navigating to recipe selection, clients should go to waiting screen
      // Check isHost inside the handler to get current value
      const currentIsHost = useGameSessionStore.getState().isHost()
      if (!currentIsHost) {
        navigate('/game/intro')
      }
    }

    const handleError = () => {
      navigate('/')
    }

    socket.on(serverEvents.gameStart, handleGameStart)
    socket.on(serverEvents.hostRecipeSelection, handleHostRecipeSelection)
    socket.on(serverEvents.error, handleError)

    return () => {
      socket.off(serverEvents.gameStart, handleGameStart)
      socket.off(serverEvents.hostRecipeSelection, handleHostRecipeSelection)
      socket.off(serverEvents.error, handleError)
    }
  }, [navigate, socket])

  const handleStart = () => {
    // Emit event to notify clients that host is navigating to recipe selection
    socket.emit(clientEvents.hostNavigatingToIntro, { gameid })
    // Navigate to intro screen where host can select recipe and start game
    navigate('/game/intro')
  }

  const handleLeave = () => {
    leaveGame()
    navigate('/')
  }

  return (
    <Container sx={{ display: 'flex', justifyContent: 'center', height: '100%', py: 2 }}>
      <Box sx={{ width: '100%', maxWidth: isHost() ? 1200 : 600 }}>
        {isHost() ? (
          <Card sx={{ padding: '20px', borderRadius: '10px' }}>
            <CardHeader
              title={
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h5">Host Dashboard</Typography>
                  <Typography variant="subtitle1" color="text.secondary">
                    Game code: {gameid}
                  </Typography>
                </Box>
              }
              subheader={
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle1">{gameType}</Typography>
                </Box>
              }
            />
            <Divider />
            <CardContent>
              <Typography variant="h6" gutterBottom>Players</Typography>
              <List>
                {players
                  .filter(player => player !== 'Host') // Exclude host from display
                  .map((player, index) => (
                    <ListItem key={index}>
                      <Typography>
                        {player} {player === username && '(You)'}
                      </Typography>
                    </ListItem>
                  ))}
                {players.filter(player => player !== 'Host').length === 0 && (
                  <ListItem>
                    <Typography color="text.secondary">Waiting for players to join...</Typography>
                  </ListItem>
                )}
              </List>
            </CardContent>
            <CardActions sx={{ justifyContent: 'space-between' }}>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleStart}
                disabled={players.filter(player => player !== 'Host').length < 2}
              >
                Start Game
              </Button>
              <Button 
                variant="outlined" 
                color="secondary" 
                onClick={handleLeave}
              >
                Leave Game
              </Button>
            </CardActions>
          </Card>
        ) : (
          <Card sx={{ padding: '20px', borderRadius: '10px' }}>
            <CardHeader
              title={
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h5">Game Lobby</Typography>
                  <Typography variant="subtitle1" color="text.secondary">
                    Game code: {gameid}
                  </Typography>
                </Box>
              }
              subheader={
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle1">{gameType}</Typography>
                  <Typography variant="subtitle2" color="text.secondary">
                    You are: Player ({username})
                  </Typography>
                </Box>
              }
            />
            <Divider />
            <CardContent>
              <Typography variant="h6" gutterBottom>Players</Typography>
              <List>
                {players
                  .filter(player => player !== 'Host') // Exclude host from display
                  .map((player, index) => (
                    <ListItem key={index}>
                      <Typography>
                        {player} {player === username && '(You)'}
                      </Typography>
                    </ListItem>
                  ))}
                {players.filter(player => player !== 'Host').length === 0 && (
                  <ListItem>
                    <Typography color="text.secondary">Waiting for players to join...</Typography>
                  </ListItem>
                )}
              </List>
            </CardContent>
            <CardActions sx={{ justifyContent: 'flex-end' }}>
              <Button 
                variant="outlined" 
                color="secondary" 
                onClick={handleLeave}
              >
                Leave Game
              </Button>
            </CardActions>
          </Card>
        )}
      </Box>
    </Container>
  )
}

export default LobbyComponent 