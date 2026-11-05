import React from 'react';
import { X, Flame, Shield, HelpCircle } from 'lucide-react';
import { SPECIAL_CARDS_BLUEPRINTS, SpecialCardId } from '@cosmic/shared';

interface HowToPlayModalProps {
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-slate-900 border border-cyan-500/50 rounded-3xl p-6 shadow-2xl shadow-cyan-950/80">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center space-x-2">
            <HelpCircle className="w-5 h-5 text-cyan-400" />
            <h3 className="text-xl font-black text-white">HOW TO PLAY COSMIC CHAOS</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Core Rules */}
        <div className="space-y-4 text-xs text-slate-300 mb-6">
          <div className="p-3 bg-slate-950/60 border border-cyan-500/30 rounded-xl">
            <h4 className="font-bold text-cyan-300 text-sm mb-1">1. The Overload Protocol</h4>
            <p>
              Players take turns playing cards into the central holographic core. Number cards (+1 to +10) add directly to the running Core Total. Each round has a randomized <strong>Overload Limit</strong>.
            </p>
          </div>

          <div className="p-3 bg-slate-950/60 border border-pink-500/30 rounded-xl">
            <h4 className="font-bold text-pink-300 text-sm mb-1">2. Neural Overload Strikes</h4>
            <p>
              If your card causes the Core Total to <strong>exceed the Overload Limit</strong>, you trigger a Neural Overload Detonation!
            </p>
            <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-400 font-mono">
              <li>Level 1: Alien head swells in size.</li>
              <li>Level 2: Character violently twitches and sparks.</li>
              <li>Level 3: Critical blast ejects character into space orbit (Eliminated)!</li>
            </ul>
          </div>
        </div>

        {/* 14 Special Cards Roster */}
        <h4 className="font-mono text-xs uppercase tracking-wider text-cyan-400 mb-3">
          Special Tactical Cards (14 Types)
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-6">
          {(Object.keys(SPECIAL_CARDS_BLUEPRINTS) as SpecialCardId[]).map((spcId) => {
            const card = SPECIAL_CARDS_BLUEPRINTS[spcId];
            return (
              <div
                key={spcId}
                className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 flex items-start space-x-2 text-left"
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0"
                  style={{ backgroundColor: `${card.glowColor}25`, color: card.glowColor }}
                >
                  ★
                </div>
                <div>
                  <div className="font-bold text-white text-xs" style={{ color: card.glowColor }}>
                    {card.name}
                  </div>
                  <div className="text-[11px] text-slate-400 leading-tight">
                    {card.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs font-mono rounded-xl transition"
          >
            GOT IT, LET'S PLAY!
          </button>
        </div>
      </div>
    </div>
  );
};
