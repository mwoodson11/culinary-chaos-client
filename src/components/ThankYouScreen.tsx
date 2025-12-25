import { Typography, Paper, Container, Button } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'

function ThankYouScreen() {
  const navigate = useNavigate()

  const handleGoHome = () => {
    navigate('/')
  }

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
        <CheckCircleIcon sx={{ fontSize: 80, color: 'primary.main', mb: 3 }} />
        <Typography variant="h3" gutterBottom color="primary.main" fontWeight="bold">
          Thank You for Playing!
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mt: 2, mb: 4 }}>
          We hope you had a great time!
        </Typography>
        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={handleGoHome}
          sx={{ mt: 2, px: 4, py: 1.5 }}
        >
          Return to Home
        </Button>
      </Paper>
    </Container>
  )
}

export default ThankYouScreen

