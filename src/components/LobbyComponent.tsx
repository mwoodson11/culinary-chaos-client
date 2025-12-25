import { Container, Card, CardContent, CardHeader, CardActions, Button, Typography, Divider, List, ListItem, Box, Dialog, DialogTitle, DialogContent } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useGameSessionStore } from '@/stores/gameSessionStore'
import { useEffect, useState } from 'react'
import { serverEvents, clientEvents } from '@/types/events'
import { useBeforeUnload } from '@/hooks/useBeforeUnload'
import RecipeSelector from '@/components/RecipeSelector'
import GameSettings, { type GameSettings as GameSettingsType } from '@/components/GameSettings'

interface Recipe {
  id: string
  name: string
  image: string
  ingredients: Array<{ name: string; amount: string }>
  instructions: string[]
  timeToBake: number
  selectedShapes?: string[] // For Christmas Bake: array of shape IDs
}

function LobbyComponent() {
  const navigate = useNavigate()
  const { gameid, gameType, players, leaveGame, socket, isHost, username, gameSettings } = useGameSessionStore()
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)

  // Redirect to home if socket is connected but not connected to a game
  useEffect(() => {
    if (socket.connected && !gameid) {
      navigate('/', { replace: true })
    }
  }, [socket.connected, gameid, navigate])

  // Warn user before leaving/refreshing during lobby
  useBeforeUnload(
    !!(gameid && socket.connected),
    'Are you sure you want to leave? You will be disconnected from the game lobby.'
  )

  useEffect(() => {
    const handleGameStart = () => {
      const currentIsHost = useGameSessionStore.getState().isHost()
      
      // Host goes directly to game, players see countdown
      if (currentIsHost) {
        navigate('/game/play', { replace: true })
      } else {
        // Players see countdown before game starts
        navigate('/game/countdown', { replace: true })
      }
    }

    const handleHostNavigatingToRules = (data?: { recipe?: any; settings?: any }) => {
      // Players follow host to rules page
      if (!isHost()) {
        // Store recipe and settings if provided
        if (data?.recipe) {
          useGameSessionStore.setState({ selectedRecipe: data.recipe })
        }
        if (data?.settings) {
          useGameSessionStore.setState({ gameSettings: data.settings })
        }
        navigate('/game/instructions')
      }
    }

    const handleError = () => {
      navigate('/')
    }

    socket.on(serverEvents.gameStart, handleGameStart)
    socket.on(serverEvents.hostNavigatingToRules, handleHostNavigatingToRules)
    socket.on(serverEvents.error, handleError)

    return () => {
      socket.off(serverEvents.gameStart, handleGameStart)
      socket.off(serverEvents.hostNavigatingToRules, handleHostNavigatingToRules)
      socket.off(serverEvents.error, handleError)
    }
  }, [navigate, socket, isHost])

  const handleStart = () => {
    // Save recipe and settings to store before navigating
    if (selectedRecipe) {
      useGameSessionStore.setState({ selectedRecipe })
      // Emit event to notify players that host is navigating to rules, include recipe and settings
      socket.emit(clientEvents.hostNavigatingToRules, { 
        gameid, 
        recipe: selectedRecipe,
        settings: gameSettings || null
      })
    } else {
      // Emit event even without recipe (shouldn't happen, but safety)
      socket.emit(clientEvents.hostNavigatingToRules, { 
        gameid,
        settings: gameSettings || null
      })
    }
    // Navigate to rules page
    navigate('/game/instructions')
  }

  const handleRecipeSelect = (recipe: Recipe) => {
    setSelectedRecipe(recipe)
    // Open settings dialog after recipe selection
    setShowSettingsDialog(true)
  }

  const handleSettingsSave = (settings: GameSettingsType) => {
    // Update gameSettings in store
    useGameSessionStore.setState({ gameSettings: settings })
    setShowSettingsDialog(false)
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
              
              <Divider sx={{ my: 3 }} />
              
              <Typography variant="h6" gutterBottom>Recipe Selection</Typography>
              <Box sx={{ mt: 2 }}>
                <RecipeSelector 
                  onSelect={handleRecipeSelect}
                  selectedRecipe={selectedRecipe}
                />
              </Box>
              
              {selectedRecipe && (
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={() => setShowSettingsDialog(true)}
                  >
                    Edit Settings
                  </Button>
                </Box>
              )}
            </CardContent>
            <CardActions sx={{ justifyContent: 'space-between' }}>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleStart}
                disabled={players.filter(player => player !== 'Host').length < 2 || !selectedRecipe || (gameType === 'Christmas Bake' && (!selectedRecipe.selectedShapes || selectedRecipe.selectedShapes.length === 0))}
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
            
            {/* Settings Dialog */}
            <Dialog
              open={showSettingsDialog}
              onClose={() => setShowSettingsDialog(false)}
              maxWidth="md"
              fullWidth
            >
              <DialogTitle>Game Settings</DialogTitle>
              <DialogContent>
                <GameSettings
                  onSave={handleSettingsSave}
                  initialSettings={gameSettings}
                  selectedRecipe={selectedRecipe}
                />
              </DialogContent>
            </Dialog>
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