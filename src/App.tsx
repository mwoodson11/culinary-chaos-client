import { Outlet } from 'react-router-dom'
import { Box } from '@mui/material'
import SessionRestore from './components/SessionRestore'

function App() {
  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      <SessionRestore />
      <Outlet />
    </Box>
  )
}

export default App 