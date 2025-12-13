import { AppBar, Toolbar, Typography, IconButton, Box, TextField, Tooltip, Collapse } from '@mui/material'
import { useState, useEffect, useMemo, useRef } from 'react'
import { useGameSessionStore } from '@/stores/gameSessionStore'
import { serverEvents, clientEvents } from '@/types/events'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'

function HostTimerHeader() {
  const { socket, gameid, selectedRecipe, gameSettings, isHost } = useGameSessionStore()
  const [timeLeft, setTimeLeft] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [timeInput, setTimeInput] = useState('')
  const [showControls, setShowControls] = useState(false)
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const timerExpiredEmittedRef = useRef(false)
  const timerStartDelayedRef = useRef(false)
  const delayTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Initialize timer state
  const defaultTime = useMemo(() => {
    if (gameSettings?.gameTime) {
      return gameSettings.gameTime * 60
    }
    if (selectedRecipe?.timeToBake) {
      return selectedRecipe.timeToBake * 60
    }
    return 3600
  }, [gameSettings, selectedRecipe])
  
  // Listen for time added event and timer state
  useEffect(() => {
    const handleTimeAdded = () => {
      timerExpiredEmittedRef.current = false
      if (gameid) {
        socket.emit(clientEvents.requestTimerState, { gameid })
      }
    }

    const handleTimerState = (data: { timeLeft: number; isPaused: boolean }) => {
      const wasExpired = timeLeft <= 0
      setTimeLeft(data.timeLeft)
      setIsPaused(data.isPaused)
      timerExpiredEmittedRef.current = false
      
      if (isHost() && wasExpired && data.timeLeft > 0) {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current)
          timerIntervalRef.current = null
        }
      }
    }

    socket.on(serverEvents.timeAdded, handleTimeAdded)
    socket.on(serverEvents.timerState, handleTimerState)

    return () => {
      socket.off(serverEvents.timeAdded, handleTimeAdded)
      socket.off(serverEvents.timerState, handleTimerState)
    }
  }, [socket, gameid, isHost, timeLeft])
  
  // Host controls the timer and broadcasts updates
  useEffect(() => {
    if (!isHost() || !gameid) return

    // Host initializes immediately with recipe time
    if (!isInitialized) {
      setTimeLeft(defaultTime)
      setIsInitialized(true)
      timerExpiredEmittedRef.current = false
      timerStartDelayedRef.current = false
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
    if (isInitialized && !timerStartDelayedRef.current) {
      timerStartDelayedRef.current = true
      
      delayTimeoutRef.current = setTimeout(() => {
        setTimeLeft((current) => {
          if (current <= 0) {
            return 0
          }
          
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
                  if (!timerExpiredEmittedRef.current) {
                    timerExpiredEmittedRef.current = true
                    socket.emit(clientEvents.timerExpired, { gameid })
                  }
                  return 0
                }
                
                // Broadcast timer update to all players
                socket.emit(clientEvents.timerUpdate, {
                  timeLeft: prevTime - 1,
                  isPaused
                })
                
                return prevTime - 1
              })
            }
          }, 1000)
          
          return current
        })
      }, 6000)
    } else if (isInitialized && timerStartDelayedRef.current) {
      // Timer has already started, just manage the interval
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
              if (!timerExpiredEmittedRef.current) {
                timerExpiredEmittedRef.current = true
                socket.emit(clientEvents.timerExpired, { gameid })
              }
              return 0
            }
            
            socket.emit(clientEvents.timerUpdate, {
              timeLeft: prevTime - 1,
              isPaused
            })
            
            return prevTime - 1
          })
        }
      }, 1000)
    }

    return () => {
      if (delayTimeoutRef.current) {
        clearTimeout(delayTimeoutRef.current)
        delayTimeoutRef.current = null
      }
    }
  }, [isPaused, isHost, socket, gameid, isInitialized, defaultTime])
  
  const togglePause = () => {
    if (!isHost()) return
    
    const newPausedState = !isPaused
    setIsPaused(newPausedState)
    socket.emit(clientEvents.timerUpdate, { isPaused: newPausedState, timeLeft })
  }

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
      handleAdjustTime(seconds)
      setTimeInput('')
    }
  }
  
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }
  
  return (
    <AppBar 
      position="sticky" 
      sx={{ 
        top: 0, 
        zIndex: 1100,
        backgroundColor: 'primary.main'
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', minHeight: '64px !important', flexWrap: 'wrap', gap: 1 }}>
        {/* Left: Timer Display and Pause/Play */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
            {formatTime(timeLeft)}
          </Typography>
          <IconButton 
            onClick={togglePause} 
            sx={{ color: 'white' }}
            size="medium"
          >
            {isPaused ? <PlayArrowIcon /> : <PauseIcon />}
          </IconButton>
        </Box>
        
        {/* Right: Expand Controls Button */}
        <IconButton 
          onClick={() => setShowControls(!showControls)}
          sx={{ color: 'white' }}
        >
          {showControls ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Toolbar>
      
      {/* Collapsible Controls */}
      <Collapse in={showControls}>
        <Box sx={{ p: 2, backgroundColor: 'primary.dark', display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Tooltip title="Add 1 minute">
            <IconButton 
              size="small" 
              sx={{ color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}
              onClick={() => handleAdjustTime(60)}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Subtract 1 minute">
            <IconButton 
              size="small" 
              sx={{ color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}
              onClick={() => handleAdjustTime(-60)}
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
            sx={{ 
              width: 100,
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'white',
                '& fieldset': {
                  borderColor: 'rgba(255,255,255,0.3)',
                },
              },
            }}
            inputProps={{ 
              style: { textAlign: 'center' },
              min: 0,
              max: 9999
            }}
          />
          <Tooltip title="Apply custom time adjustment">
            <span>
              <IconButton 
                size="small" 
                onClick={handleCustomTime}
                disabled={!timeInput || isNaN(parseInt(timeInput)) || parseInt(timeInput) === 0}
                sx={{ color: 'white' }}
              >
                <AddIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Collapse>
    </AppBar>
  )
}

export default HostTimerHeader

