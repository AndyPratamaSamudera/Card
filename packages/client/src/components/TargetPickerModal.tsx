import React from 'react';
import { Player, Card } from '@cosmic/shared';
import { Shield, Crosshair } from 'lucide-react';
import { soundEngine } from '../audio/SynthAudioEngine';

interface TargetPickerModalProps {
  card: Card;
  players: Player[];
  myPlayerId: string | null;
  onSelectTarget: (targetPlayerId: string) => void;
  onCancel: () => void;
}

export const TargetPickerModal: React.FC<TargetPickerModalProps> = ({
  card,
  players,
  myPlayerId,
  onSelectTarget,
  onCancel
}) => {
  const eligibleOpponents = players.filter(p => !p.isEliminated && p.id !== myPlayerId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-[#161a22] border border-slate-700 rounded-xl p-5 shadow-2xl">
        <div className="flex items-center space-x-1.5 text-amber-400 mb-1 font-mono text-xs uppercase tracking-wider">
          <Crosshair className="w-4 h-4" />
          <span>PILIH TARGET LAWAN</span>
        </div>

        <h3 className="text-lg font-bold text-white mb-0.5">
          Memainkan: <span className="text-amber-300">{card.name}</span>
        </h3>
        <p className="text-xs text-slate-400 mb-4">{card.description}</p>

        <div className="space-y-2 mb-5">
          {eligibleOpponents.map((opponent) => (
            <button
              key={opponent.id}
              onClick={() => {
                soundEngine.playClick();
                onSelectTarget(opponent.id);
              }}
              className="w-full p-2.5 rounded-lg border border-slate-700 bg-[#0e1117] hover:border-amber-400 hover:bg-slate-800 text-left transition flex items-center justify-between"
            >
              <div>
                <div className="font-bold text-xs text-white">
                  {opponent.username}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {opponent.cardsInHandCount} kartu di tangan
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {opponent.hasShield && (
                  <Shield className="w-4 h-4 text-blue-400" />
                )}
                <span className="text-xs font-mono font-bold text-emerald-400">
                  ⚡{opponent.overloadLevel}/3
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => {
              soundEngine.playClick();
              onCancel();
            }}
            className="px-3 py-1.5 text-xs font-mono text-slate-400 hover:text-white transition"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
};
