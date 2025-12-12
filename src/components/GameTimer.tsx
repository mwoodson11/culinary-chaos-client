import { Typography, IconButton, Paper, Box, TextField, Tooltip } from '@mui/material'
import { useState, useEffect, useMemo, useRef } from 'react'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import { useGameSessionStore } from '@/stores/gameSessionStore'
import { clientEvents, serverEvents } from '@/types/events'

interface GameTimerProps {
  initialTime?: number // in seconds
}

function GameTimer({ initialTime }: GameTimerProps) {
  const { selectedRecipe, gameSettings } = useGameSessionStore()
  // Priority: gameSettings > recipe timeToBake > initialTime > default (3600)
  const defaultTime = useMemo(() => {
    if (gameSettings?.gameTime) {
      return gameSettings.gameTime * 60 // Convert minutes to seconds
    }
    if (selectedRecipe?.timeToBake) {
      return selectedRecipe.timeToBake * 60
    }
    return initialTime || 3600
  }, [gameSettings, selectedRecipe, initialTime])
  const [timeLeft, setTimeLeft] = useState(defaultTime)
  const [isPaused, setIsPaused] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const { socket, isHost, gameid } = useGameSessionStore()

  // Request current timer state when component mounts (for players)
  useEffect(() => {
    if (isHost() || !gameid) {
      // Host initializes immediately
      if (isHost()) {
        setIsInitialized(true)
      }
      return
    }

    // Reset initialization state when gameid changes or component remounts
    setIsInitialized(false)

    // Check if player has seen the countdown (they should get a 5-second delay)
    const hasSeenCountdown = sessionStorage.getItem(`countdown_seen_${gameid}`) === 'true'
    
    // Request current timer state from host
    socket.emit(clientEvents.requestTimerState, { gameid })

    const handleTimerState = (data: { timeLeft: number; isPaused: boolean }) => {
      console.log('Received timer state:', data)
      let adjustedTime = data.timeLeft
      
      // If player has seen the countdown, add 5 seconds to compensate for the delay
      if (hasSeenCountdown) {
        adjustedTime = data.timeLeft + 5
        // Clear the flag so we don't add the delay again
        sessionStorage.removeItem(`countdown_seen_${gameid}`)
        console.log('Player saw countdown, adding 5 seconds. Adjusted time:', adjustedTime)
      }
      
      setTimeLeft(adjustedTime)
      setIsPaused(data.isPaused)
      setIsInitialized(true)
    }

    socket.on(serverEvents.timerState, handleTimerState)

    // Also listen for timer updates in case we miss the initial state
    // This will catch updates even if we haven't received the initial state yet
    // Note: We don't adjust timer updates - only the initial state gets the 5-second adjustment
    const handleTimerUpdate = (data: { timeLeft: number; isPaused: boolean }) => {
      setTimeLeft(data.timeLeft)
      setIsPaused(data.isPaused)
      // Mark as initialized if we receive any timer update
      setIsInitialized(true)
    }

    socket.on(serverEvents.timerUpdate, handleTimerUpdate)

    // Retry request after a short delay
    const retryTimeout = setTimeout(() => {
      console.log('Retrying timer state request...')
      socket.emit(clientEvents.requestTimerState, { gameid })
    }, 2000)

    return () => {
      clearTimeout(retryTimeout)
      socket.off(serverEvents.timerState, handleTimerState)
      socket.off(serverEvents.timerUpdate, handleTimerUpdate)
    }
  }, [isHost, socket, gameid])

  const timerExpiredEmittedRef = useRef(false)
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Listen for time added event and timer state (for both host and players)
  useEffect(() => {
    const handleTimeAdded = () => {
      // Reset the expiration flag when time is added
      timerExpiredEmittedRef.current = false
      // Request updated timer state
      if (gameid) {
        socket.emit(clientEvents.requestTimerState, { gameid })
      }
    }

    // Host also needs to listen to timerState to sync when time is added
    const handleTimerState = (data: { timeLeft: number; isPaused: boolean }) => {
      const wasExpired = timeLeft <= 0
      setTimeLeft(data.timeLeft)
      setIsPaused(data.isPaused)
      // Reset expiration flag when we receive updated timer state
      timerExpiredEmittedRef.current = false
      
      // If host and timer was expired but now has time, restart the timer interval
      if (isHost() && wasExpired && data.timeLeft > 0) {
        // Clear any existing interval
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current)
          timerIntervalRef.current = null
        }
        // The main timer effect will detect timeLeft > 0 and start a new interval
      }
    }

    socket.on(serverEvents.timeAdded, handleTimeAdded)
    socket.on(serverEvents.timerState, handleTimerState)

    return () => {
      socket.off(serverEvents.timeAdded, handleTimeAdded)
      socket.off(serverEvents.timerState, handleTimerState)
    }
  }, [socket, gameid, isHost, timeLeft])

  // Track if timer start has been delayed (to avoid multiple delays)
  const timerStartDelayedRef = useRef(false)
  const delayTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Host controls the timer and broadcasts updates
  useEffect(() => {
    if (!isHost() || !gameid) return

    // Host initializes immediately with recipe time
    if (!isInitialized) {
      setTimeLeft(defaultTime)
      setIsInitialized(true)
      timerExpiredEmittedRef.current = false
      timerStartDelayedRef.current = false
      // Clear any existing delay timeout
      if (delayTimeoutRef.current) {
        clearTimeout(delayTimeoutRef.current)
        delayTimeoutRef.current = null
      }
    }

    // Clear any existing timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }

    // Delay timer start by 6 seconds on first initialization to account for player countdown
    // This ensures the timer starts when players join, not when host navigates
    if (isInitialized && !timerStartDelayedRef.current) {
      timerStartDelayedRef.current = true
      
      // Wait 6 seconds before starting the timer countdown
      delayTimeoutRef.current = setTimeout(() => {
        // Don't start if timer has expired
        const currentTime = useGameSessionStore.getState().points // Get current time from state
        setTimeLeft((current) => {
          if (current <= 0) {
            return 0
          }
          
          // Start the timer interval after delay
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current)
          }
          
          timerIntervalRef.current = setInterval(() => {
            if (!isPaused) {
              setTimeLeft((prevTime) => {
                if (prevTime <= 0) {
                  if (timerIntervalRef.current) {
                    clearInterval(timerIntervalRef.current)
                    timerIntervalRef.current = null
                  }
                  // Emit timer expiration event only once
                  if (!timerExpiredEmittedRef.current) {
                    timerExpiredEmittedRef.current = true
                    socket.emit(clientEvents.timerExpired, { gameid })
                  }
                  return 0
                }
                const newTime = prevTime - 1
                // Broadcast timer update to all players via server
                socket.emit(clientEvents.timerUpdate, { timeLeft: newTime, isPaused })
                return newTime
              })
            }
          }, 1000)
          
          return current
        })
      }, 6000) // 6 seconds delay (5 countdown + 1 "Begin!")
    }

    return () => {
      if (delayTimeoutRef.current) {
        clearTimeout(delayTimeoutRef.current)
        delayTimeoutRef.current = null
      }
      // Don't clear timerInterval here - let it run once started
    }
  }, [isPaused, isHost, socket, gameid, isInitialized, defaultTime])

  // Listen for time added event (when host adds time after expiration)
  useEffect(() => {
    const handleTimeAdded = () => {
      // Request updated timer state after time is added
      if (gameid) {
        socket.emit(clientEvents.requestTimerState, { gameid })
      }
    }

    socket.on(serverEvents.timeAdded, handleTimeAdded)

    return () => {
      socket.off(serverEvents.timeAdded, handleTimeAdded)
    }
  }, [socket, gameid])

  // Players run their own timer and listen for sync updates from host
  useEffect(() => {
    if (isHost() || !isInitialized) return

    // Listen for timer updates from server (broadcasted by host)
    const handleTimerUpdate = (data: { timeLeft: number; isPaused: boolean }) => {
      // When we receive an update from the host, immediately sync
      setTimeLeft(data.timeLeft)
      setIsPaused(data.isPaused)
    }

    socket.on(serverEvents.timerUpdate, handleTimerUpdate)

    // Run local countdown timer that syncs with host updates
    // This ensures the timer continues even if server updates are delayed
    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        // Only countdown if not paused
        if (isPaused) return prevTime
        if (prevTime <= 0) {
          clearInterval(timer)
          return 0
        }
        return prevTime - 1
      })
    }, 1000)

    return () => {
      socket.off(serverEvents.timerUpdate, handleTimerUpdate)
      clearInterval(timer)
    }
  }, [isPaused, isHost, socket, isInitialized])

  const togglePause = () => {
    if (!isHost()) return
    
    const newPausedState = !isPaused
    setIsPaused(newPausedState)
    // Emit pause/play event to sync with other players
    socket.emit(clientEvents.timerUpdate, { isPaused: newPausedState, timeLeft })
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const [timeInput, setTimeInput] = useState('')

  const handleAdjustTime = (seconds: number) => {
    if (!isHost() || !gameid) return
    
    const newTime = Math.max(0, timeLeft + seconds)
    setTimeLeft(newTime)
    socket.emit(clientEvents.adjustTimer, {
      gameid,
      timeAdjustment: seconds,
      newTime
    })
  }

  const handleCustomTime = () => {
    if (!isHost() || !gameid) return
    
    const seconds = parseInt(timeInput)
    if (!isNaN(seconds) && seconds !== 0) {
      const adjustment = seconds // This is the amount to add/subtract
      handleAdjustTime(adjustment)
      setTimeInput('')
    }
  }

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        p: 2, 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        gap: 1,
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 1000,
        minWidth: 200
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="h5" component="div" sx={{ fontFamily: 'monospace' }}>
          {formatTime(timeLeft)}
        </Typography>
        {isHost() && (
          <IconButton 
            onClick={togglePause} 
            color="primary"
            size="large"
          >
            {isPaused ? <PlayArrowIcon /> : <PauseIcon />}
          </IconButton>
        )}
      </Box>
      
      {isHost() && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Tooltip title="Add 1 minute">
            <IconButton 
              size="small" 
              color="success" 
              onClick={() => handleAdjustTime(60)}
              sx={{ border: '1px solid', borderColor: 'success.main' }}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Subtract 1 minute">
            <IconButton 
              size="small" 
              color="error" 
              onClick={() => handleAdjustTime(-60)}
              sx={{ border: '1px solid', borderColor: 'error.main' }}
            >
              <RemoveIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <TextField
            size="small"
            type="number"
            placeholder="seconds"
            value={timeInput}
            onChange={(e) => setTimeInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleCustomTime()
              }
            }}
            sx={{ width: 100 }}
            inputProps={{ 
              style: { textAlign: 'center' },
              min: 0,
              max: 9999
            }}
          />
          <Tooltip title="Apply custom time adjustment">
            <IconButton 
              size="small" 
              onClick={handleCustomTime}
              disabled={!timeInput || isNaN(parseInt(timeInput)) || parseInt(timeInput) === 0}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )}
    </Paper>
  )
}

export default GameTimer 