import { AppBar, Toolbar, Typography, Box, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button, Badge } from '@mui/material'
import { useState, useEffect, useMemo, useRef } from 'react'
import { useGameSessionStore } from '@/stores/gameSessionStore'
import { clientEvents, serverEvents } from '@/types/events'
import InventoryIcon from '@mui/icons-material/Inventory'
import Inventory from '@/components/Inventory'
import { ITEM_TYPE_INGREDIENT } from '@/constants'

function PlayerInfoHeader() {
  const { username, points, socket, gameid, isHost, selectedRecipe, gameSettings, inventory } = useGameSessionStore()
  const [timeLeft, setTimeLeft] = useState(0)
  const [inventoryOpen, setInventoryOpen] = useState(false)
  const [hasNewItem, setHasNewItem] = useState(false)
  const previousInventory = useRef<typeof inventory>([])
  
  // Initialize timer state similar to GameTimer
  const defaultTime = useMemo(() => {
    if (gameSettings?.gameTime) {
      return gameSettings.gameTime * 60
    }
    if (selectedRecipe?.timeToBake) {
      return selectedRecipe.timeToBake * 60
    }
    return 3600
  }, [gameSettings, selectedRecipe])
  
  useEffect(() => {
    if (isHost() || !gameid) return
    
    setTimeLeft(defaultTime)
    socket.emit(clientEvents.requestTimerState, { gameid })
    
    const handleTimerState = (data: { timeLeft: number; isPaused: boolean }) => {
      setTimeLeft(data.timeLeft)
    }
    
    const handleTimerUpdate = (data: { timeLeft: number; isPaused: boolean }) => {
      setTimeLeft(data.timeLeft)
    }
    
    socket.on(serverEvents.timerState, handleTimerState)
    socket.on(serverEvents.timerUpdate, handleTimerUpdate)
    
    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 0) {
          clearInterval(timer)
          return 0
        }
        return prevTime - 1
      })
    }, 1000)
    
    return () => {
      socket.off(serverEvents.timerState, handleTimerState)
      socket.off(serverEvents.timerUpdate, handleTimerUpdate)
      clearInterval(timer)
    }
  }, [socket, gameid, isHost, defaultTime])
  
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Track inventory changes to show notification when new item is added (excluding ingredients)
  useEffect(() => {
    // Skip on initial mount (when previousInventory is empty and inventory might be empty too)
    if (previousInventory.current.length === 0 && inventory.length === 0) {
      previousInventory.current = inventory.map(item => ({ ...item }))
      return
    }
    
    // Count non-ingredient items in previous and current inventory
    const countNonIngredientItems = (inv: typeof inventory) => {
      return inv.filter(item => item.type !== ITEM_TYPE_INGREDIENT).length
    }
    
    const previousCount = countNonIngredientItems(previousInventory.current)
    const currentCount = countNonIngredientItems(inventory)
    
    // If the count of non-ingredient items increased, show notification
    if (currentCount > previousCount) {
      setHasNewItem(true)
    }
    
    // Update previous inventory reference (deep copy to avoid reference issues)
    previousInventory.current = inventory.map(item => ({ ...item }))
  }, [inventory])

  // Clear notification when inventory dialog is opened
  const handleInventoryOpen = () => {
    setInventoryOpen(true)
    setHasNewItem(false)
  }

  return (
    <>
      <AppBar 
        position="sticky" 
        sx={{ 
          top: 0, 
          zIndex: 1100,
          backgroundColor: 'background.paper',
          color: 'text.primary',
          boxShadow: 2
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, py: 1, minHeight: '64px !important' }}>
          {/* Left: Name and Points */}
          <Box sx={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" fontWeight="bold" sx={{ display: { xs: 'none', sm: 'block' } }}>
                Player:
              </Typography>
              <Typography variant="body2" color="primary" fontWeight="bold" noWrap>
                {username}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" fontWeight="bold">
                Points:
              </Typography>
              <Typography variant="body2" color="primary" fontWeight="bold">
                {points}
              </Typography>
            </Box>
          </Box>
          
          {/* Center: Timer */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: '1 1 auto', justifyContent: 'center', minWidth: 0 }}>
            <Typography variant="body2" fontWeight="bold" sx={{ display: { xs: 'none', sm: 'block' } }}>
              Time:
            </Typography>
            <Typography 
              variant="body2" 
              color="primary" 
              fontWeight="bold"
              sx={{ 
                fontFamily: 'monospace',
                minWidth: '60px',
                textAlign: 'center'
              }}
            >
              {formatTime(timeLeft)}
            </Typography>
          </Box>
          
          {/* Right: Inventory Icon */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flex: '1 1 auto', minWidth: 0 }}>
            <Badge 
              color="error" 
              variant="dot" 
              invisible={!hasNewItem}
            >
              <IconButton 
                color="primary" 
                onClick={handleInventoryOpen}
                sx={{ p: 1 }}
              >
                <InventoryIcon />
              </IconButton>
            </Badge>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Inventory Dialog */}
      <Dialog 
        open={inventoryOpen} 
        onClose={() => setInventoryOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { maxHeight: '90vh' }
        }}
      >
        <DialogTitle>
          <Typography variant="h6">Inventory</Typography>
        </DialogTitle>
        <DialogContent dividers sx={{ overflow: 'auto' }}>
          <Inventory onItemUsed={() => setInventoryOpen(false)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInventoryOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default PlayerInfoHeader

