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
    try {
      confetti({
        particleCount: 100,
        spread: 70,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-[#141820] border border-slate-700 rounded-2xl p-6 text-center shadow-2xl">
        {/* Trophy Icon */}
        <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400">
          <Trophy className="w-6 h-6" />
        </div>

        <div className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-1">
          PERMAINAN BERAKHIR
        </div>
        <h2 className="text-2xl font-black text-white mb-1">
          {isWinner ? 'SELAMAT, KAMU MENANG!' : `${winner?.username || 'Pemain'} MENANG!`}
        </h2>
        <p className="text-xs text-slate-400 mb-5">
          Pemain terakhir yang berhasil bertahan di meja tanpa tereliminasi Overload.
        </p>

        {/* Players Standings */}
        <div className="space-y-1.5 mb-5 text-left">
          {gameState.players.map((p, idx) => {
            const isPlayerWinner = p.id === gameState.winnerPlayerId;
            return (
              <div
                key={p.id}
                className={`p-2.5 rounded-lg border flex items-center justify-between text-xs ${
                  isPlayerWinner
                    ? 'border-amber-500/60 bg-amber-950/20 text-white'
                    : 'border-slate-800 bg-[#0e1117] text-slate-400'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-bold text-slate-500">#{idx + 1}</span>
                  <span className="font-bold text-white">{p.username}</span>
                  {isPlayerWinner && (
                    <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-bold">
                      JUARA
                    </span>
                  )}
                </div>

                <div className="font-mono text-[11px] text-slate-400">
                  {p.isEliminated ? 'TERELIMINASI' : 'BERTAHAN'} (⚡{p.overloadLevel}/3)
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center space-x-2.5">
          <button
            onClick={resetGameSession}
            className="py-2 px-4 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-mono font-bold transition flex items-center space-x-1.5"
          >
            <Home className="w-3.5 h-3.5" />
            <span>MENU UTAMA</span>
          </button>

          {isHost && (
            <button
              onClick={handleRematch}
              className="py-2 px-5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-mono font-bold shadow transition flex items-center space-x-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>MAIN LAGI</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
