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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-lg bg-slate-900 border border-pink-500/50 rounded-2xl p-6 shadow-2xl shadow-pink-950/60">
        <div className="flex items-center space-x-2 text-pink-400 mb-2 font-mono text-xs uppercase tracking-wider">
          <Crosshair className="w-4 h-4" />
          <span>TARGET SELECTION REQUIRED</span>
        </div>

        <h3 className="text-xl font-black text-white mb-1">
          Deploying: <span className="text-pink-400">{card.name}</span>
        </h3>
        <p className="text-xs text-slate-300 mb-6">{card.description}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {eligibleOpponents.map((opponent) => (
            <button
              key={opponent.id}
              onClick={() => {
                soundEngine.playClick();
                onSelectTarget(opponent.id);
              }}
              className="p-3 rounded-xl border border-slate-700 bg-slate-950/60 hover:border-pink-400 hover:bg-pink-950/20 text-left transition flex items-center justify-between group"
            >
              <div>
                <div className="font-bold text-sm text-white group-hover:text-pink-300 transition">
                  {opponent.username}
                </div>
                <div className="text-[11px] text-slate-400">
                  {opponent.cardsInHandCount} cards in hand
                </div>
              </div>

              <div className="flex items-center space-x-1.5">
                {opponent.hasShield && (
                  <span title="Plasma Shield Active">
                    <Shield className="w-4 h-4 text-cyan-400" />
                  </span>
                )}
                <span className="text-xs font-mono font-bold text-amber-400">
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
            className="px-4 py-2 text-xs font-mono text-slate-400 hover:text-white transition"
          >
            Cancel Card Play
          </button>
        </div>
      </div>
    </div>
  );
};
