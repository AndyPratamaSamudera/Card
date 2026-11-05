import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { GameState } from '@cosmic/shared';
import { socketService } from '../socket/socketService';
import { useCosmicStore } from '../store/useCosmicStore';
import { Trophy, RotateCcw, Home } from 'lucide-react';

interface MatchResultModalProps {
  gameState: GameState;
  myPlayerId: string | null;
}

export const MatchResultModal: React.FC<MatchResultModalProps> = ({ gameState, myPlayerId }) => {
  const { room, resetGameSession } = useCosmicStore();
  const winner = gameState.players.find(p => p.id === gameState.winnerPlayerId);
  const isWinner = winner?.id === myPlayerId;
  const isHost = room?.players.find(p => p.id === myPlayerId)?.isHost;

  useEffect(() => {
    // Fire confetti fanfare!
    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch {
      // Ignored if canvas not ready
    }
  }, []);

  const handleRematch = async () => {
    await socketService.rematch();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-lg bg-slate-900 border border-cyan-500/50 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-cyan-950/80 text-center">
        {/* Trophy Icon */}
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center shadow-lg shadow-amber-500/40">
          <Trophy className="w-8 h-8 text-slate-950" />
        </div>

        <div className="text-xs font-mono text-cyan-400 uppercase tracking-widest mb-1">
          MATCH FINISHED
        </div>
        <h2 className="text-3xl font-black text-white mb-2">
          {isWinner ? 'YOU ARE THE CHAMPION!' : `${winner?.username || 'An Alien'} WON!`}
        </h2>
        <p className="text-xs text-slate-300 mb-6">
          The central energy core detonated all other contenders into the cosmic void.
        </p>

        {/* Players Standings */}
        <div className="space-y-2 mb-6 text-left">
          {gameState.players.map((p, idx) => {
            const isPlayerWinner = p.id === gameState.winnerPlayerId;
            return (
              <div
                key={p.id}
                className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                  isPlayerWinner
                    ? 'border-amber-500/60 bg-amber-950/20 text-white'
                    : 'border-slate-800 bg-slate-950/50 text-slate-400'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-bold text-slate-500">#{idx + 1}</span>
                  <span className="font-bold text-sm text-white">{p.username}</span>
                  {isPlayerWinner && (
                    <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold">
                      VICTOR
                    </span>
                  )}
                </div>

                <div className="font-mono text-slate-400">
                  {p.isEliminated ? 'ELIMINATED' : 'SURVIVOR'} (⚡{p.overloadLevel}/3)
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center space-x-3">
          <button
            onClick={resetGameSession}
            className="py-3 px-5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-mono font-bold transition flex items-center space-x-2"
          >
            <Home className="w-4 h-4" />
            <span>MAIN MENU</span>
          </button>

          {isHost && (
            <button
              onClick={handleRematch}
              className="py-3 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-mono font-black shadow-lg shadow-cyan-500/40 transition flex items-center space-x-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>START REMATCH</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
