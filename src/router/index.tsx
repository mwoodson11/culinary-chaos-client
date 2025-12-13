import { createHashRouter } from 'react-router-dom'
import App from '@/App'
import HomeView from '@/views/HomeView'
import CreateGameView from '@/views/CreateGameView'
import JoinGameView from '@/views/JoinGameView'
import LobbyView from '@/views/LobbyView'
import GameIntroView from '@/views/games/GameIntroView'
import GameInstructionsView from '@/views/games/GameInstructionsView'
import GamePlayView from '@/views/games/GamePlayView'
import GameCountdownView from '@/views/games/GameCountdownView'

const router = createHashRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        path: '/',
        element: <HomeView />
      },
      {
        path: '/create',
        element: <CreateGameView />
      },
      {
        path: '/join',
        element: <JoinGameView />
      },
      {
        path: '/lobby',
        element: <LobbyView />
      },
      {
        path: '/game/intro',
        element: <GameIntroView />
      },
      {
        path: '/game/instructions',
        element: <GameInstructionsView />
      },
      {
        path: '/game/countdown',
        element: <GameCountdownView />
      },
      {
        path: '/game/play',
        element: <GamePlayView />
      }
    ]
  }
])

export default router