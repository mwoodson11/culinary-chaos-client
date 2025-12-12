import { useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useGameSessionStore } from '@/stores/gameSessionStore'
import { serverEvents } from '@/types/events'

/**
 * Component that automatically restores game session on page load/refresh
 * This should be mounted at the app level to handle session restoration
 */
function SessionRestore() {
  const navigate = useNavigate()
  const location = useLocation()
  const { loadSession, rejoinGame, socket } = useGameSessionStore()
  const hasAttemptedRestore = useRef(false)

  useEffect(() => {
    // Only attempt restore once and only if we're on home/join/create pages
    // Don't restore if we're already in a game view
    if (hasAttemptedRestore.current) return
    
    const currentPath = location.pathname
    const isGamePage = currentPath.startsWith('/game/') || currentPath === '/lobby'
    
    // If already on a game page, don't restore (might cause navigation issues)
    if (isGamePage) {
      hasAttemptedRestore.current = true
      return
    }

    // Try to restore session on mount
    const session = loadSession()
    
    if (session && session.gameid && session.username) {
      console.log('Restoring session:', session)
      hasAttemptedRestore.current = true
      
      // Wait for socket to be connected
      if (socket.connected) {
        attemptRejoin(session, navigate, rejoinGame, socket)
      } else {
        // Wait for socket connection
        socket.once('connect', () => {
          attemptRejoin(session, navigate, rejoinGame, socket)
        })
      }
    } else {
      hasAttemptedRestore.current = true
    }
  }, [location.pathname, loadSession, rejoinGame, socket, navigate])

  // This component doesn't render anything
  return null
}

function attemptRejoin(
  session: { gameid: string; username: string },
  navigate: (path: string) => void,
  rejoinGame: (request: { username: string; gameid: string }) => void,
  socket: any
) {
  // Set up rejoin success handler
  const handleRejoinSuccess = (data: { recipe?: any; gameStarted?: boolean }) => {
    console.log('Rejoin success on restore:', data)
    // Use setTimeout to ensure state is updated before navigation
    setTimeout(() => {
      // If game has started, go to game play
      if (data?.recipe || data?.gameStarted) {
        console.log('Game started, navigating to game play')
        navigate('/game/play', { replace: true })
      } else {
        // If game hasn't started, go to lobby
        console.log('Game not started, navigating to lobby')
        navigate('/lobby', { replace: true })
      }
    }, 100)
    // Clean up listeners
    socket.off(serverEvents.rejoinSuccess, handleRejoinSuccess)
    socket.off(serverEvents.error, handleError)
  }

  const handleError = (message: string) => {
    console.error('Error restoring session:', message)
    // Clear invalid session if it's a real error (not just "already connected")
    if (!message.includes('already connected')) {
      localStorage.removeItem('gameSession')
    }
    // Clean up listeners
    socket.off(serverEvents.rejoinSuccess, handleRejoinSuccess)
    socket.off(serverEvents.error, handleError)
  }

  // Set up one-time listeners
  socket.once(serverEvents.rejoinSuccess, handleRejoinSuccess)
  socket.once(serverEvents.error, handleError)

  // Attempt to rejoin the game
  rejoinGame({
    username: session.username,
    gameid: session.gameid
  })

  // Cleanup listeners after a timeout (in case events don't fire)
  setTimeout(() => {
    socket.off(serverEvents.rejoinSuccess, handleRejoinSuccess)
    socket.off(serverEvents.error, handleError)
  }, 10000)
}

export default SessionRestore

