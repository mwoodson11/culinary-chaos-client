import { Box, Typography, Paper, Grid, Button, Card, CardMedia, CardContent, CardActionArea, TextField, MenuItem, Select, FormControl, InputLabel, Collapse, List, ListItem, ListItemText, Chip, IconButton, Checkbox, FormControlLabel, FormGroup } from '@mui/material'
import { useState, useMemo } from 'react'
import { useGameSessionStore } from '@/stores/gameSessionStore'
import recipesData from '@/data/recipes.json'
import cocktailsData from '@/data/cocktails.json'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'

interface Recipe {
  id: string
  name: string
  image: string
  ingredients: Array<{ name: string; amount: string }>
  instructions: string[]
  timeToBake: number
}

interface RecipeSelectorProps {
  onSelect: (recipe: Recipe) => void
  selectedRecipe: Recipe | null
}

function RecipeSelector({ onSelect, selectedRecipe }: RecipeSelectorProps) {
  const { gameType } = useGameSessionStore()
  const isMixingGame = gameType === 'Mixing Game'
  // Load recipes based on game type
  const allRecipes = (isMixingGame ? cocktailsData : recipesData) as Recipe[]
  const [localSelected, setLocalSelected] = useState<Recipe | null>(selectedRecipe)
  const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null)
  
  // Filter states
  const [timeFilter, setTimeFilter] = useState<string>('all')
  const [missingIngredients, setMissingIngredients] = useState<string[]>([])

  // Get all unique ingredients for filter dropdown
  const allIngredients = useMemo(() => {
    const ingredients = new Set<string>()
    allRecipes.forEach(recipe => {
      recipe.ingredients.forEach(ing => {
        ingredients.add(ing.name.toLowerCase())
      })
    })
    return Array.from(ingredients).sort()
  }, [allRecipes])

  // Filter recipes based on time and missing ingredients
  const filteredRecipes = useMemo(() => {
    let filtered = [...allRecipes]

    // Filter by time
    if (timeFilter !== 'all') {
      const maxTime = parseInt(timeFilter)
      filtered = filtered.filter(recipe => recipe.timeToBake <= maxTime)
    }

    // Filter out recipes that require any of the missing ingredients
    if (missingIngredients.length > 0) {
      filtered = filtered.filter(recipe => {
        // Check if recipe requires any of the missing ingredients
        const recipeIngredientNames = recipe.ingredients.map(ing => ing.name.toLowerCase())
        const hasMissingIngredient = missingIngredients.some(missingIng => 
          recipeIngredientNames.some(recipeIng => 
            recipeIng.includes(missingIng.toLowerCase()) || missingIng.toLowerCase().includes(recipeIng)
          )
        )
        // Exclude recipes that have missing ingredients
        return !hasMissingIngredient
      })
    }

    return filtered
  }, [allRecipes, timeFilter, missingIngredients])

  const handleSelect = (recipe: Recipe) => {
    setLocalSelected(recipe)
    onSelect(recipe)
  }

  const handleRandom = () => {
    const randomRecipe = filteredRecipes[Math.floor(Math.random() * filteredRecipes.length)]
    if (randomRecipe) {
      setLocalSelected(randomRecipe)
      onSelect(randomRecipe)
    }
  }

  const toggleExpand = (recipeId: string) => {
    setExpandedRecipe(expandedRecipe === recipeId ? null : recipeId)
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Select a {isMixingGame ? 'Cocktail' : 'Recipe'}
        </Typography>
        <Button variant="outlined" color="secondary" onClick={handleRandom} disabled={filteredRecipes.length === 0}>
          Pick Random
        </Button>
      </Box>

      {/* Filter Controls */}
      <Paper elevation={2} sx={{ p: 3, mb: 3, bgcolor: 'background.paper' }}>
        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
          Filters
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel id="time-filter-label">Filter by Time</InputLabel>
              <Select
                labelId="time-filter-label"
                value={timeFilter}
                label="Filter by Time"
                onChange={(e) => setTimeFilter(e.target.value)}
              >
                <MenuItem value="all">All Times</MenuItem>
                <MenuItem value="30">30 minutes or less</MenuItem>
                <MenuItem value="45">45 minutes or less</MenuItem>
                <MenuItem value="60">60 minutes or less</MenuItem>
                <MenuItem value="90">90 minutes or less</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={12} md={9}>
            <FormControl component="fieldset" fullWidth>
              <InputLabel shrink sx={{ position: 'relative', transform: 'none', mb: 1 }}>
                <Typography variant="body2" fontWeight="medium">
                  Exclude Recipes Needing (Select ingredients you don't have):
                </Typography>
              </InputLabel>
              <Paper 
                variant="outlined" 
                sx={{ 
                  p: 2, 
                  maxHeight: 200, 
                  overflowY: 'auto',
                  bgcolor: 'background.default'
                }}
              >
                <Grid container spacing={1}>
                  {allIngredients.map((ingredient) => {
                    const isChecked = missingIngredients.includes(ingredient)
                    return (
                      <Grid item xs={12} sm={6} key={ingredient}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setMissingIngredients([...missingIngredients, ingredient])
                                } else {
                                  setMissingIngredients(missingIngredients.filter(ing => ing !== ingredient))
                                }
                              }}
                              size="small"
                            />
                          }
                          label={
                            <Typography variant="body2">
                              {ingredient.charAt(0).toUpperCase() + ingredient.slice(1)}
                            </Typography>
                          }
                        />
                      </Grid>
                    )
                  })}
                </Grid>
              </Paper>
              {missingIngredients.length > 0 && (
                <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ width: '100%' }}>
                    Excluding recipes with:
                  </Typography>
                  {missingIngredients.map((ingredient) => (
                    <Chip 
                      key={ingredient} 
                      label={ingredient.charAt(0).toUpperCase() + ingredient.slice(1)} 
                      size="small"
                      onDelete={() => {
                        setMissingIngredients(missingIngredients.filter(ing => ing !== ingredient))
                      }}
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </Box>
              )}
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={12} md={3}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Showing {filteredRecipes.length} of {allRecipes.length} {isMixingGame ? 'cocktails' : 'recipes'}
              </Typography>
              {(timeFilter !== 'all' || missingIngredients.length > 0) && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    setTimeFilter('all')
                    setMissingIngredients([])
                  }}
                  sx={{ mt: 1 }}
                  fullWidth
                >
                  Clear Filters
                </Button>
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      {filteredRecipes.length === 0 ? (
        <Paper elevation={1} sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No recipes match your filters
          </Typography>
          <Button
            variant="outlined"
            sx={{ mt: 2 }}
            onClick={() => {
              setTimeFilter('all')
              setMissingIngredients([])
            }}
          >
            Clear Filters
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {filteredRecipes.map((recipe) => (
            <Grid item xs={12} sm={6} md={4} key={recipe.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  border: localSelected?.id === recipe.id ? 3 : 1,
                  borderColor: localSelected?.id === recipe.id ? 'primary.main' : 'divider'
                }}
              >
                <CardActionArea onClick={() => handleSelect(recipe)}>
                  <CardMedia
                    component="img"
                    height="200"
                    image={recipe.image}
                    alt={recipe.name}
                    sx={{ objectFit: 'cover' }}
                  />
                  <CardContent>
                    <Typography variant="h6" component="div" gutterBottom>
                      {recipe.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {recipe.ingredients.length} ingredients • {recipe.timeToBake} min
                    </Typography>
                  </CardContent>
                </CardActionArea>
                
                {/* Expandable Ingredients/Tools Section */}
                <Box sx={{ px: 2, pb: 1 }}>
                  <Button
                    fullWidth
                    onClick={() => toggleExpand(recipe.id)}
                    endIcon={expandedRecipe === recipe.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    sx={{ justifyContent: 'space-between' }}
                  >
                    {expandedRecipe === recipe.id ? 'Hide Details' : 'Show Ingredients & Tools'}
                  </Button>
                  
                  <Collapse in={expandedRecipe === recipe.id}>
                    <Box sx={{ mt: 2, mb: 1 }}>
                      <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                        Ingredients:
                      </Typography>
                      <List dense>
                        {recipe.ingredients.map((ingredient, index) => (
                          <ListItem key={index} sx={{ py: 0.5, px: 0 }}>
                            <ListItemText
                              primary={ingredient.name}
                              secondary={ingredient.amount}
                              primaryTypographyProps={{ variant: 'body2' }}
                              secondaryTypographyProps={{ variant: 'caption' }}
                            />
                          </ListItem>
                        ))}
                      </List>
                      
                      {/* Tools section */}
                      <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mt: 2 }}>
                        Common Tools Needed:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                        {isMixingGame ? (
                          <>
                            <Chip label="Cocktail Shaker" size="small" color="primary" variant="outlined" />
                            <Chip label="Bar Spoon" size="small" color="primary" variant="outlined" />
                            <Chip label="Strainer" size="small" color="primary" variant="outlined" />
                            <Chip label="Jigger" size="small" color="primary" variant="outlined" />
                          </>
                        ) : (
                          <>
                            <Chip label="Oven" size="small" color="primary" variant="outlined" />
                            <Chip label="Mixing Bowl" size="small" color="primary" variant="outlined" />
                            <Chip label="Measuring Cups" size="small" color="primary" variant="outlined" />
                            <Chip label="Hand Mixer" size="small" color="primary" variant="outlined" />
                          </>
                        )}
                      </Box>
                    </Box>
                  </Collapse>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {localSelected && (
        <Paper elevation={2} sx={{ mt: 3, p: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
          <Typography variant="body1" fontWeight="bold">
            Selected: {localSelected.name}
          </Typography>
        </Paper>
      )}
    </Box>
  )
}

export default RecipeSelector

