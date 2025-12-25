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
          bgcolor: 'background.paper',
          borderRadius: 3,
          border: 2,
          borderColor: 'primary.main'
        }}
      >
        <AccessTimeIcon sx={{ fontSize: 80, color: 'primary.main', mb: 3 }} />
        <Typography variant="h3" gutterBottom color="primary.main" fontWeight="bold">
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

