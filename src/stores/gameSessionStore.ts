import React from 'react'
import { create } from 'zustand'
import { io, Socket } from 'socket.io-client'
import type * as IClient from '@/types/IClient'
import type * as IServer from '@/types/IServer'
import { clientEvents, serverEvents } from '@/types/events'
import type { StoreItem } from '@/components/tabs'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import BuildIcon from '@mui/icons-material/Build'
import { ITEM_TYPE_DEBUFF, ITEM_TYPE_BUFF, ITEM_TYPE_TOOL, HOST_USERNAME, DEBUFF_FREEZE, DEBUFF_STEAL_POINTS, DEBUFF_STEAL_ITEM, DEBUFF_STORE_CLOSED, DEBUFF_SOLAR_FLARE } from '@/constants'

type PlayerRole = 'host' | 'player'

interface GameSessionState {
  socket: Socket
  gameid: string
  players: string[]
  gameType: string
  username: string
  role: PlayerRole | null
  points: number
  playerPoints: Record<string, number> // Map of username to points
  inventory: StoreItem[] // Player's owned items
  activeBuffs: Record<string, { item: StoreItem; expiresAt: number }> // Active buffs with expiration
  activeDebuffs: Record<string, { item: StoreItem; expiresAt: number }> // Active debuffs with expiration
  selectedRecipe: any | null
  storeQuantities: Record<string, number> // Map of item ID to remaining quantity
  gameSettings: any | null // Game settings configured by host
  recipeUnlocked: boolean // For Christmas Mix - tracks if player has unlocked the recipe
  unlockedIngredients: string[] // List of ingredient IDs that the player has unlocked
  unlockedDesigns: string[] // For Christmas Bake - list of shape IDs that the player has unlocked
  icingUnlocked: boolean // For Christmas Bake - tracks if player has unlocked the icing recipes
  joinGame: (request: IClient.IJoinGame) => void
  createGame: (request: IClient.ICreateGame) => void
  startGame: () => void
  leaveGame: () => void
  reset: () => void
  isHost: () => boolean
  addPoints: (amount: number) => void
  subtractPoints: (amount: number) => void
  addItemToInventory: (item: StoreItem) => void
  removeItemFromInventory: (itemId: string) => void
  unlockIngredient: (itemId: string, itemName: string) => void
  useItem: (item: StoreItem, targetPlayer?: string) => void
  rejoinGame: (request: IClient.IRejoinGame) => void
  saveSession: () => void
  loadSession: () => { gameid: string; username: string } | null
  activateChallenge: (request: IClient.IActivateChallenge) => void
  startChallenge: (request: IClient.IStartChallenge) => void
  endChallenge: (request: IClient.IEndChallenge) => void
  joinChallenge: (request: IClient.IJoinChallenge) => void
  leaveChallenge: (request: IClient.ILeaveChallenge) => void
  submitChallengeResult: (request: IClient.ISubmitChallengeResult) => void
  showToast?: (message: string, severity?: 'success' | 'error' | 'warning' | 'info', duration?: number) => void
}

// Get server URL from environment variable, default to localhost for development
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000'

export const useGameSessionStore = create<GameSessionState>((set, get) => ({
  socket: io(SERVER_URL),
  gameid: '',
  players: [],
  gameType: '',
  username: '',
  role: null,
  points: 0,
  playerPoints: {},
  inventory: [],
  activeBuffs: {},
  activeDebuffs: {},
  selectedRecipe: null,
  storeQuantities: {},
  gameSettings: null,
  recipeUnlocked: false,
  unlockedIngredients: [],
  unlockedDesigns: [],
  icingUnlocked: false,

  joinGame: (request: IClient.IJoinGame) => {
    console.log("Join Game", request);
    set({ 
      username: request.username,
      role: 'player',
      points: 0,
      gameid: request.gameid
    })
    get().socket.emit(clientEvents.joinGame, request)
    // Save session after a short delay to ensure gameid is set
    setTimeout(() => get().saveSession(), 100)
  },

  createGame: (request: IClient.ICreateGame) => {
    set({ 
      role: 'host', 
      points: 0,
      username: HOST_USERNAME // Set host username
    })
    get().socket.emit(clientEvents.createGame, request)
    // Save session will be called after roomUpdate
  },

  startGame: () => {
    if (!get().isHost()) return
    const state = get()
    get().socket.emit(clientEvents.startGame, { 
      gameid: state.gameid,
      settings: state.gameSettings
    } as IClient.IStartGame)
  },

  leaveGame: () => {
    get().socket.emit(clientEvents.leaveGame, {
      gameid: get().gameid,
      username: get().username
    } as IClient.ILeaveGame)
    get().reset()
  },

  reset: () => {
    set({
      gameid: '',
      players: [],
      gameType: '',
      username: '',
      role: null,
  points: 0,
  playerPoints: {},
  inventory: [],
  activeBuffs: {},
  activeDebuffs: {},
  selectedRecipe: null,
      recipeUnlocked: false,
      unlockedIngredients: [],
      unlockedDesigns: [],
      icingUnlocked: false
    })
    // Clear session from localStorage when resetting
    localStorage.removeItem('gameSession')
  },

  isHost: () => {
    return get().role === 'host'
  },

  addPoints: (amount: number) => {
    const newPoints = get().points + amount
    set({ points: newPoints })
    // Emit points update to server
    get().socket.emit(clientEvents.updatePoints, {
      username: get().username,
      gameid: get().gameid,
      points: newPoints
    })
  },

  subtractPoints: (amount: number) => {
    const newPoints = Math.max(0, get().points - amount)
    set({ points: newPoints })
    // Emit points update to server
    get().socket.emit(clientEvents.updatePoints, {
      username: get().username,
      gameid: get().gameid,
      points: newPoints
    })
  },

  addItemToInventory: (item: StoreItem) => {
    const newInventory = [...get().inventory, item]
    set({ inventory: newInventory })
    
    // Create serializable versions of items (strip React elements)
    const serializableInventory = newInventory.map(item => {
      const { icon, ...serializableItem } = item
      return serializableItem
    })
    const serializablePurchasedItem = (() => {
      const { icon, ...serializableItem } = item
      return serializableItem
    })()
    
    // Emit inventory update to server with purchasedItem flag
    get().socket.emit(clientEvents.inventoryUpdate, {
      username: get().username,
      gameid: get().gameid,
      inventory: serializableInventory,
      purchasedItem: serializablePurchasedItem
    })
  },

  unlockIngredient: (itemId: string, itemName: string) => {
    const currentUnlocked = get().unlockedIngredients
    // Don't unlock if already unlocked
    if (currentUnlocked.includes(itemId)) {
      return
    }
    const newUnlocked = [...currentUnlocked, itemId]
    set({ unlockedIngredients: newUnlocked })
    
    // Emit unlock to server with ingredient name
    get().socket.emit(clientEvents.inventoryUpdate, {
      username: get().username,
      gameid: get().gameid,
      inventory: get().inventory.map(item => {
        const { icon, ...serializableItem } = item
        return serializableItem
      }),
      unlockedIngredient: itemId,
      unlockedIngredientName: itemName
    })
  },

  removeItemFromInventory: (itemId: string) => {
    const currentInventory = get().inventory
    // Find the first index of the item with this ID and remove only that one
    const itemIndex = currentInventory.findIndex(item => item.id === itemId)
    if (itemIndex === -1) return // Item not found, nothing to remove
    
    const newInventory = [
      ...currentInventory.slice(0, itemIndex),
      ...currentInventory.slice(itemIndex + 1)
    ]
    set({ inventory: newInventory })
    
    // Create serializable versions of items (strip React elements)
    const serializableInventory = newInventory.map(item => {
      const { icon, ...serializableItem } = item
      return serializableItem
    })
    
    // Emit inventory update to server
    get().socket.emit(clientEvents.inventoryUpdate, {
      username: get().username,
      gameid: get().gameid,
      inventory: serializableInventory
    })
  },

  useItem: (item: StoreItem, targetPlayer?: string) => {
    const state = get()
    
    // Remove item from inventory if it's a consumable
    if (item.type === ITEM_TYPE_DEBUFF || item.type === ITEM_TYPE_BUFF) {
      state.removeItemFromInventory(item.id)
    }

    // Create a serializable version of the item (strip React elements)
    const serializableItem = {
      ...item,
      icon: undefined // Remove React icon element - server doesn't need it
    }

    // Handle different item types
    if (item.type === ITEM_TYPE_BUFF) {
      // Apply buff with expiration time
      // Duration is in seconds, convert to milliseconds
      const durationMs = (item.duration || 0) * 1000
      
      if (durationMs === 0) {
        // One-time use buff - effect is applied immediately, item is already removed from inventory
        // For now, one-time buffs don't need to be tracked (they're consumed immediately)
      } else {
        // Duration-based buff
        const expiresAt = Date.now() + durationMs
        const newBuffs = { ...state.activeBuffs, [item.id]: { item, expiresAt } }
        set({ activeBuffs: newBuffs })
      }
    }
    // Note: For debuffs, we only emit useItem - the server handles debuff application
    // We don't call applyDebuff here to avoid duplicate notifications

    // Emit item use event
    get().socket.emit(clientEvents.useItem, {
      username: state.username,
      gameid: state.gameid,
      item: serializableItem,
      targetPlayer
    })
  },

  rejoinGame: (request: IClient.IRejoinGame) => {
    console.log("Rejoin Game", request);
    get().socket.emit(clientEvents.rejoinGame, request)
  },

  saveSession: () => {
    const state = get()
    if (state.gameid && state.username) {
      localStorage.setItem('gameSession', JSON.stringify({
        gameid: state.gameid,
        username: state.username,
        role: state.role
      }))
    }
  },

  loadSession: () => {
    const sessionData = localStorage.getItem('gameSession')
    if (sessionData) {
      try {
        return JSON.parse(sessionData)
      } catch (e) {
        return null
      }
    }
    return null
  },

  activateChallenge: (request: IClient.IActivateChallenge) => {
    get().socket.emit(clientEvents.activateChallenge, request)
  },

  startChallenge: (request: IClient.IStartChallenge) => {
    get().socket.emit(clientEvents.startChallenge, request)
  },

  endChallenge: (request: IClient.IEndChallenge) => {
    get().socket.emit(clientEvents.endChallenge, request)
  },

  joinChallenge: (request: IClient.IJoinChallenge) => {
    get().socket.emit(clientEvents.joinChallenge, request)
  },

  leaveChallenge: (request: IClient.ILeaveChallenge) => {
    get().socket.emit(clientEvents.leaveChallenge, request)
  },

  submitChallengeResult: (request: IClient.ISubmitChallengeResult) => {
    get().socket.emit(clientEvents.submitChallengeResult, request)
  }
}))

// Set up socket event listeners
const socket = useGameSessionStore.getState().socket

socket.on(serverEvents.roomUpdate, (response: IServer.IRoomUpdate) => {
  useGameSessionStore.setState({
    gameid: response.gameid,
    gameType: response.gameType,
    players: response.players
  })
  // Save session when room is updated
  useGameSessionStore.getState().saveSession()
})

socket.on(serverEvents.gameStart, (data: { recipe?: any; settings?: any }) => {
  const state = useGameSessionStore.getState()
  const gameType = state.gameType
  const isHostPlayer = state.isHost()
  const isChristmasMix = gameType === 'Christmas Mix'
  const isChristmasBake = gameType === 'Christmas Bake'
  
  // Store the selected recipe
  if (data?.recipe) {
    useGameSessionStore.setState({ selectedRecipe: data.recipe })
  }
  // Store game settings
  if (data?.settings) {
    useGameSessionStore.setState({ gameSettings: data.settings })
  }
  // Clear inventory and active buffs/debuffs for new game
  // Also ensure recipeUnlocked is set correctly for Christmas Mix/Bake players
  useGameSessionStore.setState({ 
    inventory: [],
    activeBuffs: {},
    activeDebuffs: {},
    // For Christmas Mix/Bake, ensure recipe is locked for players (host always has it unlocked)
    recipeUnlocked: isHostPlayer || (!isChristmasMix && !isChristmasBake) ? true : false
  })
})

socket.on(serverEvents.storeUpdate, (data: { quantities: Record<string, number> }) => {
  useGameSessionStore.setState({ storeQuantities: data.quantities })
})

socket.on(serverEvents.rejoinSuccess, (data: { 
  gameid: string; 
  username: string; 
  points: number; 
  inventory: any[]; 
  role: 'host' | 'player';
  players: string[];
  gameType: string;
  recipe?: any;
  gameStarted?: boolean;
  unlockedRecipe?: boolean;
  unlockedIngredients?: string[];
  unlockedDesigns?: string[];
  unlockedIcing?: boolean;
}) => {
  // Add icons to inventory items
  const inventoryWithIcons = addIconsToInventory(data.inventory)
  useGameSessionStore.setState({
    gameid: data.gameid,
    username: data.username,
    points: data.points,
    inventory: inventoryWithIcons,
    role: data.role,
    players: data.players,
    gameType: data.gameType,
    selectedRecipe: data.recipe || null,
    recipeUnlocked: data.unlockedRecipe ?? (data.role === 'host' && (data.gameType === 'Christmas Mix' || data.gameType === 'Christmas Bake')),
    unlockedIngredients: data.unlockedIngredients || [],
    unlockedDesigns: data.unlockedDesigns || [],
    icingUnlocked: data.unlockedIcing ?? (data.role === 'host' && data.gameType === 'Christmas Bake')
  })
  useGameSessionStore.getState().saveSession()
})

socket.on(serverEvents.error, (message: string) => {
  console.log("Error:", message);
  const state = useGameSessionStore.getState()
  
  // Don't kick players out for "already unlocked" errors - just handle it gracefully
  if (message.includes('already unlocked')) {
    // Recipe is already unlocked, just update the state
    useGameSessionStore.setState({ recipeUnlocked: true })
    return
  }
  
  // Handle sold out errors - rollback the purchase
  if (message.includes('sold out') || message.includes('soldout')) {
    // Extract item name from error message (format: "Item name is sold out!")
    const match = message.match(/^(.+?)\s+is\s+sold\s+out!?$/i)
    if (match) {
      const itemName = match[1]
      // Find the item in inventory by name and remove it
      const itemToRemove = state.inventory.find(item => item.name === itemName)
      if (itemToRemove) {
        // Restore points and remove item
        state.addPoints(itemToRemove.price)
        state.removeItemFromInventory(itemToRemove.id)
      }
    }
    const showToast = useGameSessionStore.getState().showToast
    if (showToast) {
      showToast(message, 'warning')
    } else {
      alert(message)
    }
    return
  }
  
  // Handle Debuff Cleanse errors - item was consumed but no debuffs to cleanse
  if (message.includes('no active debuffs to cleanse') || message.includes('debuff') && message.includes('cleanse')) {
    const showToast = useGameSessionStore.getState().showToast
    if (showToast) {
      showToast(message, 'info')
    } else {
      alert(message)
    }
    return
  }
  
  // Only reset if it's a critical error, not for rejoin/session errors or game action errors
  // Rejoin errors are handled in SessionRestore component
  // Game action errors (like blocked debuffs) should not disconnect the player
  if (!message.includes('rejoin') && !message.includes('session') && !message.includes('already connected') && 
      !message.includes('Debuff Immunity') && !message.includes('blocked')) {
    useGameSessionStore.getState().reset()
  } else {
    // Show toast for non-critical errors
    const showToast = useGameSessionStore.getState().showToast
    if (showToast) {
      showToast(message, 'info')
    } else {
      alert(message)
    }
  }
})

socket.on(serverEvents.recipeUnlocked, (data: { unlocked: boolean }) => {
  useGameSessionStore.setState({ recipeUnlocked: data.unlocked })
})

socket.on(serverEvents.designUnlocked, (data: { shapeId: string; unlocked: boolean }) => {
  if (data.unlocked) {
    const state = useGameSessionStore.getState()
    const currentUnlocked = state.unlockedDesigns || []
    if (!currentUnlocked.includes(data.shapeId)) {
      useGameSessionStore.setState({ unlockedDesigns: [...currentUnlocked, data.shapeId] })
    }
  }
})

socket.on(serverEvents.icingUnlocked, (data: { unlocked: boolean }) => {
  useGameSessionStore.setState({ icingUnlocked: data.unlocked })
})

socket.on(serverEvents.usernameTaken, (newUsername: string) => {
  useGameSessionStore.setState({ username: newUsername })
})

socket.on(serverEvents.pointsUpdate, (data: { username: string; points: number }) => {
  const state = useGameSessionStore.getState()
  const newPlayerPoints = { ...state.playerPoints, [data.username]: data.points }
  useGameSessionStore.setState({ playerPoints: newPlayerPoints })
  
  // Update own points if it's for this user
  if (data.username === state.username) {
    useGameSessionStore.setState({ points: data.points })
  }
})

socket.on(serverEvents.viewingEyeTargetNotified, () => {
  const showToast = useGameSessionStore.getState().showToast
  if (showToast) {
    showToast('You are being watched...', 'warning')
  }
})

socket.on(serverEvents.debuffApplied, (data: { targetPlayer: string; debuff: any; effect: any; removed?: boolean; blocked?: boolean; blockedBy?: string; stolenPoints?: number; receivedPoints?: number; fromPlayer?: string; addedByHost?: boolean; removedBy?: string; debuffId?: string; debuffName?: string; expiresAt?: number }) => {
  const state = useGameSessionStore.getState()
  const showToast = useGameSessionStore.getState().showToast
  
  // Handle Steal Points notifications for both target and user who used it
  if (data.debuff && data.debuff.id === DEBUFF_STEAL_POINTS) {
    // If this player is the target (had points stolen from them)
    if (data.targetPlayer === state.username && data.stolenPoints !== undefined) {
      if (showToast) {
        showToast(`${data.fromPlayer || 'Someone'} stole ${data.stolenPoints} points from you!`, 'error')
      } else {
        alert(`${data.fromPlayer || 'Someone'} stole ${data.stolenPoints} points from you!`)
      }
      return
    }
    
    // If this player used the debuff (received points)
    // The server sends receivedPoints only to the user who used it, with fromPlayer as the target
    if (data.receivedPoints !== undefined) {
      if (showToast) {
        showToast(`You stole ${data.receivedPoints} points from ${data.fromPlayer || 'target'}!`, 'success')
      } else {
        alert(`You stole ${data.receivedPoints} points from ${data.fromPlayer || 'target'}!`)
      }
      return
    }
  }
  
  // If this player is the target, show notification and update activeDebuffs
  // Note: Points and inventory updates are handled by the server and broadcast via pointsUpdate/inventoryUpdate events
  // The server handles all the actual point/item transfers to ensure consistency
  if (data.targetPlayer === state.username) {
    // Handle debuff removal
    if (data.removed && !data.debuff) {
      const showToast = useGameSessionStore.getState().showToast
      // Remove the specific debuff that was removed, or remove expired debuffs
      const now = Date.now()
      const newActiveDebuffs = { ...state.activeDebuffs }
      
      // If a specific debuff ID was provided, remove that one
      if (data.debuffId || (data as any).removedDebuffId) {
        const idToRemove = data.debuffId || (data as any).removedDebuffId
        delete newActiveDebuffs[idToRemove]
      } else {
        // Otherwise, remove expired debuffs (fallback)
        Object.keys(newActiveDebuffs).forEach(debuffId => {
          const debuff = newActiveDebuffs[debuffId]
          if (debuff.expiresAt <= now) {
            delete newActiveDebuffs[debuffId]
          }
        })
      }
      
      useGameSessionStore.setState({ activeDebuffs: newActiveDebuffs })
      
      if (showToast) {
        let message = 'Your oldest debuff has been removed!'
        if (data.removedBy === 'Host' && data.debuffName) {
          message = `Host removed ${data.debuffName} from you`
        }
        showToast(message, 'info')
      } else {
        alert(data.removedBy === 'Host' && data.debuffName 
          ? `Host removed ${data.debuffName} from you`
          : 'Your oldest debuff has been removed!')
      }
      return
    }
    
    // Handle debuff blocked by immunity
    if (data.blocked && !data.debuff) {
      const showToast = useGameSessionStore.getState().showToast
      if (showToast) {
        showToast(`A debuff was blocked by your ${data.blockedBy || 'Debuff Immunity'}!`, 'info')
      } else {
        alert(`A debuff was blocked by your ${data.blockedBy || 'Debuff Immunity'}!`)
      }
      return
    }
    
    // Add debuff to activeDebuffs if it has a duration
    if (data.debuff && data.debuff.duration && data.debuff.duration > 0) {
      const expiresAt = data.expiresAt || (Date.now() + (data.debuff.duration * 1000))
      const newActiveDebuffs = { ...state.activeDebuffs, [data.debuff.id]: { item: data.debuff, expiresAt } }
      useGameSessionStore.setState({ activeDebuffs: newActiveDebuffs })
    }
    
    if (data.debuff && data.debuff.id === DEBUFF_FREEZE) {
      // Freeze player - disable cooking for 2 minutes
      if (showToast) {
        showToast(`You have been frozen! You cannot cook for 2 minutes.`, 'warning')
      } else {
        alert(`You have been frozen! You cannot cook for 2 minutes.`)
      }
      // TODO: Implement freeze logic in UI
    } else if (data.debuff && data.debuff.id === DEBUFF_STEAL_ITEM) {
      // Steal item - server handles the actual item transfer
      if (showToast) {
        showToast(`An item was stolen from you!`, 'error')
      } else {
        alert(`An item was stolen from you!`)
      }
    } else if (data.debuff && data.debuff.id === DEBUFF_STORE_CLOSED) {
      if (showToast) {
        showToast(`Store Closed! You cannot access the Store Tab for 1 minute.`, 'warning')
      } else {
        alert(`Store Closed! You cannot access the Store Tab for 1 minute.`)
      }
    } else if (data.debuff && data.debuff.id === DEBUFF_SOLAR_FLARE) {
      if (showToast) {
        showToast(`Solar Flare! You cannot see the Recipe Tab for 3 minutes.`, 'warning')
      } else {
        alert(`Solar Flare! You cannot see the Recipe Tab for 3 minutes.`)
      }
    } else if (data.debuff && data.debuff.id) {
      // Handle host-added debuff or custom debuff
      const debuffName = data.debuff.name || 'Debuff'
      const debuffEffect = data.debuff.effect
      
      let message: string
      if (data.addedByHost) {
        // Host-added debuff notification
        message = `Host added ${debuffName} to you`
      } else if (data.debuff.id.startsWith('custom_')) {
        // Custom debuff - show name and effect
        message = debuffEffect 
          ? `You've been affected with ${debuffName}\n\nEffect: ${debuffEffect}`
          : `You've been affected with ${debuffName}`
      } else {
        // Default debuff notification
        message = `You've been affected with ${debuffName}`
        if (debuffEffect) {
          message += `\n\nEffect: ${debuffEffect}`
        }
      }
      
      if (showToast) {
        showToast(message, 'warning')
      } else {
        alert(message)
      }
    }
  }
  
  // Clean up expired debuffs periodically
  const now = Date.now()
  const newActiveDebuffs = { ...state.activeDebuffs }
  Object.keys(newActiveDebuffs).forEach(debuffId => {
    const debuff = newActiveDebuffs[debuffId]
    if (debuff.expiresAt <= now) {
      delete newActiveDebuffs[debuffId]
    }
  })
  if (Object.keys(newActiveDebuffs).length !== Object.keys(state.activeDebuffs).length) {
    useGameSessionStore.setState({ activeDebuffs: newActiveDebuffs })
  }
})

// Handle buff applied/removed events
socket.on(serverEvents.buffApplied, (data: { targetPlayer: string; buff: any; effect?: any; removed?: boolean; removedBy?: string; addedByHost?: boolean; buffId?: string; buffName?: string; expiresAt?: number }) => {
  const state = useGameSessionStore.getState()
  const showToast = useGameSessionStore.getState().showToast
  
  // If this player is the target
  if (data.targetPlayer === state.username) {
    // Handle buff removal
    if (data.removed && !data.buff) {
      // Clean up expired buffs
      const now = Date.now()
      const newActiveBuffs = { ...state.activeBuffs }
      if (data.buffId) {
        delete newActiveBuffs[data.buffId]
      } else {
        Object.keys(newActiveBuffs).forEach(buffId => {
          const buff = newActiveBuffs[buffId]
          if (buff.expiresAt <= now) {
            delete newActiveBuffs[buffId]
          }
        })
      }
      useGameSessionStore.setState({ activeBuffs: newActiveBuffs })
      
      if (showToast) {
        let message = 'A buff has been removed!'
        if (data.removedBy === 'Host' && data.buffName) {
          message = `Host removed ${data.buffName} from you`
        } else if (data.removedBy === 'Debuff Reflect consumed') {
          message = 'Debuff Reflect was consumed after reflecting a debuff!'
        }
        showToast(message, 'info')
      }
      return
    }
    
    // Add buff to activeBuffs if it has a duration
    if (data.buff && data.buff.duration && data.buff.duration > 0) {
      const expiresAt = data.expiresAt || (Date.now() + (data.buff.duration * 1000))
      const newActiveBuffs = { ...state.activeBuffs, [data.buff.id]: { item: data.buff, expiresAt } }
      useGameSessionStore.setState({ activeBuffs: newActiveBuffs })
    }
    
    // Show notification for all buffs (both default and custom)
    if (data.buff && data.buff.id) {
      const buffName = data.buff.name || 'Buff'
      const buffEffect = data.buff.effect
      let message: string
      
      if (data.addedByHost) {
        // Host-added buff notification
        message = `Host added ${buffName} to you`
      } else {
        // Regular buff activation
        message = buffEffect 
          ? `You've activated ${buffName}\n\nEffect: ${buffEffect}`
          : `You've activated ${buffName}`
      }
      
      if (showToast) {
        showToast(message, 'success')
      } else {
        alert(message)
      }
    }
  }
  
  // Clean up expired buffs periodically (similar to debuffs)
  const now = Date.now()
  const newActiveBuffs = { ...useGameSessionStore.getState().activeBuffs }
  Object.keys(newActiveBuffs).forEach(buffId => {
    const buff = newActiveBuffs[buffId]
    if (buff.expiresAt <= now) {
      delete newActiveBuffs[buffId]
    }
  })
  if (Object.keys(newActiveBuffs).length !== Object.keys(useGameSessionStore.getState().activeBuffs).length) {
    useGameSessionStore.setState({ activeBuffs: newActiveBuffs })
  }
})

// Helper function to add icons to inventory items
const addIconsToInventory = (inventory: any[]): StoreItem[] => {
  return inventory.map(item => {
    // Check if icon is a valid React element
    // If icon exists but is a serialized object (not a valid React element), regenerate it
    const hasValidIcon = item.icon && 
      typeof item.icon === 'object' && 
      'type' in item.icon &&
      (typeof (item.icon as any).type === 'function' || typeof (item.icon as any).type === 'string')
    
    if (hasValidIcon) {
      return item as StoreItem
    }
    
    // Add icon based on type
    let icon: React.ReactNode
    if (item.type === ITEM_TYPE_BUFF) {
      icon = React.createElement(TrendingUpIcon)
    } else if (item.type === ITEM_TYPE_DEBUFF) {
      icon = React.createElement(TrendingDownIcon)
    } else if (item.type === ITEM_TYPE_TOOL) {
      icon = React.createElement(BuildIcon)
    } else {
      icon = React.createElement(BuildIcon)
    }
    
    return {
      ...item,
      icon
    } as StoreItem
  })
}

socket.on(serverEvents.inventoryUpdate, (data: { username: string; inventory: any[] }) => {
  const state = useGameSessionStore.getState()
  // Only update if it's our own inventory
  if (state.username === data.username) {
    // Add icons to items that don't have them (challenge rewards)
    const inventoryWithIcons = addIconsToInventory(data.inventory)
    useGameSessionStore.setState({ inventory: inventoryWithIcons })
  }
})
