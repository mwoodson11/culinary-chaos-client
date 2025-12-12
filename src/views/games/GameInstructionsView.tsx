import { Container, Typography, Box, Button, Paper, List, ListItem, ListItemIcon, ListItemText } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useGameSessionStore } from '@/stores/gameSessionStore'
import CakeIcon from '@mui/icons-material/Cake'
import TimerIcon from '@mui/icons-material/Timer'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import GroupIcon from '@mui/icons-material/Group'

function GameInstructionsView() {
  const navigate = useNavigate()
  const { isHost } = useGameSessionStore()

  const handleStart = () => {
    navigate('/game/play')
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" align="center" gutterBottom>
        How to Play
      </Typography>

      <Paper elevation={3} sx={{ p: 4, my: 4 }}>
        <List>
          <ListItem>
            <ListItemIcon>
              <CakeIcon color="primary" />
            </ListItemIcon>
            <ListItemText 
              primary="Bake the Perfect Cake"
              secondary="Each round, you'll be given ingredients and instructions to create a delicious cake."
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <TimerIcon color="primary" />
            </ListItemIcon>
            <ListItemText 
              primary="Time Management"
              secondary="You'll have a limited time to complete each step of the baking process."
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <GroupIcon color="primary" />
            </ListItemIcon>
            <ListItemText 
              primary="Multiplayer Fun"
              secondary="Compete with other players to create the best cake and earn points."
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <EmojiEventsIcon color="primary" />
            </ListItemIcon>
            <ListItemText 
              primary="Win Points"
              secondary="Earn points for accuracy, creativity, and speed. The player with the most points wins!"
            />
          </ListItem>
        </List>
      </Paper>

      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={handleStart}
          disabled={!isHost()}
        >
          {isHost() ? 'Start Game' : 'Waiting for Host...'}
        </Button>
      </Box>
    </Container>
  )
}

export default GameInstructionsView 