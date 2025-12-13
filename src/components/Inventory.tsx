import { Typography, Box, Card, CardContent, CardActions, Button, Grid, Chip, Select, MenuItem, FormControl, InputLabel } from '@mui/material'
import { useState } from 'react'
import { useGameSessionStore } from '@/stores/gameSessionStore'
import type { StoreItem } from './tabs'
import BuildIcon from '@mui/icons-material/Build'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import { HOST_USERNAME, ITEM_TYPE_TOOL, ITEM_TYPE_BUFF, ITEM_TYPE_DEBUFF } from '@/constants'

interface InventoryProps {
  onItemUsed?: () => void
}

function Inventory({ onItemUsed }: InventoryProps = {}) {
  const { inventory, players, username, useItem, showToast } = useGameSessionStore()
  const [selectedTarget, setSelectedTarget] = useState<string>('')

  // Group items by ID and count quantities
  const groupItemsByQuantity = (items: StoreItem[]) => {
    const grouped = new Map<string, { item: StoreItem; quantity: number }>()
    items.forEach(item => {
      const existing = grouped.get(item.id)
      if (existing) {
        existing.quantity += 1
      } else {
        grouped.set(item.id, { item, quantity: 1 })
      }
    })
    return Array.from(grouped.values())
  }

  const tools = inventory.filter(item => item.type === ITEM_TYPE_TOOL)
  const buffs = inventory.filter(item => item.type === ITEM_TYPE_BUFF)
  const debuffs = inventory.filter(item => item.type === ITEM_TYPE_DEBUFF)

  const groupedTools = groupItemsByQuantity(tools)
  const groupedBuffs = groupItemsByQuantity(buffs)
  const groupedDebuffs = groupItemsByQuantity(debuffs)

  const handleUseItem = (item: StoreItem) => {
    if (item.type === ITEM_TYPE_DEBUFF) {
      if (!selectedTarget) {
        showToast?.('Please select a target player', 'warning')
        return
      }
      if (selectedTarget === username) {
        showToast?.('You cannot use debuffs on yourself!', 'warning')
        return
      }
      if (selectedTarget === HOST_USERNAME) {
        showToast?.('You cannot use debuffs on the host!', 'warning')
        return
      }
      useItem(item, selectedTarget)
      setSelectedTarget('')
      // Close inventory dialog when debuff is used
      if (onItemUsed) {
        onItemUsed()
      }
    } else {
      useItem(item)
      // Close inventory dialog when buff is used
      if (onItemUsed && item.type === ITEM_TYPE_BUFF) {
        onItemUsed()
      }
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case ITEM_TYPE_TOOL: return 'default'
      case ITEM_TYPE_BUFF: return 'success'
      case ITEM_TYPE_DEBUFF: return 'error'
      default: return 'default'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case ITEM_TYPE_TOOL: return <BuildIcon />
      case ITEM_TYPE_BUFF: return <TrendingUpIcon />
      case ITEM_TYPE_DEBUFF: return <TrendingDownIcon />
      default: return <BuildIcon />
    }
  }

  // Helper to safely render icon - handles both React elements and serialized objects
  const renderIcon = (item: StoreItem) => {
    // Check if icon is a valid React element (has type property that's a function/string)
    if (item.icon && typeof item.icon === 'object' && 'type' in item.icon) {
      const iconType = (item.icon as any).type
      // If it's a serialized object (has props but type is not a function), use fallback
      if (typeof iconType !== 'function' && typeof iconType !== 'string') {
        return getTypeIcon(item.type)
      }
      // Otherwise, it should be a valid React element
      return item.icon
    }
    // Fallback to type-based icon
    return getTypeIcon(item.type)
  }

  if (inventory.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Your inventory is empty. Visit the store to buy items!
        </Typography>
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Your Inventory
      </Typography>

      {groupedTools.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Tools ({tools.length})
          </Typography>
          <Grid container spacing={2}>
            {groupedTools.map(({ item, quantity }, index) => (
              <Grid item xs={12} sm={6} md={4} key={`${item.id}-${index}`}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {renderIcon(item)}
                        <Typography variant="body1" sx={{ ml: 1 }}>
                          {item.name}
                          {quantity > 1 && (
                            <Chip 
                              label={`x${quantity}`} 
                              size="small" 
                              sx={{ ml: 1, height: 20 }} 
                              color="primary"
                            />
                          )}
                        </Typography>
                      </Box>
                      <Chip label="TOOL" color={getTypeColor(item.type)} size="small" />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {item.effect}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {groupedBuffs.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Buffs ({buffs.length})
          </Typography>
          <Grid container spacing={2}>
            {groupedBuffs.map(({ item, quantity }, index) => (
              <Grid item xs={12} sm={6} md={4} key={`${item.id}-${index}`}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
                        {renderIcon(item)}
                        <Typography variant="body1" sx={{ ml: 1 }}>
                          {item.name}
                        </Typography>
                        {quantity > 1 && (
                          <Chip 
                            label={`x${quantity}`} 
                            size="small" 
                            sx={{ height: 20 }} 
                            color="primary"
                          />
                        )}
                      </Box>
                      <Chip label="BUFF" color={getTypeColor(item.type)} size="small" />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {item.effect}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button
                      fullWidth
                      variant="contained"
                      color="success"
                      onClick={() => handleUseItem(item)}
                    >
                      Use
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {debuffs.length > 0 && (
        <Box>
          <Typography variant="subtitle1" gutterBottom>
            Debuffs ({debuffs.length})
          </Typography>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Select Target Player</InputLabel>
            <Select
              value={selectedTarget}
              onChange={(e) => setSelectedTarget(e.target.value)}
              label="Select Target Player"
            >
              {players.filter(p => p !== username && p !== HOST_USERNAME).map((player) => (
                <MenuItem key={player} value={player}>
                  {player}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Grid container spacing={2}>
            {groupedDebuffs.map(({ item, quantity }, index) => (
              <Grid item xs={12} sm={6} md={4} key={`${item.id}-${index}`}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
                        {renderIcon(item)}
                        <Typography variant="body1" sx={{ ml: 1 }}>
                          {item.name}
                        </Typography>
                        {quantity > 1 && (
                          <Chip 
                            label={`x${quantity}`} 
                            size="small" 
                            sx={{ height: 20 }} 
                            color="primary"
                          />
                        )}
                      </Box>
                      <Chip label="DEBUFF" color={getTypeColor(item.type)} size="small" />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {item.effect}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button
                      fullWidth
                      variant="contained"
                      color="error"
                      onClick={() => handleUseItem(item)}
                      disabled={!selectedTarget}
                    >
                      Use on {selectedTarget || 'Player'}
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  )
}

export default Inventory

