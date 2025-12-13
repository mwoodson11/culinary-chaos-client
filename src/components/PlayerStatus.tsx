import { Typography, Box, Paper, Chip, Divider, IconButton, TextField, Tooltip } from '@mui/material'
import { useState, useEffect } from 'react'
import { useGameSessionStore } from '@/stores/gameSessionStore'
import { serverEvents, clientEvents } from '@/types/events'
import BuildIcon from '@mui/icons-material/Build'
import LocalDiningIcon from '@mui/icons-material/LocalDining'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'

interface PlayerData {
  username: string
  points: number
  tools: any[]
  ingredients: any[]
  activeBuffs: any[]
  activeDebuffs: any[]
}

function PlayerStatus() {
  const { socket, gameid, isHost, role } = useGameSessionStore()
  const [playerData, setPlayerData] = useState<PlayerData[]>([])
  const [pointsInputs, setPointsInputs] = useState<Record<string, string>>({})

  useEffect(() => {
    // Use role directly instead of isHost() function to avoid dependency issues
    if (role !== 'host' || !gameid) return

    // Request player status on mount and periodically
    const requestStatus = () => {
      socket.emit(clientEvents.getPlayerStatus, { gameid })
    }

    requestStatus()
    const interval = setInterval(requestStatus, 2000) // Update every 2 seconds

    const handlePlayerStatus = (data: { players: PlayerData[] }) => {
      setPlayerData(data.players)
    }

    // Also listen to pointsUpdate events to update immediately when points change
    const handlePointsUpdate = (data: { username: string; points: number }) => {
      setPlayerData(prev => 
        prev.map(player => 
          player.username === data.username 
            ? { ...player, points: data.points }
            : player
        )
      )
    }

    // Listen to buff/debuff applied events to refresh player status immediately
    const handleBuffApplied = () => {
      // Request fresh player status when a buff is applied
      socket.emit(clientEvents.getPlayerStatus, { gameid })
    }

    const handleDebuffApplied = () => {
      // Request fresh player status when a debuff is applied
      socket.emit(clientEvents.getPlayerStatus, { gameid })
    }

    // Listen to inventory updates to refresh player status when items are stolen
    const handleInventoryUpdate = (_data: { username: string; inventory: any[] }) => {
      // Refresh player status when any player's inventory changes
      socket.emit(clientEvents.getPlayerStatus, { gameid })
    }

    socket.on(serverEvents.playerStatus, handlePlayerStatus)
    socket.on(serverEvents.pointsUpdate, handlePointsUpdate)
    socket.on(serverEvents.buffApplied, handleBuffApplied)
    socket.on(serverEvents.debuffApplied, handleDebuffApplied)
    socket.on(serverEvents.inventoryUpdate, handleInventoryUpdate)

    return () => {
      clearInterval(interval)
      socket.off(serverEvents.playerStatus, handlePlayerStatus)
      socket.off(serverEvents.pointsUpdate, handlePointsUpdate)
      socket.off(serverEvents.buffApplied, handleBuffApplied)
      socket.off(serverEvents.debuffApplied, handleDebuffApplied)
      socket.off(serverEvents.inventoryUpdate, handleInventoryUpdate)
    }
  }, [socket, gameid, role])

  if (!isHost()) {
    return null
  }

  if (playerData.length === 0) {
    return (
      <Paper elevation={3} sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Player Status
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
          No players in the game yet.
        </Typography>
      </Paper>
    )
  }

  return (
    <Paper elevation={3} sx={{ p: 2, maxHeight: 600, overflow: 'auto' }}>
      <Typography variant="h6" gutterBottom>
        Player Status
      </Typography>
      <Divider sx={{ mb: 2 }} />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {playerData.map((player) => {
          const handleAdjustPoints = (amount: number) => {
            // Get fresh gameid from store to avoid stale closure values
            const currentGameid = useGameSessionStore.getState().gameid
            if (!currentGameid) {
              console.error('Cannot adjust points: gameid is undefined')
              alert('Error: Game ID not found. Please refresh the page.')
              return
            }
            
            socket.emit(clientEvents.adjustPlayerPoints, {
              gameid: currentGameid,
              username: player.username,
              amount
            })
            setPointsInputs(prev => ({ ...prev, [player.username]: '' }))
          }

          const handleCustomPoints = () => {
            const pointsInput = pointsInputs[player.username] || ''
            const amount = parseInt(pointsInput)
            if (!isNaN(amount) && amount !== 0) {
              handleAdjustPoints(amount)
            }
          }

          return (
            <Box key={player.username}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  {player.username}
                </Typography>
                <Typography variant="body2" color="primary" fontWeight="bold">
                  {player.points} pts
                </Typography>
              </Box>

              {/* Points Adjustment Controls */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                <Tooltip title="Add 10 points">
                  <IconButton 
                    size="small" 
                    color="success" 
                    onClick={() => handleAdjustPoints(10)}
                    sx={{ border: '1px solid', borderColor: 'success.main' }}
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Subtract 10 points">
                  <IconButton 
                    size="small" 
                    color="error" 
                    onClick={() => handleAdjustPoints(-10)}
                    sx={{ border: '1px solid', borderColor: 'error.main' }}
                  >
                    <RemoveIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <TextField
                  size="small"
                  type="number"
                  placeholder="Custom"
                  value={pointsInputs[player.username] || ''}
                  onChange={(e) => setPointsInputs(prev => ({ ...prev, [player.username]: e.target.value }))}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleCustomPoints()
                    }
                  }}
                  sx={{ width: 80 }}
                  inputProps={{ 
                    style: { textAlign: 'center' },
                    min: -9999,
                    max: 9999
                  }}
                />
                <Tooltip title="Apply custom amount">
                  <span>
                    <IconButton 
                      size="small" 
                      onClick={handleCustomPoints}
                      disabled={!pointsInputs[player.username] || isNaN(parseInt(pointsInputs[player.username])) || parseInt(pointsInputs[player.username]) === 0}
                    >
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>

            {/* Tools */}
            {player.tools.length > 0 && (
              <Box sx={{ mb: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  Tools:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {player.tools.map((tool) => (
                    <Chip
                      key={tool.id}
                      icon={<BuildIcon />}
                      label={tool.name}
                      size="small"
                      color="default"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>
            )}

            {/* Active Buffs */}
            {player.activeBuffs.length > 0 && (
              <Box sx={{ mb: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  Active Buffs:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {player.activeBuffs.map((buff) => (
                    <Chip
                      key={buff.id}
                      icon={<TrendingUpIcon />}
                      label={buff.name}
                      size="small"
                      color="success"
                      variant="filled"
                    />
                  ))}
                </Box>
              </Box>
            )}

            {/* Active Debuffs */}
            {player.activeDebuffs.length > 0 && (
              <Box sx={{ mb: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  Active Debuffs:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {player.activeDebuffs.map((debuff) => (
                    <Chip
                      key={debuff.id}
                      icon={<TrendingDownIcon />}
                      label={debuff.name}
                      size="small"
                      color="error"
                      variant="filled"
                    />
                  ))}
                </Box>
              </Box>
            )}

            {player.tools.length === 0 && player.activeBuffs.length === 0 && player.activeDebuffs.length === 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', mb: 1 }}>
                No tools or active effects
              </Typography>
            )}

            {/* Ingredients */}
            {player.ingredients && player.ingredients.length > 0 && (
              <Box sx={{ mb: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  Ingredients:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {player.ingredients.map((ingredient) => (
                    <Chip
                      key={ingredient.id}
                      icon={<LocalDiningIcon />}
                      label={ingredient.name}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>
            )}

            <Divider sx={{ mt: 2 }} />
          </Box>
        )
        })}
      </Box>
    </Paper>
  )
}

export default PlayerStatus

