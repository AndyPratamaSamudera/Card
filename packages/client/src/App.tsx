import React, { useEffect, useState } from 'react';
import { useCosmicStore } from './store/useCosmicStore';
import { socketService } from './socket/socketService';
import { Navbar } from './components/Navbar';
import { MainMenu } from './components/MainMenu';
import { LobbyView } from './components/LobbyView';
import { GameScene } from './canvas/GameScene';
import { GameHUD } from './components/GameHUD';
import { MatchResultModal } from './components/MatchResultModal';
import { HowToPlayModal } from './components/HowToPlayModal';

export const App: React.FC = () => {
  const { currentView, gameState, myHand, myPlayerId } = useCosmicStore();
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
        <>
          {/* 3D WebGL Tabletop Arena */}
          <GameScene gameState={gameState} myPlayerId={myPlayerId} />

          {/* Interactive 2D Game HUD Overlay */}
          <GameHUD
            gameState={gameState}
            myHand={myHand}
            myPlayerId={myPlayerId}
          />
        </>
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
