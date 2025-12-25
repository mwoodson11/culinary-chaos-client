import { Typography, List, ListItem, ListItemIcon, ListItemText, Box, Divider, Button, Paper, Accordion, AccordionSummary, AccordionDetails, Chip } from '@mui/material'
import { useGameSessionStore } from '@/stores/gameSessionStore'
import { useEffect } from 'react'
import { clientEvents, serverEvents } from '@/types/events'
import LockIcon from '@mui/icons-material/Lock'
import LockOpenIcon from '@mui/icons-material/LockOpen'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import FlourIcon from '@mui/icons-material/Grain'
import EggIcon from '@mui/icons-material/Egg'
import MilkIcon from '@mui/icons-material/WaterDrop'
import SugarIcon from '@mui/icons-material/Cake'
import ButterIcon from '@mui/icons-material/OilBarrel'
import VanillaIcon from '@mui/icons-material/Science'
import NumbersIcon from '@mui/icons-material/Numbers'

// Icon mapping for ingredients
const getIngredientIcon = (ingredientName: string) => {
  const name = ingredientName.toLowerCase()
  if (name.includes('flour')) return <FlourIcon />
  if (name.includes('sugar')) return <SugarIcon />
  if (name.includes('butter')) return <ButterIcon />
  if (name.includes('egg')) return <EggIcon />
  if (name.includes('milk') || name.includes('buttermilk')) return <MilkIcon />
  if (name.includes('vanilla')) return <VanillaIcon />
  return <NumbersIcon />
}

function RecipeTab() {
  const { selectedRecipe, gameType, socket, gameid, username, points, isHost, recipeUnlocked: storeRecipeUnlocked, icingUnlocked: storeIcingUnlocked } = useGameSessionStore()
  const isMixingGame = gameType === 'Mixing Game'
  const isChristmasMix = gameType === 'Christmas Mix'
  const isChristmasBake = gameType === 'Christmas Bake'
  
  // Use store value if available, otherwise default based on host status
  const recipeUnlocked = isHost() || (!isChristmasMix && !isChristmasBake) ? true : storeRecipeUnlocked
  const icingUnlocked = isHost() || !isChristmasBake ? true : storeIcingUnlocked

  useEffect(() => {
    if ((!isChristmasMix && !isChristmasBake) || isHost()) {
      // Host always sees the recipe, and non-Christmas Mix games don't need unlock
      return
    }

    const handleRecipeUnlocked = (data: { unlocked: boolean }) => {
      if (data.unlocked) {
        useGameSessionStore.setState({ recipeUnlocked: true })
      }
    }

    const handleIcingUnlocked = (data: { unlocked: boolean }) => {
      if (data.unlocked) {
        useGameSessionStore.setState({ icingUnlocked: true })
      }
    }

    socket.on(serverEvents.recipeUnlocked, handleRecipeUnlocked)
    if (isChristmasBake) {
      socket.on(serverEvents.icingUnlocked, handleIcingUnlocked)
    }

    return () => {
      socket.off(serverEvents.recipeUnlocked, handleRecipeUnlocked)
      if (isChristmasBake) {
        socket.off(serverEvents.icingUnlocked, handleIcingUnlocked)
      }
    }
  }, [isChristmasMix, isChristmasBake, isHost, socket])

  const handlePurchaseRecipe = () => {
    if (!gameid || !username) return
    socket.emit(clientEvents.purchaseRecipe, { gameid, username })
  }

  const handlePurchaseIcing = () => {
    if (!gameid || !username) return
    socket.emit(clientEvents.purchaseIcing, { gameid, username })
  }

  if (!selectedRecipe) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h6" color="text.secondary">
          Waiting for recipe selection...
        </Typography>
      </Box>
    )
  }

  // For Christmas Mix and Christmas Bake, show unlock option if not unlocked (and not host)
  if ((isChristmasMix || isChristmasBake) && !recipeUnlocked && !isHost()) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Paper elevation={3} sx={{ p: 4, maxWidth: 500, mx: 'auto' }}>
          <LockIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Recipe Locked
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Unlock the recipe to see ingredients, instructions, and reference image.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={handlePurchaseRecipe}
            disabled={points < 100}
            startIcon={<LockOpenIcon />}
            sx={{ minWidth: 200 }}
          >
            Unlock Recipe (100 points)
          </Button>
          {points < 100 && (
            <Typography variant="body2" color="error" sx={{ mt: 2 }}>
              You need {100 - points} more points to unlock the recipe.
            </Typography>
          )}
        </Paper>
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ textAlign: 'center' }}>
        {selectedRecipe.name}
      </Typography>
      
      {/* Reference Image */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <img 
          src={selectedRecipe.image}
          alt={selectedRecipe.name}
          style={{
            maxWidth: '100%',
            height: 'auto',
            borderRadius: '8px',
            maxHeight: '300px',
            objectFit: 'cover'
          }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Reference Image - Feel free to be creative with your own design!
        </Typography>
      </Box>

      {/* Ingredients */}
      <Typography variant="h6" gutterBottom>
        Ingredients
      </Typography>
      <List>
        {selectedRecipe.ingredients.map((ingredient: { name: string; amount: string }, index: number) => (
          <ListItem key={index}>
            <ListItemIcon>
              {getIngredientIcon(ingredient.name)}
            </ListItemIcon>
            <ListItemText 
              primary={ingredient.name}
              secondary={ingredient.amount}
            />
          </ListItem>
        ))}
      </List>

      <Divider sx={{ my: 3 }} />

      {/* Instructions */}
      <Typography variant="h6" gutterBottom>
        Instructions
      </Typography>
      <List>
        {selectedRecipe.instructions.map((instruction: string, index: number) => (
          <ListItem key={index}>
            <ListItemIcon>
              <Typography variant="body2" color="primary">
                {index + 1}.
              </Typography>
            </ListItemIcon>
            <ListItemText primary={instruction} />
          </ListItem>
        ))}
      </List>

      {/* Icing Recipes Section - Only for Christmas Bake */}
      {isChristmasBake && (
        <>
          <Divider sx={{ my: 3 }} />
          <Typography variant="h6" gutterBottom>
            Icing Recipes
          </Typography>
          
          {!icingUnlocked && !isHost() ? (
            <Paper elevation={2} sx={{ p: 3, textAlign: 'center', my: 2 }}>
              <LockIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                Unlock all icing recipes to see Royal Icing, Glaze Icing, and Buttercream recipes.
              </Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={handlePurchaseIcing}
                disabled={points < 100}
                startIcon={<LockOpenIcon />}
              >
                Unlock Icing Recipes (100 points)
              </Button>
              {points < 100 && (
                <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                  You need {100 - points} more points to unlock the icing recipes.
                </Typography>
              )}
            </Paper>
          ) : selectedRecipe.icings && selectedRecipe.icings.length > 0 ? (
            selectedRecipe.icings.map((icing: any, index: number) => (
              <Accordion key={icing.id || index} sx={{ mb: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                      {icing.name}
                    </Typography>
                    <Chip 
                      label={icing.finish} 
                      size="small" 
                      sx={{ ml: 2 }}
                      color="primary"
                      variant="outlined"
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {icing.description}
                  </Typography>
                  
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mt: 2, mb: 1 }}>
                    Ingredients:
                  </Typography>
                  <List dense>
                    {icing.ingredients.map((ing: { name: string; amount: string }, idx: number) => (
                      <ListItem key={idx} sx={{ py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          {getIngredientIcon(ing.name)}
                        </ListItemIcon>
                        <ListItemText 
                          primary={ing.name}
                          secondary={ing.amount}
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                      </ListItem>
                    ))}
                  </List>

                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mt: 2, mb: 1 }}>
                    Instructions:
                  </Typography>
                  <List dense>
                    {icing.instructions.map((instruction: string, idx: number) => (
                      <ListItem key={idx} sx={{ py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 24 }}>
                          <Typography variant="body2" color="primary" sx={{ fontSize: '0.75rem' }}>
                            {idx + 1}.
                          </Typography>
                        </ListItemIcon>
                        <ListItemText 
                          primary={instruction}
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                      </ListItem>
                    ))}
                  </List>

                  <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip 
                      label={icing.pros} 
                      size="small" 
                      color="success"
                      variant="outlined"
                    />
                    <Chip 
                      label={icing.cons} 
                      size="small" 
                      color="warning"
                      variant="outlined"
                    />
                  </Box>
                </AccordionDetails>
              </Accordion>
            ))
          ) : null}
        </>
      )}

      <Box sx={{ mt: 4, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
        <Typography variant="body2" color="info.contrastText">
          Remember: You have {selectedRecipe.timeToBake} minutes to complete your {isMixingGame || isChristmasMix ? 'cocktail' : 'cookies'}. Focus on taste, presentation, and creativity!
        </Typography>
      </Box>
    </Box>
  )
}

export default RecipeTab

