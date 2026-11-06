import React, { useEffect, useState } from 'react';
import { useCosmicStore } from './store/useCosmicStore';
import { socketService } from './socket/socketService';
import { Navbar } from './components/Navbar';
import { MainMenu } from './components/MainMenu';
import { LobbyView } from './components/LobbyView';
import { PokerTableView2D } from './components/PokerTableView2D';
import { GameScene } from './canvas/GameScene';
import { GameHUD } from './components/GameHUD';
import { MatchResultModal } from './components/MatchResultModal';
import { HowToPlayModal } from './components/HowToPlayModal';

export const App: React.FC = () => {
  const { currentView, viewMode, gameState, myHand, myPlayerId } = useCosmicStore();
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  useEffect(() => {
    socketService.init();
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-cosmic-dark text-slate-100 select-none font-sans">
      {/* Top Navbar */}
      <Navbar onOpenHowToPlay={() => setShowHowToPlay(true)} />

      {/* View Switching */}
      {currentView === 'MAIN_MENU' && <MainMenu />}

      {currentView === 'LOBBY' && <LobbyView />}

      {currentView === 'GAME' && gameState && (
        viewMode === '2D' ? (
          /* Clean, High-Readability 2D Poker Table Arena (Default) */
          <PokerTableView2D
            gameState={gameState}
            myHand={myHand}
            myPlayerId={myPlayerId}
          />
        ) : (
          /* 3D WebGL Tabletop Arena with Orbit Controls */
          <>
            <GameScene gameState={gameState} myPlayerId={myPlayerId} />
            <GameHUD
              gameState={gameState}
              myHand={myHand}
              myPlayerId={myPlayerId}
            />
          </>
        )
      )}

      {/* Match Result Overlay */}
      {gameState?.winnerPlayerId && (
        <MatchResultModal gameState={gameState} myPlayerId={myPlayerId} />
      )}

      {/* How To Play Modal */}
      {showHowToPlay && <HowToPlayModal onClose={() => setShowHowToPlay(false)} />}
    </div>
  );
};

export default App;
