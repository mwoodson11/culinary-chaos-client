import { Container, Typography, Paper, Grid, Box, Tabs, Tab, Button } from '@mui/material'
import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameSessionStore } from '@/stores/gameSessionStore'
import PlayerInfoHeader from '@/components/PlayerInfoHeader'
import HostTimerHeader from '@/components/HostTimerHeader'
import { RecipeTab, StoreTab, MinigamesTab, ChallengeTab, DesignsTab } from '@/components/tabs'
import EventLog from '@/components/EventLog'
import PlayerStatus from '@/components/PlayerStatus'
import StoreManagement from '@/components/StoreManagement'
import TimeUpScreen from '@/components/TimeUpScreen'
import ThankYouScreen from '@/components/ThankYouScreen'
import HostTimeDecisionDialog from '@/components/HostTimeDecisionDialog'
import ViewingEyeToast from '@/components/ViewingEyeToast'
import { serverEvents, clientEvents } from '@/types/events'
import { useBeforeUnload } from '@/hooks/useBeforeUnload'
import { useToast } from '@/hooks/useToast'
import { DEBUFF_STORE_CLOSED, DEBUFF_SOLAR_FLARE } from '@/constants'

function GamePlayView() {
  const navigate = useNavigate()
  const { isHost, players, playerPoints, username, socket, gameid, activeDebuffs, gameType } = useGameSessionStore()
  const { showToast, ToastContainer } = useToast()
  const [tabValue, setTabValue] = useState(0)
  const [hostTabValue, setHostTabValue] = useState(0) // Separate tab state for host
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

  // Track which challenge IDs have already been notified to prevent duplicate notifications
  const notifiedChallengeIds = useRef<Set<string>>(new Set())

  // Listen for new challenge updates (only for players)
  useEffect(() => {
    if (isHost() || !gameid) return

    const handleChallengeUpdate = (challenge: any) => {
      // If a challenge is created and player hasn't viewed it yet, mark as new
      if (challenge && challenge.status === 'waiting' && tabValue !== 3) {
        // Only notify once per challenge ID
        if (challenge.id && !notifiedChallengeIds.current.has(challenge.id)) {
          notifiedChallengeIds.current.add(challenge.id)
          setHasNewChallenge(true)
          // Show toast notification for new challenge
          showToast('A new challenge is available! Check the Challenge tab to join.', 'info')
        }
      }
    }

    socket.on(serverEvents.challengeUpdate, handleChallengeUpdate)

    return () => {
      socket.off(serverEvents.challengeUpdate, handleChallengeUpdate)
    }
  }, [socket, gameid, isHost, tabValue, showToast])

  // Listen for challenge completion notifications
  useEffect(() => {
    if (!gameid) return

    const handleChallengeComplete = (data: { challengeId: string; winner: string; reward: any }) => {
      if (!data.winner) return

      // Determine reward points
      let pointsWon = 0
      if (data.reward && data.reward.type === 'points') {
        pointsWon = data.reward.value || 0
      }

      // Show different message for winner vs other players
      if (username === data.winner) {
        // Winner notification
        const message = pointsWon > 0 
          ? `Congratulations! You won the challenge and earned ${pointsWon} points!`
          : `Congratulations! You won the challenge!`
        showToast(message, 'success')
      } else {
        // Other players notification
        showToast(`${data.winner} won the challenge!`, 'info')
      }
    }

    socket.on(serverEvents.challengeComplete, handleChallengeComplete)

    return () => {
      socket.off(serverEvents.challengeComplete, handleChallengeComplete)
    }
  }, [socket, gameid, username, showToast])

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
    // Store tab is at index 2 for Christmas Bake, index 1 for other games
    const storeTabIndex = gameType === 'Christmas Bake' ? 2 : 1
    if (newValue === storeTabIndex && hasStoreClosed) {
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
    // Challenge tab index: 4 for Christmas Bake, 3 for other game types
    const challengeTabIndex = gameType === 'Christmas Bake' ? 4 : 3
    if (newValue === challengeTabIndex) {
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
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
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
      {!isHost() && <PlayerInfoHeader />}
      {isHost() && <HostTimerHeader />}
      <Container maxWidth="xl" sx={{ py: 4, flex: 1, mt: !isHost() ? 0 : 0 }}>
        <Grid container spacing={3}>
        {/* Host View */}
        {isHost() && (
          <>
            <Grid item xs={12} md={8}>
              <Paper elevation={3} sx={{ p: 3, minHeight: '100%', position: 'relative' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h5" gutterBottom>
                    Host Dashboard
                  </Typography>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => {
                      if (gameid && window.confirm('Are you sure you want to end the game? All players will be disconnected.')) {
                        socket.emit(clientEvents.endGame, { gameid })
                      }
                    }}
                    sx={{ ml: 2 }}
                  >
                    End Game
                  </Button>
                </Box>
                <Box
                  sx={{
                    position: 'sticky',
                    top: { xs: 56, sm: 64 }, // Account for AppBar height (56px on mobile, 64px on desktop)
                    zIndex: 100,
                    bgcolor: 'background.paper',
                    pt: 3,
                    pb: 1,
                    mb: 3,
                    mx: -3,
                    px: 3,
                    borderBottom: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  <Tabs 
                    value={hostTabValue} 
                    onChange={(_event, newValue) => setHostTabValue(newValue)}
                    sx={{ 
                      '& .MuiTabs-scrollButtons.Mui-disabled': {
                        opacity: 0.3
                      }
                    }}
                    variant="scrollable"
                    scrollButtons="auto"
                    allowScrollButtonsMobile
                  >
                    <Tab label="Challenge" />
                    <Tab label="Player Status" />
                    <Tab label="Store Management" />
                  </Tabs>
                </Box>
                {hostTabValue === 0 && <ChallengeTab />}
                {hostTabValue === 1 && <PlayerStatus />}
                {hostTabValue === 2 && <StoreManagement />}
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <EventLog />
            </Grid>
          </>
        )}

        {/* Player View */}
        {!isHost() && (
          <Grid item xs={12} md={8}>
            <Paper elevation={3} sx={{ p: 3, minHeight: '100%', position: 'relative' }}>
              <Box
                sx={{
                  position: 'sticky',
                  top: { xs: 56, sm: 64 }, // Account for AppBar height (56px on mobile, 64px on desktop)
                  zIndex: 100,
                  bgcolor: 'background.paper',
                  pt: 3,
                  pb: 1,
                  mb: 3,
                  mx: -3,
                  px: 3,
                  borderBottom: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <Tabs 
                  value={tabValue} 
                  onChange={handleTabChange} 
                  sx={{ 
                    '& .MuiTabs-scrollButtons.Mui-disabled': {
                      opacity: 0.3
                    }
                  }}
                  variant="scrollable"
                  scrollButtons="auto"
                  allowScrollButtonsMobile
                >
                  <Tab 
                    label="Recipe" 
                    disabled={hasSolarFlare}
                    sx={hasSolarFlare ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                  />
                  {gameType === 'Christmas Bake' && <Tab label="Designs" />}
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
              </Box>

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
              {gameType === 'Christmas Bake' && tabValue === 1 && <DesignsTab />}
              {gameType === 'Christmas Bake' && tabValue === 2 && !hasStoreClosed && <StoreTab />}
              {gameType === 'Christmas Bake' && tabValue === 2 && hasStoreClosed && (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="h6" color="error">
                    Store Closed!
                  </Typography>
                  <Typography variant="body1" sx={{ mt: 2 }}>
                    You cannot access the Store Tab right now.
                  </Typography>
                </Box>
              )}
              {gameType === 'Christmas Bake' && tabValue === 3 && <MinigamesTab />}
              {gameType === 'Christmas Bake' && tabValue === 4 && <ChallengeTab />}
              {gameType !== 'Christmas Bake' && tabValue === 1 && !hasStoreClosed && <StoreTab />}
              {gameType !== 'Christmas Bake' && tabValue === 1 && hasStoreClosed && (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="h6" color="error">
                    Store Closed!
                  </Typography>
                  <Typography variant="body1" sx={{ mt: 2 }}>
                    You cannot access the Store Tab right now.
                  </Typography>
                </Box>
              )}
              {gameType !== 'Christmas Bake' && tabValue === 2 && <MinigamesTab />}
              {gameType !== 'Christmas Bake' && tabValue === 3 && <ChallengeTab />}
            </Paper>
          </Grid>
        )}

        {/* Sidebar - Common for both host and players */}
        <Grid item xs={12} md={4}>
          {/* Only show Players list when Viewing Eye is active (for players) */}
          {viewingEyeData && !isHost() && (
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
          )}
        </Grid>
      </Grid>
      </Container>
    </Box>
  )
}

export default GamePlayView 