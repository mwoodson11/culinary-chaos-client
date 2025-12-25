import { Container, Typography, Box, Button, Paper, List, ListItem, ListItemIcon, ListItemText, Card, CardMedia } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useGameSessionStore } from '@/stores/gameSessionStore'
import { useEffect, useState } from 'react'
import { serverEvents, clientEvents } from '@/types/events'
import TimerIcon from '@mui/icons-material/Timer'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import GroupIcon from '@mui/icons-material/Group'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import PaletteIcon from '@mui/icons-material/Palette'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import { GAME_TYPE_CHRISTMAS_BAKE } from '@/constants'

function GameInstructionsView() {
  const navigate = useNavigate()
  const { gameType, gameSettings, isHost, socket, gameid, selectedRecipe } = useGameSessionStore()
  const isMixingGame = gameType === 'Mixing Game' || gameType === 'Christmas Mix'
  const isChristmasBake = gameType === GAME_TYPE_CHRISTMAS_BAKE
  const [showRecipeDisplay, setShowRecipeDisplay] = useState(false)

  useEffect(() => {
    const handleHostNavigatingToRecipeDisplay = () => {
      // Players follow host to recipe display view
      setShowRecipeDisplay(true)
    }

    const handleHostNavigatingToRules = (data?: { recipe?: any; settings?: any }) => {
      // Players follow host back to rules view
      // Store recipe and settings if provided
      if (data?.recipe) {
        useGameSessionStore.setState({ selectedRecipe: data.recipe })
      }
      if (data?.settings) {
        useGameSessionStore.setState({ gameSettings: data.settings })
      }
      setShowRecipeDisplay(false)
    }

    const handleGameStart = () => {
      // When game starts, host goes to game, players go to countdown
      const currentIsHost = useGameSessionStore.getState().isHost()
      if (currentIsHost) {
        navigate('/game/play', { replace: true })
      } else {
        navigate('/game/countdown', { replace: true })
      }
    }

    socket.on(serverEvents.hostNavigatingToRecipeDisplay, handleHostNavigatingToRecipeDisplay)
    socket.on(serverEvents.hostNavigatingToRules, handleHostNavigatingToRules)
    socket.on(serverEvents.gameStart, handleGameStart)

    return () => {
      socket.off(serverEvents.hostNavigatingToRecipeDisplay, handleHostNavigatingToRecipeDisplay)
      socket.off(serverEvents.hostNavigatingToRules, handleHostNavigatingToRules)
      socket.off(serverEvents.gameStart, handleGameStart)
    }
  }, [navigate, socket])

  const handleNext = () => {
    if (isHost()) {
      // Emit event to notify players that host is showing recipe display
      socket.emit(clientEvents.hostNavigatingToRecipeDisplay, { gameid })
      setShowRecipeDisplay(true)
    }
  }

  const handleBack = () => {
    if (isHost()) {
      // Emit event to notify players that host is going back to rules
      socket.emit(clientEvents.hostNavigatingToRules, { gameid })
      setShowRecipeDisplay(false)
    }
  }

  const handleBeginGame = () => {
    if (isHost() && selectedRecipe) {
      socket.emit(clientEvents.startGame, { 
        gameid, 
        recipe: selectedRecipe,
        settings: gameSettings
      })
      navigate('/game/play')
    }
  }

  // Show recipe display view
  if (showRecipeDisplay) {
    // For Christmas Bake, show generic sugar cookies with message
    if (isChristmasBake) {
      return (
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h3" gutterBottom>
              Today you are making...
            </Typography>
            
            <Paper elevation={3} sx={{ p: 4, mt: 4, mb: 4 }}>
              <Typography variant="h4" color="primary" gutterBottom>
                Sugar Cookies
              </Typography>
              
              <Card sx={{ maxWidth: 400, mx: 'auto', mt: 3 }}>
                <CardMedia
                  component="img"
                  height="300"
                  image="https://images.unsplash.com/photo-1703633294266-9a5992c3b37e?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                  alt="Sugar Cookies"
                  sx={{ objectFit: 'cover' }}
                />
              </Card>
              
              <Typography variant="body1" color="text.secondary" sx={{ mt: 3 }}>
                Cookie shapes can be revealed when the game starts.
              </Typography>
            </Paper>

            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 4 }}>
              {isHost() && (
                <Button
                  variant="outlined"
                  color="primary"
                  size="large"
                  startIcon={<ArrowBackIcon />}
                  onClick={handleBack}
                >
                  Back
                </Button>
              )}
              {isHost() ? (
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  endIcon={<PlayArrowIcon />}
                  onClick={handleBeginGame}
                >
                  Begin Game
                </Button>
              ) : (
                <Typography variant="body1" color="text.secondary">
                  Waiting for host to begin the game...
                </Typography>
              )}
            </Box>
          </Box>
        </Container>
      )
    }
    
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h3" gutterBottom>
            Today you are making...
          </Typography>
          
          <Paper elevation={3} sx={{ p: 4, mt: 4, mb: 4 }}>
            <Typography variant="h4" color="primary" gutterBottom>
              {selectedRecipe.name}
            </Typography>
            
            <Card sx={{ maxWidth: 400, mx: 'auto', mt: 3 }}>
              <CardMedia
                component="img"
                height="300"
                image={selectedRecipe.image}
                alt={selectedRecipe.name}
                sx={{ objectFit: 'cover' }}
              />
            </Card>
          </Paper>

          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 4 }}>
            {isHost() && (
              <Button
                variant="outlined"
                color="primary"
                size="large"
                startIcon={<ArrowBackIcon />}
                onClick={handleBack}
              >
                Back
              </Button>
            )}
            {isHost() ? (
              <Button
                variant="contained"
                color="primary"
                size="large"
                endIcon={<PlayArrowIcon />}
                onClick={handleBeginGame}
              >
                Begin Game
              </Button>
            ) : (
              <Typography variant="body1" color="text.secondary">
                Waiting for host to begin the game...
              </Typography>
            )}
          </Box>
        </Box>
      </Container>
    )
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" align="center" gutterBottom>
        {isMixingGame ? 'Mixing Competition Rules' : (isChristmasBake ? 'Christmas Bake Competition Rules' : 'Baking Competition Rules')}
      </Typography>
      
      <Paper elevation={3} sx={{ p: 4, my: 4 }}>
        <List>
          <ListItem>
            <ListItemIcon>
              <TimerIcon color="primary" />
            </ListItemIcon>
            <ListItemText 
              primary="Time Limit"
              secondary={`You have ${gameSettings?.gameTime || selectedRecipe?.timeToBake || 60} minutes to complete your ${isMixingGame ? 'cocktail' : 'dessert'}. When the timer ends, all ${isMixingGame ? 'mixing' : 'baking'} must stop immediately.`}
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
              secondary={`All players will ${isMixingGame ? 'mix' : 'bake'} simultaneously. The host can pause the timer if needed, but the total time cannot exceed ${gameSettings?.gameTime || selectedRecipe?.timeToBake || 60} minutes.`}
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

      {isHost() && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            endIcon={<ArrowForwardIcon />}
            onClick={handleNext}
          >
            Next
          </Button>
        </Box>
      )}
      {!isHost() && (
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="body1" color="text.secondary">
            Waiting for host to continue...
          </Typography>
        </Box>
      )}
    </Container>
  )
}

export default GameInstructionsView 