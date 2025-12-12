import { Container, Typography, Box } from '@mui/material'

function GameView() {
  return (
    <Container sx={{ display: 'flex', justifyContent: 'center', height: '100%' }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          width: '100%',
          maxWidth: 800,
          mt: 4,
        }}
      >
        <Typography variant="h4" component="h1" align="center">
          Welcome to the Baking Game
        </Typography>
        <Box
          sx={{
            position: 'relative',
            paddingTop: '56.25%', // 16:9 Aspect Ratio
            width: '100%',
            overflow: 'hidden'
          }}
        >
          <iframe
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              border: 0
            }}
            src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </Box>
        <Typography variant="body1" align="center">
          This is a test game view. Game logic will be implemented here.
        </Typography>
      </Box>
    </Container>
  )
}

export default GameView 