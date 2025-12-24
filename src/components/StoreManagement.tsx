import { Typography, Box, Paper, TextField, Button, Grid, Card, CardContent, IconButton, Tooltip } from '@mui/material'
import { useState, useEffect, useMemo } from 'react'
import { useGameSessionStore } from '@/stores/gameSessionStore'
import { serverEvents, clientEvents } from '@/types/events'
import { ITEM_TYPE_TOOL } from '@/constants'
import storeItemsData from '@/data/storeItems.json'
import BuildIcon from '@mui/icons-material/Build'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import SaveIcon from '@mui/icons-material/Save'

interface StoreItemData {
  id: string
  name: string
  description?: string
  cost: number
  icon: string
}

function StoreManagement() {
  const { socket, gameid, gameType, gameSettings, storeQuantities, isHost } = useGameSessionStore()
  const [quantityInputs, setQuantityInputs] = useState<Record<string, string>>({})
  const [hasChanges, setHasChanges] = useState(false)

  // Get items based on game type
  const isMixingGame = gameType === 'Mixing Game' || gameType === 'Christmas Mix'
  const gameItems = isMixingGame ? storeItemsData.mixing : storeItemsData.baking

  // Get custom items from settings
  interface CustomItem {
    id: string
    name: string
    type: 'ingredient' | 'tool' | 'buff' | 'debuff'
  }
  const customItems: CustomItem[] = (gameSettings?.customItems || []) as CustomItem[]

  // Helper to check if item is enabled
  const isItemEnabled = useMemo(() => {
    return (itemId: string): boolean => {
      if (!gameSettings || !gameSettings.storeItems) {
        return false
      }
      if (itemId in gameSettings.storeItems) {
        const itemConfig = gameSettings.storeItems[itemId]
        return itemConfig.enabled === true
      }
      return false
    }
  }, [gameSettings])

  // Get all tools (default + custom) that are enabled
  const tools = useMemo(() => {
    const defaultTools = (gameItems.tools as StoreItemData[])
      .filter(item => isItemEnabled(item.id))
      .map(item => ({
        id: item.id,
        name: item.name,
        description: item.description
      }))
    
    const customToolItems = customItems
      .filter(item => item.type === ITEM_TYPE_TOOL && isItemEnabled(item.id))
      .map(item => ({
        id: item.id,
        name: item.name,
        description: undefined
      }))
    
    return [...defaultTools, ...customToolItems]
  }, [gameSettings, isItemEnabled, gameItems, customItems])

  // Initialize quantity inputs from storeQuantities
  useEffect(() => {
    const inputs: Record<string, string> = {}
    tools.forEach(tool => {
      const currentQuantity = storeQuantities[tool.id]
      if (currentQuantity !== undefined) {
        inputs[tool.id] = currentQuantity.toString()
      } else {
        inputs[tool.id] = '' // Empty means unlimited
      }
    })
    setQuantityInputs(inputs)
    setHasChanges(false)
  }, [tools, storeQuantities])

  // Listen for store updates
  useEffect(() => {
    const handleStoreUpdate = () => {
      // Update will be handled by the store, just reset changes flag
      setHasChanges(false)
    }

    socket.on(serverEvents.storeUpdate, handleStoreUpdate)

    return () => {
      socket.off(serverEvents.storeUpdate, handleStoreUpdate)
    }
  }, [socket])

  if (!isHost()) {
    return null
  }

  const handleQuantityChange = (toolId: string, value: string) => {
    setQuantityInputs(prev => ({ ...prev, [toolId]: value }))
    setHasChanges(true)
  }

  const handleAdjustQuantity = (toolId: string, delta: number) => {
    const currentValue = quantityInputs[toolId] || '0'
    const currentNum = parseInt(currentValue) || 0
    const newValue = Math.max(0, currentNum + delta)
    setQuantityInputs(prev => ({ ...prev, [toolId]: newValue.toString() }))
    setHasChanges(true)
  }

  const handleSave = () => {
    if (!gameid) return

    // Build updates object
    const updates: Record<string, number | null> = {}
    tools.forEach(tool => {
      const inputValue = quantityInputs[tool.id] || ''
      if (inputValue === '') {
        // Empty means unlimited (remove from tracking)
        updates[tool.id] = null
      } else {
        const quantity = parseInt(inputValue)
        if (!isNaN(quantity) && quantity >= 0) {
          updates[tool.id] = quantity
        }
      }
    })

    // Emit update to server
    socket.emit(clientEvents.updateStoreQuantities, {
      gameid,
      updates
    })

    setHasChanges(false)
  }

  const getCurrentQuantity = (toolId: string): string => {
    const quantity = storeQuantities[toolId]
    if (quantity === undefined) {
      return 'Unlimited'
    }
    if (quantity <= 0) {
      return 'Sold Out'
    }
    return `${quantity} available`
  }

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          Store Management - Tools
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={!hasChanges}
        >
          Save Changes
        </Button>
      </Box>

      {tools.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          No tools are currently enabled in the store.
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {tools.map((tool) => {
            const currentQuantity = storeQuantities[tool.id]
            const isSoldOut = currentQuantity !== undefined && currentQuantity <= 0
            const inputValue = quantityInputs[tool.id] || ''

            return (
              <Grid item xs={12} sm={6} md={4} key={tool.id}>
                <Card 
                  variant="outlined"
                  sx={{ 
                    height: '100%',
                    borderColor: isSoldOut ? 'error.main' : 'divider',
                    borderWidth: isSoldOut ? 2 : 1
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <BuildIcon color="primary" />
                      <Typography variant="subtitle1" fontWeight="bold">
                        {tool.name}
                      </Typography>
                    </Box>
                    
                    {tool.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {tool.description}
                      </Typography>
                    )}

                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                      Current: {getCurrentQuantity(tool.id)}
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Tooltip title="Decrease quantity">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleAdjustQuantity(tool.id, -1)}
                          sx={{ border: '1px solid', borderColor: 'error.main' }}
                        >
                          <RemoveIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      
                      <TextField
                        size="small"
                        type="number"
                        placeholder="Unlimited"
                        value={inputValue}
                        onChange={(e) => handleQuantityChange(tool.id, e.target.value)}
                        sx={{ flex: 1 }}
                        inputProps={{ 
                          style: { textAlign: 'center' },
                          min: 0
                        }}
                        helperText={inputValue === '' ? 'Leave empty for unlimited' : 'Quantity available'}
                      />
                      
                      <Tooltip title="Increase quantity">
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => handleAdjustQuantity(tool.id, 1)}
                          sx={{ border: '1px solid', borderColor: 'success.main' }}
                        >
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>

                    {isSoldOut && (
                      <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
                        ⚠️ This item is currently sold out
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            )
          })}
        </Grid>
      )}
    </Paper>
  )
}

export default StoreManagement

