import { Typography, Box, Paper, List, ListItem, ListItemText, Chip, Divider } from '@mui/material'
import { useState, useEffect } from 'react'
import { useGameSessionStore } from '@/stores/gameSessionStore'
import { serverEvents } from '@/types/events'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import BuildIcon from '@mui/icons-material/Build'
import PersonOffIcon from '@mui/icons-material/PersonOff'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import PersonIcon from '@mui/icons-material/Person'

interface GameEvent {
  id: string
  timestamp: number
  type: 'minigame' | 'purchase' | 'item_use' | 'player_disconnect' | 'player_join' | 'player_rejoin' | 'host_action'
  player: string
  message: string
  details?: any
}

function EventLog() {
  const { socket } = useGameSessionStore()
  const [events, setEvents] = useState<GameEvent[]>([])

  useEffect(() => {
    const handleGameEvent = (event: GameEvent) => {
      setEvents((prev) => [event, ...prev].slice(0, 50)) // Keep last 50 events
    }

    socket.on(serverEvents.gameEvent, handleGameEvent)

    return () => {
      socket.off(serverEvents.gameEvent, handleGameEvent)
    }
  }, [socket])

  const getEventIcon = (type: GameEvent['type']) => {
    switch (type) {
      case 'minigame':
        return <EmojiEventsIcon fontSize="small" />
      case 'purchase':
        return <ShoppingCartIcon fontSize="small" />
      case 'item_use':
        return <BuildIcon fontSize="small" />
      case 'player_disconnect':
        return <PersonOffIcon fontSize="small" />
      case 'player_join':
        return <PersonAddIcon fontSize="small" />
      case 'player_rejoin':
        return <PersonIcon fontSize="small" />
      case 'host_action':
        return <BuildIcon fontSize="small" />
      default:
        return <BuildIcon fontSize="small" />
    }
  }

  const getEventColor = (type: GameEvent['type']) => {
    switch (type) {
      case 'minigame':
        return 'primary'
      case 'purchase':
        return 'success'
      case 'item_use':
        return 'warning'
      case 'player_disconnect':
        return 'error'
      case 'player_join':
        return 'success'
      case 'player_rejoin':
        return 'info'
      case 'host_action':
        return 'info'
      default:
        return 'default'
    }
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString()
  }

  return (
    <Paper elevation={3} sx={{ p: 2, maxHeight: 600, overflow: 'auto' }}>
      <Typography variant="h6" gutterBottom>
        Event Log
      </Typography>
      <Divider sx={{ mb: 2 }} />
      {events.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          No events yet. Events will appear here as players interact with the game.
        </Typography>
      ) : (
        <List dense>
          {events.map((event) => (
            <ListItem key={event.id} sx={{ py: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
                <Box sx={{ color: `${getEventColor(event.type)}.main` }}>
                  {getEventIcon(event.type)}
                </Box>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography variant="body2" component="span" fontWeight="bold">
                        {event.player}
                      </Typography>
                      <Typography variant="body2" component="span">
                        {event.message}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      {formatTime(event.timestamp)}
                    </Typography>
                  }
                />
                <Chip
                  label={event.type.toUpperCase()}
                  size="small"
                  color={getEventColor(event.type)}
                  sx={{ ml: 'auto' }}
                />
              </Box>
            </ListItem>
          ))}
        </List>
      )}
    </Paper>
  )
}

export default EventLog

