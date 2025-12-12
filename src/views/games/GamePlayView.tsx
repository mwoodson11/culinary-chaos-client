import { Container, Typography, Paper, Grid, Box, Tabs, Tab } from '@mui/material'
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameSessionStore } from '@/stores/gameSessionStore'
import GameTimer from '@/components/GameTimer'
import { RecipeTab, StoreTab, MinigamesTab, ChallengeTab } from '@/components/tabs'
import Inventory from '@/components/Inventory'
import EventLog from '@/components/EventLog'
import PlayerStatus from '@/components/PlayerStatus'
import TimeUpScreen from '@/components/TimeUpScreen'
import ThankYouScreen from '@/components/ThankYouScreen'
import HostTimeDecisionDialog from '@/components/HostTimeDecisionDialog'
import ViewingEyeToast from '@/components/ViewingEyeToast'
import { serverEvents } from '@/types/events'
import { useBeforeUnload } from '@/hooks/useBeforeUnload'
import { useToast } from '@/hooks/useToast'
import { DEBUFF_STORE_CLOSED, DEBUFF_SOLAR_FLARE } from '@/constants'

function GamePlayView() {
  const navigate = useNavigate()
  const { isHost, players, points, playerPoints, username, socket, gameid, activeDebuffs } = useGameSessionStore()
  const { showToast, ToastContainer } = useToast()
  const [tabValue, setTabValue] = useState(0)
  const [timerExpired, setTimerExpired] = useState(false)
  const [gameEnded, setGameEnded] = useState(false)
  const [showHostDialog, setShowHostDialog] = useState(false)
  const [hasNewChallenge, setHasNewChallenge] = useState(false)
  const [viewingEyeData, setViewingEyeData] = useState<{
    targetPlayer: string
    playerInfo: any
    duration: number
  } | null>(null)
  
  // Expose showToast to the store so it can be used globally
  useEffect(() => {
    useGameSessionStore.setState({ showToast })
  }, [showToast])
  
  // Check for active debuffs that block tabs
  const now = Date.now()
  const hasStoreClosed = useMemo(() => {
    const debuff = activeDebuffs[DEBUFF_STORE_CLOSED]
    return debuff && debuff.expiresAt > now
  }, [activeDebuffs, now])
  
  const hasSolarFlare = useMemo(() => {
    const debuff = activeDebuffs[DEBUFF_SOLAR_FLARE]
    return debuff && debuff.expiresAt > now
  }, [activeDebuffs, now])
  
  // Clean up expired debuffs periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const newActiveDebuffs = { ...activeDebuffs }
      let changed = false
      Object.keys(newActiveDebuffs).forEach(debuffId => {
        const debuff = newActiveDebuffs[debuffId]
        if (debuff.expiresAt <= Date.now()) {
          delete newActiveDebuffs[debuffId]
          changed = true
        }
      })
      if (changed) {
        useGameSessionStore.setState({ activeDebuffs: newActiveDebuffs })
      }
    }, 1000) // Check every second
    
    return () => clearInterval(interval)
  }, [activeDebuffs])

  // Redirect to home if socket is connected but not connected to a game
  useEffect(() => {
    if (socket.connected && !gameid) {
      navigate('/', { replace: true })
    }
  }, [socket.connected, gameid, navigate])

  // Warn user before leaving/refreshing during an active game
  // Only enable warning if game is active and not ended
  useBeforeUnload(
    !!(!gameEnded && gameid && socket.connected),
    'Are you sure you want to leave? Your game progress will be saved, but you may miss important game events.'
  )

  // Listen for timer expiration
  useEffect(() => {
    const handleTimerExpired = () => {
      setTimerExpired(true)
      if (isHost()) {
        setShowHostDialog(true)
      }
    }

    const handleTimeAdded = () => {
      setTimerExpired(false)
      setShowHostDialog(false)
    }

    const handleGameEnded = () => {
      setGameEnded(true)
      setTimerExpired(false)
      setShowHostDialog(false)
    }

    socket.on(serverEvents.timerExpired, handleTimerExpired)
    socket.on(serverEvents.timeAdded, handleTimeAdded)
    socket.on(serverEvents.gameEnded, handleGameEnded)

    return () => {
      socket.off(serverEvents.timerExpired, handleTimerExpired)
      socket.off(serverEvents.timeAdded, handleTimeAdded)
      socket.off(serverEvents.gameEnded, handleGameEnded)
    }
  }, [socket, isHost])

  // Listen for new challenge updates (only for players)
  useEffect(() => {
    if (isHost() || !gameid) return

    const handleChallengeUpdate = (challenge: any) => {
      // If a challenge is created and player hasn't viewed it yet, mark as new
      if (challenge && challenge.status === 'waiting' && tabValue !== 3) {
        setHasNewChallenge(true)
      }
    }

    socket.on(serverEvents.challengeUpdate, handleChallengeUpdate)

    return () => {
      socket.off(serverEvents.challengeUpdate, handleChallengeUpdate)
    }
  }, [socket, gameid, isHost, tabValue])

  // Listen for Viewing Eye player info
  useEffect(() => {
    const handleViewingEyePlayerInfo = (data: { targetPlayer: string; playerInfo: any; duration: number }) => {
      setViewingEyeData(data)
    }

    socket.on(serverEvents.viewingEyePlayerInfo, handleViewingEyePlayerInfo)

    return () => {
      socket.off(serverEvents.viewingEyePlayerInfo, handleViewingEyePlayerInfo)
    }
  }, [socket])

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    // Block Store tab if Store Closed debuff is active
    if (newValue === 1 && hasStoreClosed) {
      showToast('Store Closed! You cannot access the Store Tab right now.', 'warning')
      return
    }
    
    // Block Recipe tab if Solar Flare debuff is active
    if (newValue === 0 && hasSolarFlare) {
      showToast('Solar Flare! You cannot see the Recipe Tab right now.', 'warning')
      return
    }
    
    setTabValue(newValue)
    // Clear new challenge indicator when Challenge tab is clicked
    if (newValue === 3) {
      setHasNewChallenge(false)
    }
  }

  // Show Thank You screen if game ended
  if (gameEnded) {
    return <ThankYouScreen />
  }

  // Show Time's Up screen for players when timer expires
  if (timerExpired && !isHost()) {
    return <TimeUpScreen />
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <ToastContainer />
      {viewingEyeData && (
        <ViewingEyeToast
          targetPlayer={viewingEyeData.targetPlayer}
          playerInfo={viewingEyeData.playerInfo}
          duration={viewingEyeData.duration}
          onClose={() => setViewingEyeData(null)}
        />
      )}
      <HostTimeDecisionDialog
        open={showHostDialog}
        onClose={() => setShowHostDialog(false)}
      />
      <GameTimer />
      <Grid container spacing={3}>
        {/* Host View */}
        {isHost() && (
          <>
            <Grid item xs={12} md={8}>
              <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
                <Typography variant="h5" gutterBottom>
                  Host Dashboard
                </Typography>
                <ChallengeTab />
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <PlayerStatus />
                <EventLog />
              </Box>
            </Grid>
          </>
        )}

        {/* Player View */}
        {!isHost() && (
          <Grid item xs={12} md={8}>
            <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
              <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 3 }}>
                <Tab 
                  label="Recipe" 
                  disabled={hasSolarFlare}
                  sx={hasSolarFlare ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                />
                <Tab 
                  label="Store" 
                  disabled={hasStoreClosed}
                  sx={hasStoreClosed ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                />
                <Tab label="Minigames" />
                <Tab
                  label="Challenge"
                  sx={{
                    color: hasNewChallenge ? 'error.main' : 'inherit',
                    fontWeight: hasNewChallenge ? 'bold' : 'normal',
                    '&.Mui-selected': {
                      color: hasNewChallenge ? 'error.main' : 'primary.main',
                      fontWeight: hasNewChallenge ? 'bold' : 'normal'
                    }
                  }}
                />
              </Tabs>

              {tabValue === 0 && !hasSolarFlare && <RecipeTab />}
              {tabValue === 0 && hasSolarFlare && (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="h6" color="error">
                    Solar Flare Active!
                  </Typography>
                  <Typography variant="body1" sx={{ mt: 2 }}>
                    You cannot see the Recipe Tab right now.
                  </Typography>
                </Box>
              )}
              {tabValue === 1 && !hasStoreClosed && <StoreTab />}
              {tabValue === 1 && hasStoreClosed && (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="h6" color="error">
                    Store Closed!
                  </Typography>
                  <Typography variant="body1" sx={{ mt: 2 }}>
                    You cannot access the Store Tab right now.
                  </Typography>
                </Box>
              )}
              {tabValue === 2 && <MinigamesTab />}
              {tabValue === 3 && <ChallengeTab />}
            </Paper>
          </Grid>
        )}

        {/* Sidebar - Common for both host and players */}
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 3, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Players
            </Typography>
            {players
              .filter(player => player !== 'Host') // Exclude host from display
              .map((player, index) => (
                <Box key={index} sx={{ mb: 1, display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body1">
                    {player} {player === username && '(You)'}
                  </Typography>
                  <Typography variant="body1" color="primary" fontWeight="bold">
                    {playerPoints[player] || 0} pts
                  </Typography>
                </Box>
              ))}
          </Paper>
          {!isHost() && (
            <>
              <Paper elevation={3} sx={{ p: 3, mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Your Points
                </Typography>
                <Typography variant="h4" color="primary" fontWeight="bold">
                  {points}
                </Typography>
              </Paper>
              <Paper elevation={3} sx={{ p: 3 }}>
                <Inventory />
              </Paper>
            </>
          )}
        </Grid>
      </Grid>
    </Container>
  )
}

export default GamePlayView 