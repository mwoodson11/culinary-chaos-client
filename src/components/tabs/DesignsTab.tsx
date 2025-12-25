import { Box, Typography, Grid, Card, CardMedia, CardContent, Button, Chip } from '@mui/material'
import { useState, useEffect } from 'react'
import { useGameSessionStore } from '@/stores/gameSessionStore'
import { clientEvents, serverEvents } from '@/types/events'
import LockIcon from '@mui/icons-material/Lock'
import LockOpenIcon from '@mui/icons-material/LockOpen'
import christmasBakeShapesData from '@/data/christmasBakeShapes.json'
import { GAME_TYPE_CHRISTMAS_BAKE } from '@/constants'

interface CookieShape {
  id: string
  name: string
  image: string
}

function DesignsTab() {
  const { gameType, socket, gameid, username, points, selectedRecipe, unlockedDesigns, isHost } = useGameSessionStore()
  const isChristmasBake = gameType === GAME_TYPE_CHRISTMAS_BAKE
  const [localUnlockedDesigns, setLocalUnlockedDesigns] = useState<string[]>(unlockedDesigns || [])

  // Get selected shapes from recipe (host selected up to 3)
  const selectedShapeIds = selectedRecipe?.selectedShapes || []

  useEffect(() => {
    if (!isChristmasBake) return

    const handleDesignUnlocked = (data: { shapeId: string; unlocked: boolean }) => {
      if (data.unlocked) {
        setLocalUnlockedDesigns(prev => {
          if (!prev.includes(data.shapeId)) {
            return [...prev, data.shapeId]
          }
          return prev
        })
        useGameSessionStore.setState({ unlockedDesigns: [...localUnlockedDesigns, data.shapeId] })
      }
    }

    socket.on(serverEvents.designUnlocked, handleDesignUnlocked)

    return () => {
      socket.off(serverEvents.designUnlocked, handleDesignUnlocked)
    }
  }, [isChristmasBake, socket, localUnlockedDesigns])

  const handlePurchaseDesign = (shapeId: string) => {
    if (!gameid || !username) return
    socket.emit(clientEvents.purchaseDesign, { gameid, username, shapeId })
  }

  if (!isChristmasBake) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h6" color="text.secondary">
          Designs tab is only available in Christmas Bake mode.
        </Typography>
      </Box>
    )
  }

  if (selectedShapeIds.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h6" color="text.secondary">
          Waiting for host to select cookie shapes...
        </Typography>
      </Box>
    )
  }

  // Filter shapes to only show the ones selected by the host
  const availableShapes = (christmasBakeShapesData as CookieShape[]).filter(shape => 
    selectedShapeIds.includes(shape.id)
  )

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
        Cookie Designs
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Unlock cookie shapes to view design examples. Each design costs 100 points.
      </Typography>
      
      <Grid container spacing={3}>
        {availableShapes.map((shape, index) => {
          const isUnlocked = isHost() || localUnlockedDesigns.includes(shape.id)
          const canAfford = points >= 100
          const designNumber = index + 1
          
          return (
            <Grid item xs={12} sm={6} md={4} key={shape.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  border: isUnlocked ? 2 : 1,
                  borderColor: isUnlocked ? 'success.main' : 'divider'
                }}
              >
                {isUnlocked ? (
                  <>
                    <CardMedia
                      component="img"
                      height="250"
                      image={shape.image}
                      alt={shape.name}
                      sx={{ objectFit: 'cover' }}
                    />
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="h6" component="div">
                          {shape.name}
                        </Typography>
                        <Chip label="Unlocked" color="success" size="small" icon={<LockOpenIcon />} />
                      </Box>
                    </CardContent>
                  </>
                ) : (
                  <>
                    <Box
                      sx={{
                        height: 250,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'grey.200',
                        position: 'relative'
                      }}
                    >
                      <LockIcon sx={{ fontSize: 64, color: 'text.secondary' }} />
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          bgcolor: 'rgba(0, 0, 0, 0.5)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <LockIcon sx={{ fontSize: 64, color: 'white' }} />
                      </Box>
                    </Box>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" component="div" gutterBottom>
                        Design #{designNumber}
                      </Typography>
                      <Button
                        variant="contained"
                        color="primary"
                        fullWidth
                        onClick={() => handlePurchaseDesign(shape.id)}
                        disabled={!canAfford}
                        startIcon={<LockOpenIcon />}
                        sx={{ mt: 2 }}
                      >
                        Unlock Design (100 points)
                      </Button>
                      {!canAfford && (
                        <Typography variant="body2" color="error" sx={{ mt: 1, textAlign: 'center' }}>
                          You need {100 - points} more points to unlock this design.
                        </Typography>
                      )}
                    </CardContent>
                  </>
                )}
              </Card>
            </Grid>
          )
        })}
      </Grid>
    </Box>
  )
}

export default DesignsTab

