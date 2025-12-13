import { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  TextField,
  Button,
  Divider,
  FormControlLabel,
  Switch,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  IconButton
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import SettingsIcon from '@mui/icons-material/Settings'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import storeItemsData from '@/data/storeItems.json'
import { useGameSessionStore } from '@/stores/gameSessionStore'

interface CustomItem {
  id: string
  name: string
  description?: string
  effect?: string
  cost: number
  quantity?: number
  duration?: number // Duration in seconds (0 = one-time use)
  icon: string
  type: 'ingredient' | 'tool' | 'buff' | 'debuff'
}

interface GameSettings {
  gameTime: number // in minutes
  startingPoints: number
  storeItems: {
    [itemId: string]: {
      enabled: boolean
      cost?: number // optional override cost
      quantity?: number // optional override quantity (for tools only)
      duration?: number // optional override duration (for buffs/debuffs only, in seconds)
    }
  }
  customItems: CustomItem[]
}

interface Recipe {
  id: string
  name: string
  image: string
  ingredients: Array<{ name: string; amount: string }>
  instructions: string[]
  timeToBake: number
}

interface GameSettingsProps {
  onSave: (settings: GameSettings) => void
  initialSettings?: GameSettings
  selectedRecipe?: Recipe | null
}

function GameSettings({ onSave, initialSettings, selectedRecipe }: GameSettingsProps) {
  const { gameType } = useGameSessionStore()
  const isMixingGame = gameType === 'Mixing Game'
  const gameItems = isMixingGame ? storeItemsData.mixing : storeItemsData.baking
  
  // Default values
  const defaultGameTime = 60 // 60 minutes
  const defaultStartingPoints = 1000

  // Helper function to match recipe ingredient names to store item names (case-insensitive, partial match)
  const matchIngredientToStoreItem = (recipeIngredientName: string): string | null => {
    const normalizedRecipeName = recipeIngredientName.toLowerCase()
    // Try to find a matching ingredient in the store
    for (const ingredient of gameItems.ingredients) {
      const normalizedStoreName = ingredient.name.toLowerCase()
      // Check for exact match or if recipe ingredient contains store name or vice versa
      if (normalizedRecipeName === normalizedStoreName ||
          normalizedRecipeName.includes(normalizedStoreName) ||
          normalizedStoreName.includes(normalizedRecipeName)) {
        return ingredient.id
      }
    }
    return null
  }

  // Initialize settings with defaults or provided values
  const [gameTime, setGameTime] = useState<number>(() => {
    // If recipe is selected, use its timeToBake, otherwise use initialSettings or default
    if (selectedRecipe) {
      return selectedRecipe.timeToBake
    }
    return initialSettings?.gameTime || defaultGameTime
  })
  const [startingPoints, setStartingPoints] = useState<number>(
    initialSettings?.startingPoints || defaultStartingPoints
  )
  const [storeItems, setStoreItems] = useState<GameSettings['storeItems']>(() => {
    // Initialize all items
    const items: GameSettings['storeItems'] = {}
    const allItems = [
      ...gameItems.ingredients,
      ...gameItems.tools,
      ...storeItemsData.buffs,
      ...storeItemsData.debuffs
    ]
    
    // Initialize all items first (use initialSettings if available, otherwise defaults)
    allItems.forEach(item => {
      const isTool = 'quantity' in item || gameItems.tools.some(t => t.id === item.id)
      const isBuff = storeItemsData.buffs.some(b => b.id === item.id)
      const isDebuff = storeItemsData.debuffs.some(d => d.id === item.id)
      const isBuffOrDebuff = isBuff || isDebuff
      
      // Use initialSettings if available, otherwise use defaults
      if (initialSettings?.storeItems?.[item.id]) {
        items[item.id] = {
          ...initialSettings.storeItems[item.id],
          cost: initialSettings.storeItems[item.id].cost ?? item.cost,
          quantity: isTool && initialSettings.storeItems[item.id].quantity !== undefined 
            ? initialSettings.storeItems[item.id].quantity 
            : (isTool && 'quantity' in item ? (item as any).quantity : undefined),
          duration: isBuffOrDebuff && initialSettings.storeItems[item.id].duration !== undefined
            ? initialSettings.storeItems[item.id].duration
            : (isBuffOrDebuff && 'duration' in item ? (item as any).duration : undefined)
        }
      } else {
        items[item.id] = {
          enabled: true,
          cost: item.cost,
          quantity: isTool && 'quantity' in item ? (item as any).quantity : undefined,
          duration: isBuffOrDebuff && 'duration' in item ? (item as any).duration : undefined
        }
      }
    })
    
    // Also initialize custom items if they exist
    if (initialSettings?.customItems) {
      initialSettings.customItems.forEach(item => {
        if (initialSettings?.storeItems?.[item.id]) {
          items[item.id] = {
            ...initialSettings.storeItems[item.id],
            cost: initialSettings.storeItems[item.id].cost ?? item.cost,
            quantity: item.type === 'tool' && initialSettings.storeItems[item.id].quantity !== undefined 
              ? initialSettings.storeItems[item.id].quantity 
              : (item.type === 'tool' ? item.quantity : undefined),
            duration: (item.type === 'buff' || item.type === 'debuff') && initialSettings.storeItems[item.id].duration !== undefined
              ? initialSettings.storeItems[item.id].duration
              : ((item.type === 'buff' || item.type === 'debuff') ? item.duration : undefined)
          }
        } else {
          items[item.id] = {
            enabled: true,
            cost: item.cost,
            quantity: item.type === 'tool' ? item.quantity : undefined,
            duration: (item.type === 'buff' || item.type === 'debuff') ? item.duration : undefined
          }
        }
      })
    }
    
    // If a recipe is selected and it's a baking game, auto-toggle ingredients needed for that recipe
    if (selectedRecipe && !isMixingGame) {
      // First, ensure all ingredients are initialized, then disable them
      gameItems.ingredients.forEach(ingredient => {
        // Initialize if not already present
        if (!items[ingredient.id]) {
          items[ingredient.id] = {
            enabled: true,
            cost: ingredient.cost
          }
        }
        // Disable all ingredients
        items[ingredient.id] = {
          ...items[ingredient.id],
          enabled: false
        }
      })
      
      // Then, enable ingredients that match the recipe
      selectedRecipe.ingredients.forEach(recipeIngredient => {
        const matchedItemId = matchIngredientToStoreItem(recipeIngredient.name)
        if (matchedItemId) {
          // Ensure the item exists
          if (!items[matchedItemId]) {
            const matchedIngredient = gameItems.ingredients.find(ing => ing.id === matchedItemId)
            if (matchedIngredient) {
              items[matchedItemId] = {
                enabled: true,
                cost: matchedIngredient.cost
              }
            }
          } else {
            items[matchedItemId] = {
              ...items[matchedItemId],
              enabled: true
            }
          }
        }
      })
    }
    
    return items
  })
  const [customItems, setCustomItems] = useState<CustomItem[]>(
    initialSettings?.customItems || []
  )

  // Update gameTime when recipe changes
  useEffect(() => {
    if (selectedRecipe) {
      setGameTime(selectedRecipe.timeToBake)
    }
  }, [selectedRecipe])

  // Update storeItems when recipe changes (only for baking games)
  // This effect runs when selectedRecipe changes OR when component mounts with a recipe
  useEffect(() => {
    if (selectedRecipe && !isMixingGame) {
      setStoreItems(prev => {
        const updated = { ...prev }
        
        // Ensure all ingredients are initialized in the updated state
        gameItems.ingredients.forEach(ingredient => {
          if (!updated[ingredient.id]) {
            updated[ingredient.id] = {
              enabled: true,
              cost: ingredient.cost
            }
          }
        })
        
        // First, disable all ingredients
        gameItems.ingredients.forEach(ingredient => {
          updated[ingredient.id] = {
            ...updated[ingredient.id],
            enabled: false
          }
        })
        
        // Then, enable ingredients that match the recipe
        selectedRecipe.ingredients.forEach(recipeIngredient => {
          const matchedItemId = matchIngredientToStoreItem(recipeIngredient.name)
          if (matchedItemId) {
            // Ensure the item exists in the updated state
            if (!updated[matchedItemId]) {
              const matchedIngredient = gameItems.ingredients.find(ing => ing.id === matchedItemId)
              if (matchedIngredient) {
                updated[matchedItemId] = {
                  enabled: true,
                  cost: matchedIngredient.cost
                }
              }
            } else {
              updated[matchedItemId] = {
                ...updated[matchedItemId],
                enabled: true
              }
            }
          }
        })
        
        return updated
      })
    } else if (!selectedRecipe && !isMixingGame) {
      // If no recipe is selected, ensure all ingredients are enabled
      setStoreItems(prev => {
        const updated = { ...prev }
        gameItems.ingredients.forEach(ingredient => {
          if (updated[ingredient.id]) {
            updated[ingredient.id] = {
              ...updated[ingredient.id],
              enabled: true
            }
          }
        })
        return updated
      })
    }
  }, [selectedRecipe, isMixingGame, gameItems.ingredients])

  const handleItemToggle = (itemId: string) => {
    setStoreItems(prev => {
      const currentItem = prev[itemId]
      // If item doesn't exist, initialize it with enabled: false (toggling from default enabled to disabled)
      // If item exists, toggle its enabled state
      const newEnabled = currentItem ? !currentItem.enabled : false
      
      // Get the item to preserve cost, quantity, and duration
      const item = getItemById(itemId)
      const isTool = item && ('quantity' in item || gameItems.tools.some(t => t.id === itemId))
      const isBuff = item && storeItemsData.buffs.some(b => b.id === itemId)
      const isDebuff = item && storeItemsData.debuffs.some(d => d.id === itemId)
      const isBuffOrDebuff = isBuff || isDebuff
      
      return {
        ...prev,
        [itemId]: {
          ...(currentItem || {}),
          enabled: newEnabled,
          cost: currentItem?.cost ?? item?.cost,
          quantity: isTool ? (currentItem?.quantity ?? (item && 'quantity' in item ? (item as any).quantity : undefined)) : undefined,
          duration: isBuffOrDebuff ? (currentItem?.duration ?? (item && 'duration' in item ? (item as any).duration : undefined)) : undefined
        }
      }
    })
  }

  const handleCostChange = (itemId: string, cost: number) => {
    setStoreItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        cost: cost > 0 ? cost : undefined
      }
    }))
  }

  const handleQuantityChange = (itemId: string, quantity: number | string) => {
    setStoreItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        quantity: typeof quantity === 'string' && quantity.trim() === '' 
          ? undefined 
          : (typeof quantity === 'number' && quantity > 0 ? quantity : undefined)
      }
    }))
  }

  const handleDurationChange = (itemId: string, duration: number | string) => {
    setStoreItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        duration: typeof duration === 'string' && duration.trim() === '' 
          ? undefined 
          : (typeof duration === 'number' && duration >= 0 ? duration : undefined)
      }
    }))
  }

  const handleSave = () => {
    // Build a complete storeItems object with ALL items explicitly included
    const updatedStoreItems: GameSettings['storeItems'] = {}
    const allItems = [
      ...gameItems.ingredients,
      ...gameItems.tools,
      ...storeItemsData.buffs,
      ...storeItemsData.debuffs
    ]
    
    // First, copy all existing items from current storeItems state (preserves enabled state)
    Object.keys(storeItems).forEach(itemId => {
      updatedStoreItems[itemId] = { ...storeItems[itemId] }
    })
    
    // Then, ensure ALL default items are explicitly included with their current state
    allItems.forEach(item => {
      const isTool = 'quantity' in item || gameItems.tools.some(t => t.id === item.id)
      const isIngredient = gameItems.ingredients.some(ing => ing.id === item.id)
      const isBuff = storeItemsData.buffs.some(b => b.id === item.id)
      const isDebuff = storeItemsData.debuffs.some(d => d.id === item.id)
      const isBuffOrDebuff = isBuff || isDebuff
      
      if (updatedStoreItems[item.id]) {
        // Item exists - ensure it has all required properties, preserve enabled state
        updatedStoreItems[item.id] = {
          enabled: updatedStoreItems[item.id].enabled, // Preserve current enabled state
          cost: updatedStoreItems[item.id].cost ?? item.cost,
          quantity: isTool 
            ? (updatedStoreItems[item.id].quantity ?? ('quantity' in item ? (item as any).quantity : undefined))
            : undefined,
          duration: isBuffOrDebuff
            ? (updatedStoreItems[item.id].duration ?? ('duration' in item ? (item as any).duration : undefined))
            : undefined
        }
      } else {
        // Item not in storeItems - use current state from storeItems if available, otherwise default
        // This should rarely happen since useEffect initializes all items, but as a safeguard:
        updatedStoreItems[item.id] = {
          enabled: isIngredient ? false : true, // Ingredients default to disabled, others to enabled
          cost: item.cost,
          quantity: isTool && 'quantity' in item ? (item as any).quantity : undefined,
          duration: isBuffOrDebuff && 'duration' in item ? (item as any).duration : undefined
        }
      }
    })
    
    // Initialize storeItems for custom items if they don't exist
    customItems.forEach(item => {
      if (!updatedStoreItems[item.id]) {
        updatedStoreItems[item.id] = {
          enabled: true,
          cost: item.cost,
          quantity: item.type === 'tool' ? item.quantity : undefined,
          duration: (item.type === 'buff' || item.type === 'debuff') ? item.duration : undefined
        }
      } else {
        // Ensure custom item has all properties
        // For quantity: preserve existing value if set, otherwise use item's quantity (which can be undefined for unlimited)
        updatedStoreItems[item.id] = {
          ...updatedStoreItems[item.id],
          cost: updatedStoreItems[item.id].cost ?? item.cost,
          quantity: item.type === 'tool' 
            ? (updatedStoreItems[item.id].quantity !== undefined 
                ? updatedStoreItems[item.id].quantity 
                : item.quantity) // item.quantity can be undefined for unlimited
            : undefined,
          duration: (item.type === 'buff' || item.type === 'debuff')
            ? (updatedStoreItems[item.id].duration !== undefined
                ? updatedStoreItems[item.id].duration
                : item.duration)
            : undefined
        }
      }
    })
    
    onSave({
      gameTime,
      startingPoints,
      storeItems: updatedStoreItems,
      customItems
    })
  }

  const handleReset = () => {
    setGameTime(defaultGameTime)
    setStartingPoints(defaultStartingPoints)
    const items: GameSettings['storeItems'] = {}
    const allItems = [
      ...gameItems.ingredients,
      ...gameItems.tools,
      ...storeItemsData.buffs,
      ...storeItemsData.debuffs
    ]
    allItems.forEach(item => {
      const isTool = 'quantity' in item || gameItems.tools.some(t => t.id === item.id)
      items[item.id] = {
        enabled: true,
        cost: item.cost,
        quantity: isTool && 'quantity' in item ? (item as any).quantity : undefined
      }
    })
    setStoreItems(items)
    setCustomItems([]) // Clear custom items on reset
  }

  const getItemById = (id: string) => {
    // First check default items
    const allDefaultItems = [
      ...gameItems.ingredients,
      ...gameItems.tools,
      ...storeItemsData.buffs,
      ...storeItemsData.debuffs
    ]
    const defaultItem = allDefaultItems.find(item => item.id === id)
    if (defaultItem) return defaultItem
    
    // Then check custom items
    return customItems.find(item => item.id === id)
  }

  const renderItemRow = (itemId: string) => {
    const item = getItemById(itemId)
    if (!item) return null

    // Check item type first (for custom items)
    const itemType = (item as any).type
    // Check if item is a buff/debuff - either from default items or custom items
    const isBuff = itemType === 'buff' || storeItemsData.buffs.some(b => b.id === itemId)
    const isDebuff = itemType === 'debuff' || storeItemsData.debuffs.some(d => d.id === itemId)
    const isBuffOrDebuff = isBuff || isDebuff
    // Check if item is a tool - only if it's not a buff/debuff
    const isTool = !isBuffOrDebuff && ('quantity' in item || gameItems.tools.some(t => t.id === itemId) || itemType === 'tool')
    const itemSetting = storeItems[itemId] || { 
      enabled: true, 
      cost: item.cost,
      quantity: isTool && 'quantity' in item ? (item as any).quantity : undefined,
      duration: isBuffOrDebuff && 'duration' in item ? (item as any).duration : undefined
    }
    const displayCost = itemSetting.cost ?? item.cost
    const defaultQuantity = isTool && 'quantity' in item ? (item as any).quantity : undefined
    const displayQuantity = itemSetting.quantity ?? defaultQuantity ?? undefined // undefined means unlimited
    const defaultDuration = isBuffOrDebuff && 'duration' in item ? (item as any).duration : undefined
    const displayDuration = itemSetting.duration ?? defaultDuration ?? undefined

    return (
      <Box key={itemId} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1, flexWrap: 'wrap' }}>
        <FormControlLabel
          control={
            <Switch
              checked={itemSetting.enabled}
              onChange={() => handleItemToggle(itemId)}
            />
          }
          label={item.name}
          sx={{ flex: 1, minWidth: 150 }}
        />
        {itemSetting.enabled && (
          <>
            <TextField
              type="number"
              label="Cost"
              value={displayCost}
              onChange={(e) => handleCostChange(itemId, parseInt(e.target.value) || 0)}
              size="small"
              sx={{ width: 100 }}
              inputProps={{ min: 1 }}
            />
            {isTool && (
              <TextField
                type="number"
                label="Quantity"
                value={displayQuantity ?? ''}
                onChange={(e) => {
                  const value = e.target.value.trim()
                  if (value === '') {
                    handleQuantityChange(itemId, '')
                  } else {
                    const numValue = parseInt(value)
                    handleQuantityChange(itemId, isNaN(numValue) ? 0 : numValue)
                  }
                }}
                size="small"
                sx={{ width: 100 }}
                inputProps={{ min: 1 }}
              />
            )}
            {isBuffOrDebuff && (
              <TextField
                type="number"
                label="Duration (seconds)"
                value={displayDuration ?? ''}
                onChange={(e) => {
                  const value = e.target.value.trim()
                  if (value === '') {
                    handleDurationChange(itemId, '')
                  } else {
                    const numValue = parseInt(value)
                    handleDurationChange(itemId, isNaN(numValue) ? 0 : numValue)
                  }
                }}
                size="small"
                sx={{ width: 120 }}
                inputProps={{ min: 0 }}
              />
            )}
          </>
        )}
      </Box>
    )
  }

  return (
    <Card>
      <CardHeader
        avatar={<SettingsIcon />}
        title="Game Settings"
        subheader="Configure game parameters before starting"
      />
      <CardContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Basic Settings */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Basic Settings
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Game Time (minutes)"
                  value={gameTime}
                  onChange={(e) => setGameTime(parseInt(e.target.value) || defaultGameTime)}
                  inputProps={{ min: 1 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Starting Points"
                  value={startingPoints}
                  onChange={(e) => setStartingPoints(parseInt(e.target.value) || defaultStartingPoints)}
                  inputProps={{ min: 0 }}
                />
              </Grid>
            </Grid>
          </Box>

          <Divider />

          {/* Store Items Configuration */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Store Items
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Enable/disable items and customize their costs
            </Typography>

            {/* Ingredients */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">Ingredients</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box>
                  {gameItems.ingredients.map(ingredient =>
                    renderItemRow(ingredient.id)
                  )}
                </Box>
              </AccordionDetails>
            </Accordion>

            {/* Tools */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">Tools</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box>
                  {gameItems.tools.map(tool =>
                    renderItemRow(tool.id)
                  )}
                </Box>
              </AccordionDetails>
            </Accordion>

            {/* Buffs */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">Buffs</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box>
                  {storeItemsData.buffs.map(buff =>
                    renderItemRow(buff.id)
                  )}
                </Box>
              </AccordionDetails>
            </Accordion>

            {/* Debuffs */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">Debuffs</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box>
                  {storeItemsData.debuffs.map(debuff =>
                    renderItemRow(debuff.id)
                  )}
                </Box>
              </AccordionDetails>
            </Accordion>

            {/* Custom Items */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">Custom Items</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box>
                  {customItems.map((item, index) => (
                    <Box key={item.id} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle2" sx={{ textTransform: 'capitalize' }}>
                          {item.type}: {item.name}
                        </Typography>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            const newCustomItems = customItems.filter((_, i) => i !== index)
                            setCustomItems(newCustomItems)
                            // Remove from storeItems
                            const newStoreItems = { ...storeItems }
                            delete newStoreItems[item.id]
                            setStoreItems(newStoreItems)
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                      {renderItemRow(item.id)}
                    </Box>
                  ))}
                  <AddCustomItemForm
                    onAdd={(item) => {
                      const newItem: CustomItem = {
                        ...item,
                        id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                      }
                      setCustomItems([...customItems, newItem])
                      setStoreItems({
                        ...storeItems,
                        [newItem.id]: {
                          enabled: true,
                          cost: newItem.cost,
                          quantity: newItem.type === 'tool' ? newItem.quantity : undefined,
                          duration: (newItem.type === 'buff' || newItem.type === 'debuff') ? newItem.duration : undefined
                        }
                      })
                    }}
                  />
                </Box>
              </AccordionDetails>
            </Accordion>
          </Box>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button variant="outlined" onClick={handleReset}>
              Reset to Defaults
            </Button>
            <Button variant="contained" color="primary" onClick={handleSave}>
              Save Settings
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

// Component for adding custom items
function AddCustomItemForm({ onAdd }: { onAdd: (item: Omit<CustomItem, 'id'>) => void }) {
  const [type, setType] = useState<'ingredient' | 'tool' | 'buff' | 'debuff'>('ingredient')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [effect, setEffect] = useState('')
  const [cost, setCost] = useState(10)
  const [quantity, setQuantity] = useState<number | undefined>(undefined)
  const [duration, setDuration] = useState<number>(0)
  const [showForm, setShowForm] = useState(false)

  const handleSubmit = () => {
    if (!name.trim() || cost <= 0) {
      alert('Please fill in name and cost (must be > 0)')
      return
    }

    onAdd({
      name: name.trim(),
      description: description.trim() || undefined,
      effect: effect.trim() || undefined,
      cost,
      quantity: type === 'tool' ? quantity : undefined, // undefined means unlimited
      duration: (type === 'buff' || type === 'debuff') ? duration : undefined,
      icon: 'LocalGroceryStoreIcon', // Default icon
      type
    })

    // Reset form
    setName('')
    setDescription('')
    setEffect('')
    setCost(10)
    setQuantity(undefined)
    setDuration(0)
    setShowForm(false)
  }

  if (!showForm) {
    return (
      <Button
        variant="outlined"
        startIcon={<AddIcon />}
        onClick={() => setShowForm(true)}
        sx={{ mt: 2 }}
      >
        Add Custom Item
      </Button>
    )
  }

  return (
    <Box sx={{ mt: 2, p: 2, border: '1px dashed #ccc', borderRadius: 1 }}>
      <Typography variant="subtitle2" gutterBottom>
        Add Custom Item
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            select
            label="Type"
            value={type}
            onChange={(e) => setType(e.target.value as CustomItem['type'])}
            SelectProps={{ native: true }}
            size="small"
          >
            <option value="ingredient">Ingredient</option>
            <option value="tool">Tool</option>
            <option value="buff">Buff</option>
            <option value="debuff">Debuff</option>
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            size="small"
            required
          />
        </Grid>
        {(type === 'tool' || type === 'buff' || type === 'debuff') && (
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              size="small"
              multiline
              rows={2}
            />
          </Grid>
        )}
        {(type === 'tool' || type === 'buff' || type === 'debuff') && (
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Effect"
              value={effect}
              onChange={(e) => setEffect(e.target.value)}
              size="small"
            />
          </Grid>
        )}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            type="number"
            label="Cost"
            value={cost}
            onChange={(e) => setCost(parseInt(e.target.value) || 0)}
            size="small"
            inputProps={{ min: 1 }}
            required
          />
        </Grid>
        {type === 'tool' && (
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Quantity"
              value={quantity ?? ''}
              onChange={(e) => {
                const value = e.target.value.trim()
                if (value === '') {
                  setQuantity(undefined)
                } else {
                  const numValue = parseInt(value)
                  setQuantity(isNaN(numValue) ? undefined : numValue)
                }
              }}
              size="small"
              inputProps={{ min: 1 }}
              helperText="Leave empty for unlimited"
            />
          </Grid>
        )}
        {(type === 'buff' || type === 'debuff') && (
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Duration (seconds)"
              value={duration}
              onChange={(e) => {
                const value = e.target.value.trim()
                if (value === '') {
                  setDuration(0)
                } else {
                  const numValue = parseInt(value)
                  setDuration(isNaN(numValue) ? 0 : Math.max(0, numValue))
                }
              }}
              size="small"
              inputProps={{ min: 0 }}
              helperText="0 = one-time use"
            />
          </Grid>
        )}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="contained" onClick={handleSubmit} size="small">
              Add Item
            </Button>
            <Button variant="outlined" onClick={() => setShowForm(false)} size="small">
              Cancel
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  )
}

export default GameSettings
export type { GameSettings, CustomItem }

