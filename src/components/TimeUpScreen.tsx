import { Typography, Paper, Container } from '@mui/material'
import AccessTimeIcon from '@mui/icons-material/AccessTime'

function TimeUpScreen() {
  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Paper 
        elevation={6} 
        sx={{ 
          p: 6, 
          textAlign: 'center',
          bgcolor: 'warning.light',
          borderRadius: 3
        }}
      >
        <AccessTimeIcon sx={{ fontSize: 80, color: 'warning.main', mb: 3 }} />
        <Typography variant="h3" gutterBottom color="warning.dark" fontWeight="bold">
          Time's Up!
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
          Waiting for the host to decide...
        </Typography>
      </Paper>
    </Container>
  )
}

export default TimeUpScreen

