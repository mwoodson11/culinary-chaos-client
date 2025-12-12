import { Container, Button, Box } from '@mui/material'
import { Link } from 'react-router-dom'

const HomeComponent = () => {
    return (
        <Container sx={{ display: 'flex', justifyContent: 'center', height: '100%' }}>
            <Box>
                <h1 style={{ textAlign: 'center' }}>Welcome to Culinary Chaos</h1>
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                >
                <Button
                    component={Link}
                    to="/create"
                    variant="contained"
                    color="primary"
                    sx={{ margin: '10px', height: '200px', width: '200px' }}
                >
                    Create Game
                </Button>
                <Button
                    component={Link}
                    to="/join"
                    variant="contained"
                    color="primary"
                    sx={{ margin: '10px', height: '200px', width: '200px' }}
                >
                    Join Game
                </Button>
                </Box>
            </Box>
        </Container>
    )
}

export default HomeComponent;