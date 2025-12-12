import { useNavigate } from 'react-router-dom'
import { useGameSessionStore } from '@/stores/gameSessionStore'
import GameCountdown from '@/components/GameCountdown'

function GameCountdownView() {
  const navigate = useNavigate()
  const { gameid } = useGameSessionStore()

  const handleCountdownComplete = () => {
    // Mark that this player has seen the countdown for this game
    // This will be used to add a 5-second delay to their timer
    if (gameid) {
      sessionStorage.setItem(`countdown_seen_${gameid}`, 'true')
    }
    navigate('/game/play', { replace: true })
  }

  return <GameCountdown onComplete={handleCountdownComplete} />
}

export default GameCountdownView

