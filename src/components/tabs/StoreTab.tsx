import { Typography, Grid, Card, CardContent, CardActions, Button, Box, Tabs, Tab, Chip } from '@mui/material'
import { useState, useMemo } from 'react'
import { useGameSessionStore } from '@/stores/gameSessionStore'
import { useToast } from '@/hooks/useToast'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import BuildIcon from '@mui/icons-material/Build'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import KitchenIcon from '@mui/icons-material/Kitchen'
import SpeedIcon from '@mui/icons-material/Speed'
import ShieldIcon from '@mui/icons-material/Shield'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import BlockIcon from '@mui/icons-material/Block'
import AcUnitIcon from '@mui/icons-material/AcUnit'
import LocalGroceryStoreIcon from '@mui/icons-material/LocalGroceryStore'
import CleaningServicesIcon from '@mui/icons-material/CleaningServices'
import StoreIcon from '@mui/icons-material/Store'
import WbSunnyIcon from '@mui/icons-material/WbSunny'
import VisibilityIcon from '@mui/icons-material/Visibility'
import storeItemsData from '@/data/storeItems.json'

import { ITEM_TYPE_TOOL, ITEM_TYPE_BUFF, ITEM_TYPE_DEBUFF, ITEM_TYPE_INGREDIENT, BUFF_HAGGLER } from '@/constants'

export type ItemType = 'ingredient' | 'tool' | 'buff' | 'debuff'

export interface StoreItem {
  id: string
  name: string
  description?: string
  price: number
  type: ItemType
  icon: React.ReactNode
  effect?: string
  quantity?: number
  duration?: number // Duration in seconds (0 = one-time use)
}

interface StoreItemData {
  id: string
  name: string
  description?: string
  effect?: string
  cost: number
  quantity?: number
  duration?: number
  icon: string
}

// Icon mapping function
const getIcon = (iconName: string): React.ReactNode => {
  const iconMap: Record<string, React.ReactNode> = {
    'KitchenIcon': <KitchenIcon />,
    'BuildIcon': <BuildIcon />,
    'TrendingUpIcon': <TrendingUpIcon />,
    'TrendingDownIcon': <TrendingDownIcon />,
    'SpeedIcon': <SpeedIcon />,
    'ShieldIcon': <ShieldIcon />,
    'AttachMoneyIcon': <AttachMoneyIcon />,
    'BlockIcon': <BlockIcon />,
    'AcUnitIcon': <AcUnitIcon />,
    'LocalGroceryStoreIcon': <LocalGroceryStoreIcon />,
    'CleaningServicesIcon': <CleaningServicesIcon />,
    'StoreIcon': <StoreIcon />,
    'WbSunnyIcon': <WbSunnyIcon />,
    'VisibilityIcon': <VisibilityIcon />
  }
  return iconMap[iconName] || <BuildIcon />
}

// Convert JSON data to StoreItem format
const convertToStoreItem = (item: StoreItemData, type: ItemType): StoreItem => {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    price: item.cost,
    type,
    icon: getIcon(item.icon),
    effect: item.effect,
    quantity: item.quantity,
    duration: item.duration
  }
}

function StoreTab() {
  const { showToast } = useToast()
  const { points, subtractPoints, addItemToInventory, storeQuantities, gameSettings, gameType, activeBuffs } = useGameSessionStore()
  const [categoryTab, setCategoryTab] = useState(0)
  
  // Check for Haggler buff (20% discount)
  const now = Date.now()
  const hasHaggler = activeBuffs[BUFF_HAGGLER] && activeBuffs[BUFF_HAGGLER].expiresAt > now
  
  // Calculate discounted price with rounding to nearest 5
  const getDiscountedPrice = (originalPrice: number, itemType: string): number => {
    if (hasHaggler && (itemType === ITEM_TYPE_TOOL || itemType === ITEM_TYPE_INGREDIENT)) {
      const discounted = originalPrice * 0.8 // 20% discount
      // Round to nearest 5
      return Math.round(discounted / 5) * 5
    }
    return originalPrice
  }
  
  // Get items based on game type
  const isMixingGame = gameType === 'Mixing Game'
  const gameItems = isMixingGame ? storeItemsData.mixing : storeItemsData.baking
  
  // Get custom items from settings
  interface CustomItem {
    id: string
    name: string
    description?: string
    effect?: string
    cost: number
    quantity?: number
    duration?: number
    icon: string
    type: 'ingredient' | 'tool' | 'buff' | 'debuff'
  }
  const customItems: CustomItem[] = (gameSettings?.customItems || []) as CustomItem[]

  const handleCategoryChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCategoryTab(newValue)
  }

  // Helper to get item cost (from settings or default)
  const getItemCost = useMemo(() => {
    return (itemId: string, defaultCost: number): number => {
      if (gameSettings?.storeItems?.[itemId]?.cost !== undefined) {
        return gameSettings.storeItems[itemId].cost!
      }
      return defaultCost
    }
  }, [gameSettings])

  // Helper to get item duration (from settings or default)
  const getItemDuration = useMemo(() => {
    return (itemId: string, defaultDuration?: number): number | undefined => {
      if (gameSettings?.storeItems?.[itemId]?.duration !== undefined) {
        return gameSettings.storeItems[itemId].duration
      }
      return defaultDuration
    }
  }, [gameSettings])

  // Helper to check if item is enabled
  const isItemEnabled = useMemo(() => {
    return (itemId: string): boolean => {
      // If gameSettings is not loaded yet, show all items (fallback)
      if (!gameSettings || !gameSettings.storeItems) {
        return true
      }
      // If item is in storeItems, check if it's explicitly enabled
      if (itemId in gameSettings.storeItems) {
        const itemConfig = gameSettings.storeItems[itemId]
        // Only show if enabled is explicitly true
        return itemConfig.enabled === true
      }
      // If item is not in storeItems but settings exist, don't show it
      // This means the item was explicitly disabled/not configured
      return false
    }
  }, [gameSettings])

  // Helper to convert custom item to StoreItem
  const convertCustomItem = (item: CustomItem): StoreItem => {
    return {
      id: item.id,
      name: item.name,
      description: item.description,
      price: getItemCost(item.id, item.cost),
      type: item.type,
      icon: getIcon(item.icon),
      effect: item.effect,
      quantity: item.quantity,
      duration: getItemDuration(item.id, item.duration)
    }
  }

  // Load items from JSON file, filtered by settings and with configured costs
  // Also include custom items
  const ingredients: StoreItem[] = useMemo(() => {
    const defaultItems = (gameItems.ingredients as StoreItemData[])
      .filter(item => isItemEnabled(item.id))
      .map(item => {
        const storeItem = convertToStoreItem(item, 'ingredient')
        storeItem.price = getItemCost(item.id, item.cost)
        return storeItem
      })
    
    const customIngredientItems = customItems
      .filter(item => item.type === 'ingredient' && isItemEnabled(item.id))
      .map(item => convertCustomItem(item))
    
    return [...defaultItems, ...customIngredientItems]
  }, [gameSettings, getItemCost, isItemEnabled, gameItems, customItems])

  const tools: StoreItem[] = useMemo(() => {
    const defaultItems = (gameItems.tools as StoreItemData[])
      .filter(item => isItemEnabled(item.id))
      .map(item => {
        const storeItem = convertToStoreItem(item, ITEM_TYPE_TOOL)
        storeItem.price = getItemCost(item.id, item.cost)
        return storeItem
      })
    
    const customToolItems = customItems
      .filter(item => item.type === ITEM_TYPE_TOOL && isItemEnabled(item.id))
      .map(item => convertCustomItem(item))
    
    return [...defaultItems, ...customToolItems]
  }, [gameSettings, getItemCost, isItemEnabled, gameItems, customItems])

  const buffs: StoreItem[] = useMemo(() => {
    const defaultItems = (storeItemsData.buffs as StoreItemData[])
      .filter(item => isItemEnabled(item.id))
      .map(item => {
        const storeItem = convertToStoreItem(item, ITEM_TYPE_BUFF)
        storeItem.price = getItemCost(item.id, item.cost)
        storeItem.duration = getItemDuration(item.id, item.duration)
        return storeItem
      })
    
    const customBuffItems = customItems
      .filter(item => item.type === ITEM_TYPE_BUFF && isItemEnabled(item.id))
      .map(item => convertCustomItem(item))
    
    return [...defaultItems, ...customBuffItems]
  }, [gameSettings, getItemCost, getItemDuration, isItemEnabled, customItems])

  const debuffs: StoreItem[] = useMemo(() => {
    const defaultItems = (storeItemsData.debuffs as StoreItemData[])
      .filter(item => isItemEnabled(item.id))
      .map(item => {
        const storeItem = convertToStoreItem(item, ITEM_TYPE_DEBUFF)
        storeItem.price = getItemCost(item.id, item.cost)
        storeItem.duration = getItemDuration(item.id, item.duration)
        return storeItem
      })
    
    const customDebuffItems = customItems
      .filter(item => item.type === ITEM_TYPE_DEBUFF && isItemEnabled(item.id))
      .map(item => convertCustomItem(item))
    
    return [...defaultItems, ...customDebuffItems]
  }, [gameSettings, getItemCost, getItemDuration, isItemEnabled, customItems])

  const getItemsByCategory = () => {
    switch (categoryTab) {
      case 0: return ingredients
      case 1: return tools
      case 2: return buffs
      case 3: return debuffs
      default: return ingredients
    }
  }

  const isItemSoldOut = (item: StoreItem): boolean => {
    // Only tools have quantity tracking
    if (item.type !== ITEM_TYPE_TOOL) {
      return false
    }
    const quantity = storeQuantities[item.id]
    // If quantity is undefined, item doesn't have quantity tracking (unlimited)
    // If quantity is 0 or less, item is sold out
    return quantity !== undefined && quantity <= 0
  }

  const getItemQuantity = (item: StoreItem): number | null => {
    if (item.type !== ITEM_TYPE_TOOL) {
      return null
    }
    return storeQuantities[item.id] ?? null
  }

  const handlePurchase = (item: StoreItem) => {
    // Check if item is sold out
    if (isItemSoldOut(item)) {
      showToast(`${item.name} is sold out!`, 'warning')
      return
    }

    // Calculate final price with Haggler discount
    const finalPrice = getDiscountedPrice(item.price, item.type)
    
    if (points >= finalPrice) {
      subtractPoints(finalPrice)
      addItemToInventory(item)
      const discountMsg = hasHaggler && (item.type === ITEM_TYPE_TOOL || item.type === ITEM_TYPE_INGREDIENT) && item.price !== finalPrice
        ? ` (20% discount applied: ${item.price} → ${finalPrice} points)`
        : ''
      showToast(`Purchased ${item.name}${discountMsg}!`, 'success')
    } else {
      showToast(`Not enough points! You need ${finalPrice - points} more points.`, 'error')
    }
  }

  const getTypeColor = (type: ItemType) => {
    switch (type) {
      case 'ingredient': return 'info'
      case ITEM_TYPE_TOOL: return 'default'
      case 'buff': return 'success'
      case 'debuff': return 'error'
    }
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Store
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Spend your points on items to enhance your cake or hinder your opponents!
      </Typography>

      <Tabs 
        value={categoryTab} 
        onChange={handleCategoryChange} 
        sx={{ 
          mb: 3,
          '& .MuiTabs-scrollButtons.Mui-disabled': {
            opacity: 0.3
          }
        }}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
      >
        <Tab label="Ingredients" />
        <Tab label="Tools" />
        <Tab label="Buffs" />
        <Tab label="Debuffs" />
      </Tabs>

      <Grid container spacing={2}>
        {getItemsByCategory().map((item, index) => (
          <Grid item xs={12} sm={6} md={4} key={`${item.id}-${index}`}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {item.icon}
                    <Typography variant="h6" sx={{ ml: 1 }}>
                      {item.name}
                    </Typography>
                  </Box>
                  <Chip 
                    label={item.type.toUpperCase()} 
                    color={getTypeColor(item.type)}
                    size="small"
                  />
                </Box>
                {item.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {item.description}
                  </Typography>
                )}
                {item.effect && (
                  <Typography variant="body2" color="primary" sx={{ mb: 1, fontStyle: 'italic' }}>
                    Effect: {item.effect}
                  </Typography>
                )}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Box>
                    {hasHaggler && (item.type === ITEM_TYPE_TOOL || item.type === ITEM_TYPE_INGREDIENT) && item.price !== getDiscountedPrice(item.price, item.type) ? (
                      <>
                        <Typography variant="h6" color="primary">
                          {getDiscountedPrice(item.price, item.type)} points
                        </Typography>
                        <Typography variant="caption" sx={{ textDecoration: 'line-through', color: 'text.secondary', display: 'block' }}>
                          {item.price} points
                        </Typography>
                      </>
                    ) : (
                      <Typography variant="h6" color="primary">
                        {item.price} points
                      </Typography>
                    )}
                  </Box>
                  {getItemQuantity(item) !== null && (
                    <Typography 
                      variant="body2" 
                      color={isItemSoldOut(item) ? 'error' : 'text.secondary'}
                      fontWeight={isItemSoldOut(item) ? 'bold' : 'normal'}
                    >
                      {isItemSoldOut(item) ? 'SOLD OUT' : `Available: ${getItemQuantity(item)}`}
                    </Typography>
                  )}
                </Box>
              </CardContent>
              <CardActions>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<ShoppingCartIcon />}
                  onClick={() => handlePurchase(item)}
                  disabled={points < getDiscountedPrice(item.price, item.type) || isItemSoldOut(item)}
                >
                  {isItemSoldOut(item) ? 'Sold Out' : 'Buy'}
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}

export default StoreTab


