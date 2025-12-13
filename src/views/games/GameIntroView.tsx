import { Container, Typography, Box, Button, Paper, List, ListItem, ListItemIcon, ListItemText } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useGameSessionStore } from '@/stores/gameSessionStore'
import { useEffect, useState } from 'react'
import { clientEvents, serverEvents } from '@/types/events'
import { useBeforeUnload } from '@/hooks/useBeforeUnload'
import TimerIcon from '@mui/icons-material/Timer'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import GroupIcon from '@mui/icons-material/Group'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import PaletteIcon from '@mui/icons-material/Palette'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import RecipeSelector from '@/components/RecipeSelector'
import GameSettings, { type GameSettings as GameSettingsType } from '@/components/GameSettings'
import { Dialog, DialogTitle, DialogContent } from '@mui/material'

interface Recipe {
  id: string
  name: string
  image: string
  ingredients: Array<{ name: string; amount: string }>
  instructions: string[]
  timeToBake: number
}

function GameIntroView() {
  const navigate = useNavigate()
  const { isHost, socket, gameid, gameType, gameSettings } = useGameSessionStore()
  const isMixingGame = gameType === 'Mixing Game'
  const [currentScreen, setCurrentScreen] = useState<'rules' | 'recipe'>('rules')
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)

  // Redirect to home if socket is connected but not connected to a game
  useEffect(() => {
    if (socket.connected && !gameid) {
      navigate('/', { replace: true })
    }
  }, [socket.connected, gameid, navigate])

  // Warn user before leaving/refreshing during recipe selection
  useBeforeUnload(
    !!(gameid && socket.connected && isHost()),
    'Are you sure you want to leave? The game setup will be lost.'
  )

  useEffect(() => {
    // Listen for game start event from server
    const handleGameStart = () => {
      const currentIsHost = useGameSessionStore.getState().isHost()
      // Host goes directly to game, players see countdown
      if (currentIsHost) {
        navigate('/game/play')
      } else {
        navigate('/game/countdown', { replace: true })
      }
    }

    socket.on(serverEvents.gameStart, handleGameStart)

    return () => {
      socket.off(serverEvents.gameStart, handleGameStart)
    }
  }, [navigate, socket])

  const handleStart = () => {
    if (isHost() && selectedRecipe) {
      socket.emit(clientEvents.startGame, { 
        gameid, 
        recipe: selectedRecipe,
        settings: gameSettings
      })
      navigate('/game/play')
    }
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

  if (!isHost()) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h4" gutterBottom>
            Waiting for Host
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            The host is preparing the game. Please wait while they set everything up.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            You'll be automatically taken to the game when it starts.
          </Typography>
        </Paper>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {currentScreen === 'rules' ? (
        // Competition Rules Screen
        <Box>
          <Typography variant="h4" align="center" gutterBottom>
            {isMixingGame ? 'Mixing Competition Rules' : 'Baking Competition Rules'}
          </Typography>
          
          <Paper elevation={3} sx={{ p: 4, my: 4 }}>
            <List>
              <ListItem>
                <ListItemIcon>
                  <TimerIcon color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary="Time Limit"
                  secondary={`You have ${gameSettings?.gameTime || 60} minutes to complete your ${isMixingGame ? 'cocktail' : 'dessert'}. When the timer ends, all ${isMixingGame ? 'mixing' : 'baking'} must stop immediately.`}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <RestaurantIcon color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary="Taste (40% of score)"
                  secondary={`Your ${isMixingGame ? 'cocktail' : 'dessert'} will be judged on flavor, ${isMixingGame ? 'balance' : 'texture'}, and overall ${isMixingGame ? 'drinkability' : 'deliciousness'}.`}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <PaletteIcon color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary="Presentation (40% of score)"
                  secondary={`How your ${isMixingGame ? 'cocktail' : 'dessert'} looks matters! Focus on ${isMixingGame ? 'garnishes, glassware, and visual appeal' : 'decoration, plating, and visual appeal'}.`}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <LightbulbIcon color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary="Creativity (20% of score)"
                  secondary="Show off your unique style! Original ideas and innovative techniques will be rewarded."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <GroupIcon color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary="Competition Format"
                  secondary={`All players will ${isMixingGame ? 'mix' : 'bake'} simultaneously. The host can pause the timer if needed, but the total time cannot exceed ${isMixingGame ? '45' : '60'} minutes.`}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <EmojiEventsIcon color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary="Winning"
                  secondary={`The player with the highest combined score across all categories will be crowned the ${isMixingGame ? 'Mixing' : 'Baking'} Champion!`}
                />
              </ListItem>
            </List>
          </Paper>

          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              endIcon={<ArrowForwardIcon />}
              onClick={() => setCurrentScreen('recipe')}
            >
              Next: Select Recipe
            </Button>
          </Box>
        </Box>
      ) : (
        // Recipe Selection Screen
        <Box>
          <Typography variant="h4" align="center" gutterBottom>
            Select Recipe
          </Typography>
          
          <Box sx={{ mt: 4 }}>
            <RecipeSelector 
              onSelect={handleRecipeSelect}
              selectedRecipe={selectedRecipe}
            />
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 4 }}>
              <Button
                variant="outlined"
                color="primary"
                size="large"
                startIcon={<ArrowBackIcon />}
                onClick={() => setCurrentScreen('rules')}
              >
                Back to Rules
              </Button>
              <Button
                variant="contained"
                color="primary"
                size="large"
                onClick={handleStart}
                disabled={!selectedRecipe}
              >
                Start Game
              </Button>
            </Box>
          </Box>
        </Box>
      )}

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
    </Container>
  )
}

export default GameIntroView 