import { Typography, List, ListItem, ListItemIcon, ListItemText, Box, Divider } from '@mui/material'
import { useGameSessionStore } from '@/stores/gameSessionStore'
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
  const { selectedRecipe, gameType } = useGameSessionStore()
  const isMixingGame = gameType === 'Mixing Game'

  if (!selectedRecipe) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h6" color="text.secondary">
          Waiting for recipe selection...
        </Typography>
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
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

      <Box sx={{ mt: 4, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
        <Typography variant="body2" color="info.contrastText">
          Remember: You have {selectedRecipe.timeToBake} minutes to complete your {isMixingGame ? 'cocktail' : 'cake'}. Focus on taste, presentation, and creativity!
        </Typography>
      </Box>
    </Box>
  )
}

export default RecipeTab

