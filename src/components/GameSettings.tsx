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
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Alert
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

interface AutomatedChallenge {
  id: string
  timeValue: number
  timeType: 'into_game' | 'left_in_game'
  challengeType: 'alphabet_typing' | 'quick_maths' | 'reflex_test' | 'color_scheme' | 'random'
  points: number
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
  automatedChallenges?: {
    enabled: boolean
    automationType?: 'time_based' | 'number_based'
    timeBasedChallenges?: AutomatedChallenge[]
    numberBasedConfig?: {
      numberOfChallenges: number
      startTime: number // in minutes
      endTime: number // in minutes
      challengeType: 'alphabet_typing' | 'quick_maths' | 'reflex_test' | 'color_scheme' | 'random'
      points: number
    }
  }
}

interface Recipe {
  id: string
  name: string
  image: string
  ingredients: Array<{ name: string; amount: string }>
  instructions: string[]
  timeToBake: number
  icings?: Array<{
    id: string
    name: string
    description?: string
    finish?: string
    ingredients: Array<{ name: string; amount: string }>
    instructions: string[]
    pros?: string
    cons?: string
  }>
}

interface GameSettingsProps {
  onSave: (settings: GameSettings) => void
  initialSettings?: GameSettings
  selectedRecipe?: Recipe | null
}

function GameSettings({ onSave, initialSettings, selectedRecipe }: GameSettingsProps) {
  const { gameType } = useGameSessionStore()
  const isMixingGame = gameType === 'Mixing Game' || gameType === 'Christmas Mix'
  const gameItems = isMixingGame ? storeItemsData.mixing : storeItemsData.baking
  
  // Default values
  const defaultGameTime = 60 // 60 minutes
  const defaultStartingPoints = 1000

  // Helper function to match recipe ingredient names to store item names (case-insensitive, partial match)
  const matchIngredientToStoreItem = (recipeIngredientName: string): string | null => {
    const normalizedRecipeName = recipeIngredientName.toLowerCase()
    // Remove common words that might interfere with matching
    const cleanedRecipeName = normalizedRecipeName
      .replace(/\s*\(optional[^)]*\)/gi, '') // Remove "(optional, to taste)" etc
      .replace(/\s*for garnish\s*/gi, '') // Remove "for garnish"
      .replace(/\s*\(optional\)\s*/gi, '') // Remove "(optional)"
      .trim()
    
    // Try to find a matching ingredient in the store
    for (const ingredient of gameItems.ingredients) {
      const normalizedStoreName = ingredient.name.toLowerCase()
      
      // Check for exact match
      if (cleanedRecipeName === normalizedStoreName) {
        return ingredient.id
      }
      
      // Check if recipe ingredient contains store name or vice versa
      // But be more strict - avoid matching partial words (e.g., "lemon" in "lemon peel" shouldn't match "Lemon Juice")
      // Only match if it's a complete word match or exact substring match
      const recipeWords = cleanedRecipeName.split(/\s+/)
      const storeWords = normalizedStoreName.split(/\s+/)
      
      // Prevent matching "peel" items with "juice" items (e.g., "lemon peel" shouldn't match "Lemon Juice")
      const recipeHasPeel = cleanedRecipeName.includes('peel')
      const storeHasPeel = normalizedStoreName.includes('peel')
      const recipeHasJuice = cleanedRecipeName.includes('juice')
      const storeHasJuice = normalizedStoreName.includes('juice')
      
      // Don't match if one has "peel" and the other has "juice" (they're different things)
      if ((recipeHasPeel && storeHasJuice) || (recipeHasJuice && storeHasPeel)) {
        continue // Skip this ingredient, try next one
      }
      
      // For juice items, require that the recipe specifically mentions that type of juice
      // e.g., "Lime Juice" should only match if recipe has "lime juice", not just any juice
      if (storeHasJuice && !recipeHasJuice) {
        continue // Skip - recipe doesn't mention juice, so don't match any juice items
      }
      
      // If store item is a juice, check that the recipe mentions the specific juice type
      if (storeHasJuice && recipeHasJuice) {
        // Extract the juice type from store name (e.g., "lime" from "lime juice")
        const juiceTypeMatch = normalizedStoreName.match(/^(\w+)\s+juice/)
        if (juiceTypeMatch) {
          const juiceType = juiceTypeMatch[1] // e.g., "lime", "lemon", "cranberry"
          // Only match if recipe contains this specific juice type
          if (!cleanedRecipeName.includes(juiceType)) {
            continue // Skip - recipe doesn't mention this specific juice type
          }
        }
      }
      
      // Check for exact match first
      if (cleanedRecipeName === normalizedStoreName) {
        return ingredient.id
      }
      
      // Check if all words in store name are found in recipe (for multi-word matches)
      // But filter out common words like "or", "and", "fresh", "frozen" that might cause false matches
      const significantStoreWords = storeWords.filter(word => 
        word.length > 2 && !['or', 'and', 'fresh', 'frozen', 'optional'].includes(word)
      )
      if (significantStoreWords.length > 0) {
        const allStoreWordsInRecipe = significantStoreWords.every(word => cleanedRecipeName.includes(word))
        if (allStoreWordsInRecipe) {
          // Additional check: if store item is a juice, make sure recipe mentions the specific juice type
          if (storeHasJuice) {
            const juiceTypeMatch = normalizedStoreName.match(/^(\w+)\s+juice/)
            if (juiceTypeMatch) {
              const juiceType = juiceTypeMatch[1]
              if (!cleanedRecipeName.includes(juiceType)) {
                continue // Skip - recipe doesn't mention this specific juice type
              }
            }
          }
          return ingredient.id
        }
      }
      
      // Check if all significant words in recipe are found in store name (for multi-word matches)
      const significantRecipeWords = recipeWords.filter(word => 
        word.length > 2 && !['or', 'and', 'fresh', 'frozen', 'optional'].includes(word)
      )
      if (significantRecipeWords.length > 0) {
        const allRecipeWordsInStore = significantRecipeWords.every(word => normalizedStoreName.includes(word))
        if (allRecipeWordsInStore) {
          return ingredient.id
        }
      }
      
      // Fallback: simple substring match only if one is a single word
      if (recipeWords.length === 1 && cleanedRecipeName === normalizedStoreName) {
        return ingredient.id
      }
      if (storeWords.length === 1 && cleanedRecipeName === normalizedStoreName) {
        return ingredient.id
      }
      
      // Special handling for variations
      // "Cranberry juice" matches "Cranberry Juice"
      if (cleanedRecipeName.includes('cranberry') && normalizedStoreName.includes('cranberry')) {
        if (cleanedRecipeName.includes('juice') && normalizedStoreName.includes('juice')) {
          return ingredient.id
        }
        // "Fresh or frozen cranberries" matches "Fresh Cranberries"
        if ((cleanedRecipeName.includes('fresh') || cleanedRecipeName.includes('frozen')) && 
            normalizedStoreName.includes('fresh')) {
          return ingredient.id
        }
      }
      
      // "Orange peel or lemon peel" matches "Orange Peel" or "Lemon Peel"
      // Only match if both recipe and store item contain "peel" to avoid matching "Lemon Juice" with "lemon peel"
      if (cleanedRecipeName.includes('peel') && normalizedStoreName.includes('peel')) {
        if ((cleanedRecipeName.includes('orange') && normalizedStoreName.includes('orange')) ||
            (cleanedRecipeName.includes('lemon') && normalizedStoreName.includes('lemon'))) {
          return ingredient.id
        }
      }
      
      // "Peach schnapps" matches "Peach Schnapps"
      if (cleanedRecipeName.includes('peach') && cleanedRecipeName.includes('schnapps') &&
          normalizedStoreName.includes('peach') && normalizedStoreName.includes('schnapps')) {
        return ingredient.id
      }
      
      // "Simple syrup" matches "Simple Syrup"
      if (cleanedRecipeName.includes('simple') && cleanedRecipeName.includes('syrup') &&
          normalizedStoreName.includes('simple') && normalizedStoreName.includes('syrup')) {
        return ingredient.id
      }
      
      // "Rosemary sprig" matches "Rosemary Sprig"
      if (cleanedRecipeName.includes('rosemary') && normalizedStoreName.includes('rosemary')) {
        return ingredient.id
      }
    }
    return null
  }

  // Initialize settings with defaults or provided values
  const [gameTime, setGameTime] = useState<number>(() => {
    // Prioritize initialSettings (saved settings) over recipe defaults
    if (initialSettings?.gameTime !== undefined) {
      return initialSettings.gameTime
    }
    // If recipe is selected and no saved settings, use its timeToBake
    if (selectedRecipe) {
      return selectedRecipe.timeToBake
    }
    return defaultGameTime
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
          enabled: !isTool, // Tools default to disabled, others to enabled
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
            enabled: item.type !== 'tool', // Tools default to disabled, others to enabled
            cost: item.cost,
            quantity: item.type === 'tool' ? item.quantity : undefined,
            duration: (item.type === 'buff' || item.type === 'debuff') ? item.duration : undefined
          }
        }
      })
    }
    
    // If a recipe is selected and it's a baking game or Christmas Mix, auto-toggle ingredients needed for that recipe
    if (selectedRecipe && (gameType === 'Baking Game' || gameType === 'Christmas Mix' || gameType === 'Christmas Bake')) {
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
      
      // For Christmas Bake, also enable ingredients from icing recipes
      if (gameType === 'Christmas Bake' && selectedRecipe.icings && Array.isArray(selectedRecipe.icings)) {
        selectedRecipe.icings.forEach((icing: any) => {
          if (icing.ingredients && Array.isArray(icing.ingredients)) {
            icing.ingredients.forEach((icingIngredient: { name: string; amount: string }) => {
              const matchedItemId = matchIngredientToStoreItem(icingIngredient.name)
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
        })
      }
    }
    
    return items
  })
  const [customItems, setCustomItems] = useState<CustomItem[]>(
    initialSettings?.customItems || []
  )
  const [automatedChallengesEnabled, setAutomatedChallengesEnabled] = useState<boolean>(
    initialSettings?.automatedChallenges?.enabled || false
  )
  const [automationType, setAutomationType] = useState<'time_based' | 'number_based'>(
    initialSettings?.automatedChallenges?.automationType || 'time_based'
  )
  const [timeBasedChallenges, setTimeBasedChallenges] = useState<AutomatedChallenge[]>(
    initialSettings?.automatedChallenges?.timeBasedChallenges || []
  )
  const [numberOfChallenges, setNumberOfChallenges] = useState<number>(
    initialSettings?.automatedChallenges?.numberBasedConfig?.numberOfChallenges || 3
  )
  const [numberBasedStartTime, setNumberBasedStartTime] = useState<number>(
    initialSettings?.automatedChallenges?.numberBasedConfig?.startTime || 10
  )
  const [numberBasedEndTime, setNumberBasedEndTime] = useState<number>(
    initialSettings?.automatedChallenges?.numberBasedConfig?.endTime || 50
  )
  const [numberBasedChallengeType, setNumberBasedChallengeType] = useState<'alphabet_typing' | 'quick_maths' | 'reflex_test' | 'color_scheme' | 'random'>(
    initialSettings?.automatedChallenges?.numberBasedConfig?.challengeType || 'random'
  )
  const [numberBasedPoints, setNumberBasedPoints] = useState<number>(
    initialSettings?.automatedChallenges?.numberBasedConfig?.points || 100
  )
  const [timeBasedError, setTimeBasedError] = useState<string | null>(null)
  const [numberBasedError, setNumberBasedError] = useState<string | null>(null)

  // Update gameTime when recipe changes
  // But only if we don't have saved settings (initialSettings) to preserve user modifications
  useEffect(() => {
    if (selectedRecipe && !initialSettings?.gameTime) {
      setGameTime(selectedRecipe.timeToBake)
    }
  }, [selectedRecipe, initialSettings?.gameTime])

  // Update storeItems when recipe changes (for baking games and Christmas Mix)
  // This effect runs when selectedRecipe changes OR when component mounts with a recipe
  // But only if we don't have saved settings (initialSettings.storeItems) to preserve user modifications
  useEffect(() => {
    // Only apply recipe-based ingredient toggling if we don't have saved settings
    // This prevents overwriting user modifications when reopening the dialog
    if (selectedRecipe && (gameType === 'Baking Game' || gameType === 'Christmas Mix' || gameType === 'Christmas Bake') && !initialSettings?.storeItems) {
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
        
        // For Christmas Bake, also enable ingredients from icing recipes
        if (gameType === 'Christmas Bake' && selectedRecipe.icings && Array.isArray(selectedRecipe.icings)) {
          selectedRecipe.icings.forEach((icing: any) => {
            if (icing.ingredients && Array.isArray(icing.ingredients)) {
              icing.ingredients.forEach((icingIngredient: { name: string; amount: string }) => {
                const matchedItemId = matchIngredientToStoreItem(icingIngredient.name)
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
            }
          })
        }
        
        return updated
      })
    } else if (!selectedRecipe && (gameType === 'Baking Game' || gameType === 'Christmas Mix' || gameType === 'Christmas Bake') && !initialSettings?.storeItems) {
      // If no recipe is selected and no saved settings, ensure all ingredients are enabled
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
  }, [selectedRecipe, gameType, gameItems.ingredients, initialSettings?.storeItems])

  // Validate time-based challenges are at least 5 minutes apart
  useEffect(() => {
    if (automationType === 'time_based' && timeBasedChallenges.length > 0) {
      const errors: string[] = []
      
      // Convert all challenges to "minutes into game" for comparison
      const challengeTimes: Array<{ time: number; index: number }> = []
      timeBasedChallenges.forEach((challenge, index) => {
        let time: number
        if (challenge.timeType === 'into_game') {
          time = challenge.timeValue
        } else {
          // Convert "minutes left" to "minutes into game"
          time = gameTime - challenge.timeValue
        }
        challengeTimes.push({ time, index })
      })
      
      // Sort by time
      challengeTimes.sort((a, b) => a.time - b.time)
      
      // Check spacing between consecutive challenges
      for (let i = 0; i < challengeTimes.length - 1; i++) {
        const timeDiff = Math.abs(challengeTimes[i + 1].time - challengeTimes[i].time)
        if (timeDiff < 5) {
          errors.push(`Challenges ${challengeTimes[i].index + 1} and ${challengeTimes[i + 1].index + 1} are too close (${timeDiff} minutes apart). Challenges must be at least 5 minutes apart.`)
        }
      }
      
      if (errors.length > 0) {
        setTimeBasedError(errors[0]) // Show first error
      } else {
        setTimeBasedError(null)
      }
    } else {
      setTimeBasedError(null)
    }
  }, [timeBasedChallenges, automationType, gameTime])

  // Validate number-based challenges can fit in the time range
  useEffect(() => {
    if (automationType === 'number_based') {
      const timeRange = numberBasedEndTime - numberBasedStartTime
      const minTimeNeeded = (numberOfChallenges - 1) * 5 // Each challenge needs 5 minutes spacing
      
      if (timeRange < minTimeNeeded) {
        setNumberBasedError(`Too many challenges for the time range. With ${numberOfChallenges} challenges, you need at least ${minTimeNeeded} minutes between start and end time.`)
      } else {
        setNumberBasedError(null)
      }
    } else {
      setNumberBasedError(null)
    }
  }, [automationType, numberOfChallenges, numberBasedStartTime, numberBasedEndTime])

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
          enabled: isIngredient ? false : !isTool, // Ingredients and tools default to disabled, others to enabled
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
          enabled: item.type !== 'tool', // Tools default to disabled, others to enabled
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
    
    // Validate before saving
    if (automatedChallengesEnabled) {
      if (automationType === 'time_based' && timeBasedError) {
        alert('Please fix the time-based challenge errors before saving.')
        return
      }
      if (automationType === 'number_based' && numberBasedError) {
        alert('Please fix the number-based challenge errors before saving.')
        return
      }
    }

    onSave({
      gameTime,
      startingPoints,
      storeItems: updatedStoreItems,
      customItems,
      automatedChallenges: {
        enabled: automatedChallengesEnabled,
        automationType: automatedChallengesEnabled ? automationType : undefined,
        timeBasedChallenges: automatedChallengesEnabled && automationType === 'time_based' ? timeBasedChallenges : undefined,
        numberBasedConfig: automatedChallengesEnabled && automationType === 'number_based' ? {
          numberOfChallenges,
          startTime: numberBasedStartTime,
          endTime: numberBasedEndTime,
          challengeType: numberBasedChallengeType,
          points: numberBasedPoints
        } : undefined
      }
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
        enabled: isTool ? false : true, // Tools default to disabled, others to enabled
        cost: item.cost,
        quantity: isTool && 'quantity' in item ? (item as any).quantity : undefined
      }
    })
    setStoreItems(items)
    setCustomItems([]) // Clear custom items on reset
    setAutomatedChallengesEnabled(false)
    setAutomationType('time_based')
    setTimeBasedChallenges([])
    setNumberOfChallenges(3)
    setNumberBasedStartTime(10)
    setNumberBasedEndTime(50)
    setNumberBasedChallengeType('random')
    setNumberBasedPoints(100)
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
      enabled: isTool ? false : true, // Tools default to disabled, others to enabled
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
                  onChange={(e) => {
                    const value = parseInt(e.target.value)
                    if (isNaN(value)) {
                      setStartingPoints(defaultStartingPoints)
                    } else {
                      setStartingPoints(Math.max(0, value))
                    }
                  }}
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
                  {(() => {
                    // For Mixing Game and Christmas Mix, organize into liquors and other ingredients
                    if (isMixingGame) {
                      // Define liquors (alcoholic spirits) - check for exact matches or contains
                      const liquorKeywords = ['vodka', 'gin', 'rum', 'tequila', 'triple sec', 'bourbon', 'whiskey', 'schnapps']
                      
                      // Helper function to check if an ingredient is a liquor
                      const isLiquor = (ingredientName: string): boolean => {
                        const lowerName = ingredientName.toLowerCase()
                        return liquorKeywords.some(keyword => lowerName.includes(keyword))
                      }
                      
                      // Separate ingredients into liquors and others
                      const liquors = gameItems.ingredients
                        .filter(ing => isLiquor(ing.name))
                        .sort((a, b) => a.name.localeCompare(b.name))
                      
                      const otherIngredients = gameItems.ingredients
                        .filter(ing => !isLiquor(ing.name))
                        .sort((a, b) => a.name.localeCompare(b.name))
                      
                      return (
                        <>
                          {/* Liquors Section */}
                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mt: 1, mb: 1 }}>
                            Liquors
                          </Typography>
                          {liquors.map(ingredient =>
                            renderItemRow(ingredient.id)
                          )}
                          
                          {/* Other Ingredients Section */}
                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mt: 2, mb: 1 }}>
                            Other Ingredients
                          </Typography>
                          {otherIngredients.map(ingredient =>
                            renderItemRow(ingredient.id)
                          )}
                        </>
                      )
                    } else {
                      // For Baking Game, just sort alphabetically
                      const sortedIngredients = [...gameItems.ingredients].sort((a, b) => 
                        a.name.localeCompare(b.name)
                      )
                      return sortedIngredients.map(ingredient =>
                        renderItemRow(ingredient.id)
                      )
                    }
                  })()}
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
                          enabled: newItem.type === 'tool' ? false : true, // Tools default to disabled, others to enabled
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

          <Divider />

          {/* Automated Challenges */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Automated Challenges
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Automatically trigger challenges during the game
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={automatedChallengesEnabled}
                  onChange={(e) => setAutomatedChallengesEnabled(e.target.checked)}
                />
              }
              label="Enable Automated Challenges"
              sx={{ mb: 2 }}
            />

            {automatedChallengesEnabled && (
              <Box sx={{ mt: 2 }}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Automation Type</InputLabel>
                  <Select
                    value={automationType}
                    label="Automation Type"
                    onChange={(e) => setAutomationType(e.target.value as 'time_based' | 'number_based')}
                  >
                    <MenuItem value="time_based">Time-Based</MenuItem>
                    <MenuItem value="number_based">Number-Based</MenuItem>
                  </Select>
                </FormControl>

                {automationType === 'time_based' && (
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="subtitle2">
                        Time-Based Challenges
                      </Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => {
                          const newChallenge: AutomatedChallenge = {
                            id: `challenge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                            timeValue: 5,
                            timeType: 'into_game',
                            challengeType: 'random',
                            points: 100
                          }
                          setTimeBasedChallenges([...timeBasedChallenges, newChallenge])
                        }}
                      >
                        Add Challenge
                      </Button>
                    </Box>

                    {timeBasedError && (
                      <Alert severity="error" sx={{ mb: 2 }}>
                        {timeBasedError}
                      </Alert>
                    )}
                    {timeBasedChallenges.length === 0 ? (
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 2 }}>
                        No challenges configured. Click "Add Challenge" to add one.
                      </Typography>
                    ) : (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {timeBasedChallenges.map((challenge, index) => (
                          <Box
                            key={challenge.id}
                            sx={{
                              p: 2,
                              border: '1px solid #e0e0e0',
                              borderRadius: 1,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 2
                            }}
                          >
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="subtitle2">
                                Challenge {index + 1}
                              </Typography>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => {
                                  setTimeBasedChallenges(timeBasedChallenges.filter((_, i) => i !== index))
                                }}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Box>

                            <Grid container spacing={2}>
                              <Grid item xs={12} sm={6}>
                                <TextField
                                  fullWidth
                                  type="number"
                                  label="Time Value"
                                  value={challenge.timeValue}
                                  onChange={(e) => {
                                    const newChallenges = [...timeBasedChallenges]
                                    newChallenges[index].timeValue = parseInt(e.target.value) || 0
                                    setTimeBasedChallenges(newChallenges)
                                    // Validation will happen in useEffect
                                  }}
                                  error={timeBasedError !== null && timeBasedError.includes(`Challenge ${index + 1}`)}
                                  helperText={timeBasedError && timeBasedError.includes(`Challenge ${index + 1}`) ? timeBasedError : undefined}
                                  size="small"
                                  inputProps={{ min: 0 }}
                                />
                              </Grid>
                              <Grid item xs={12} sm={6}>
                                <FormControl fullWidth size="small">
                                  <InputLabel>Time Type</InputLabel>
                                  <Select
                                    value={challenge.timeType}
                                    label="Time Type"
                                    onChange={(e) => {
                                      const newChallenges = [...timeBasedChallenges]
                                      newChallenges[index].timeType = e.target.value as 'into_game' | 'left_in_game'
                                      setTimeBasedChallenges(newChallenges)
                                      // Validation will happen in useEffect
                                    }}
                                  >
                                    <MenuItem value="into_game">minutes into the game</MenuItem>
                                    <MenuItem value="left_in_game">minutes left in the game</MenuItem>
                                  </Select>
                                </FormControl>
                              </Grid>
                              <Grid item xs={12} sm={6}>
                                <FormControl fullWidth size="small">
                                  <InputLabel>Challenge Type</InputLabel>
                                  <Select
                                    value={challenge.challengeType}
                                    label="Challenge Type"
                                    onChange={(e) => {
                                      const newChallenges = [...timeBasedChallenges]
                                      newChallenges[index].challengeType = e.target.value as AutomatedChallenge['challengeType']
                                      setTimeBasedChallenges(newChallenges)
                                    }}
                                  >
                                    <MenuItem value="random">Random</MenuItem>
                                    <MenuItem value="alphabet_typing">Type the Alphabet</MenuItem>
                                    <MenuItem value="quick_maths">Quick Maths</MenuItem>
                                    <MenuItem value="reflex_test">Reflex Test</MenuItem>
                                    <MenuItem value="color_scheme">Color Scheme</MenuItem>
                                  </Select>
                                </FormControl>
                              </Grid>
                              <Grid item xs={12} sm={6}>
                                <TextField
                                  fullWidth
                                  type="number"
                                  label="Points for Winner"
                                  value={challenge.points}
                                  onChange={(e) => {
                                    const newChallenges = [...timeBasedChallenges]
                                    newChallenges[index].points = parseInt(e.target.value) || 0
                                    setTimeBasedChallenges(newChallenges)
                                  }}
                                  size="small"
                                  inputProps={{ min: 1 }}
                                />
                              </Grid>
                            </Grid>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Box>
                )}

                {automationType === 'number_based' && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 2 }}>
                      Number-Based Challenges
                    </Typography>
                    {numberBasedError && (
                      <Alert severity="error" sx={{ mb: 2 }}>
                        {numberBasedError}
                      </Alert>
                    )}
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          type="number"
                          label="Number of Challenges"
                          value={numberOfChallenges}
                          onChange={(e) => setNumberOfChallenges(Math.max(1, parseInt(e.target.value) || 1))}
                          size="small"
                          inputProps={{ min: 1 }}
                          helperText="Number of automated challenges that will occur during the game"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <Typography gutterBottom>
                          Start Time: {numberBasedStartTime} minutes
                        </Typography>
                        <Slider
                          value={numberBasedStartTime}
                          onChange={(_, newValue) => {
                            const value = Array.isArray(newValue) ? newValue[0] : newValue
                            setNumberBasedStartTime(Math.min(value, numberBasedEndTime))
                          }}
                          min={0}
                          max={gameTime}
                          step={1}
                          marks={[
                            { value: 0, label: '0' },
                            { value: gameTime, label: `${gameTime}` }
                          ]}
                          valueLabelDisplay="auto"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <Typography gutterBottom>
                          End Time: {numberBasedEndTime} minutes
                        </Typography>
                        <Slider
                          value={numberBasedEndTime}
                          onChange={(_, newValue) => {
                            const value = Array.isArray(newValue) ? newValue[0] : newValue
                            setNumberBasedEndTime(Math.max(value, numberBasedStartTime))
                          }}
                          min={0}
                          max={gameTime}
                          step={1}
                          marks={[
                            { value: 0, label: '0' },
                            { value: gameTime, label: `${gameTime}` }
                          ]}
                          valueLabelDisplay="auto"
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                          Challenges will occur randomly between {numberBasedStartTime} and {numberBasedEndTime} minutes into the game
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Challenge Type</InputLabel>
                          <Select
                            value={numberBasedChallengeType}
                            label="Challenge Type"
                            onChange={(e) => setNumberBasedChallengeType(e.target.value as typeof numberBasedChallengeType)}
                          >
                            <MenuItem value="random">Random</MenuItem>
                            <MenuItem value="alphabet_typing">Type the Alphabet</MenuItem>
                            <MenuItem value="quick_maths">Quick Maths</MenuItem>
                            <MenuItem value="reflex_test">Reflex Test</MenuItem>
                            <MenuItem value="color_scheme">Color Scheme</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          type="number"
                          label="Points for Winner"
                          value={numberBasedPoints}
                          onChange={(e) => setNumberBasedPoints(Math.max(1, parseInt(e.target.value) || 1))}
                          size="small"
                          inputProps={{ min: 1 }}
                        />
                      </Grid>
                    </Grid>
                  </Box>
                )}
              </Box>
            )}
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

