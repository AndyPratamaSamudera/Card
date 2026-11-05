import React, { useState } from 'react';
import { GameState, Card, Player } from '@cosmic/shared';
import { useCosmicStore } from '../store/useCosmicStore';
import { socketService } from '../socket/socketService';
import { soundEngine } from '../audio/SynthAudioEngine';
import { TargetPickerModal } from './TargetPickerModal';
import {
  RotateCcw,
  Zap,
  Clock,
  Shield,
  Layers,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

interface GameHUDProps {
  gameState: GameState;
  myHand: Card[];
  myPlayerId: string | null;
}

export const GameHUD: React.FC<GameHUDProps> = ({ gameState, myHand, myPlayerId }) => {
  const { selectedCard, selectCard } = useCosmicStore();
  const [targetPickerCard, setTargetPickerCard] = useState<Card | null>(null);
  const [showEvents, setShowEvents] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const activePlayer = gameState.players.find(p => p.id === gameState.turn.activePlayerId);
  const isMyTurn = gameState.turn.activePlayerId === myPlayerId;
  const ratio = Math.min(1, gameState.coreTotal / (gameState.overloadLimit || 1));

  const handleCardClick = (card: Card) => {
    if (!isMyTurn) return;
    setActionError(null);
    if (selectedCard?.id === card.id) {
      handlePlaySelectedCard(card);
    } else {
      selectCard(card);
    }
  };

  const handlePlaySelectedCard = async (cardToPlay: Card, targetPlayerId?: string) => {
    if (!isMyTurn || isSubmitting) return;

    if (cardToPlay.type === 'SPECIAL' && cardToPlay.requiresTarget && !targetPlayerId) {
      setTargetPickerCard(cardToPlay);
      return;
    }

    setIsSubmitting(true);
    setActionError(null);
    const res = await socketService.playCard(cardToPlay.id, targetPlayerId);
    setIsSubmitting(false);

    if (res.success) {
      selectCard(null);
      setTargetPickerCard(null);
    } else {
      setActionError(res.error || 'Failed to play card');
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-20">
      {/* Target Picker Modal */}
      {targetPickerCard && (
        <div className="pointer-events-auto">
          <TargetPickerModal
            card={targetPickerCard}
            players={gameState.players}
            myPlayerId={myPlayerId}
            onSelectTarget={(targetId) => {
              handlePlaySelectedCard(targetPickerCard, targetId);
            }}
            onCancel={() => setTargetPickerCard(null)}
          />
        </div>
      )}

      {/* Top HUD: Core Gauge, Direction, Turn Timer */}
      <div className="flex flex-col items-center w-full max-w-2xl mx-auto pointer-events-auto">
        <div className="w-full bg-slate-900/85 backdrop-blur-md border border-cyan-500/40 rounded-2xl px-5 py-3 shadow-xl flex items-center justify-between gap-4">
          {/* Overload Core Energy Status */}
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs font-mono mb-1">
              <span className="text-slate-400">CORE ENERGY STATUS</span>
              <span
                className={`font-black text-sm tracking-wider ${
                  ratio >= 0.85 ? 'text-red-400 animate-pulse' : ratio >= 0.6 ? 'text-amber-400' : 'text-cyan-400'
                }`}
              >
                {gameState.coreTotal} / {gameState.overloadLimit}
              </span>
            </div>

            {/* Meter Progress Bar */}
            <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  ratio >= 0.85
                    ? 'bg-gradient-to-r from-amber-500 to-red-500 shadow-[0_0_12px_#ef4444]'
                    : ratio >= 0.6
                    ? 'bg-gradient-to-r from-cyan-500 to-amber-500'
                    : 'bg-gradient-to-r from-blue-600 to-cyan-400'
                }`}
                style={{ width: `${Math.min(100, ratio * 100)}%` }}
              />
            </div>
          </div>

          {/* Turn Multiplier Badge */}
          {gameState.turn.multiplier > 1 && (
            <div className="flex items-center space-x-1 px-2.5 py-1 bg-amber-500/20 border border-amber-500/60 text-amber-300 rounded-lg text-xs font-mono font-black animate-pulse">
              <Zap className="w-3.5 h-3.5" />
              <span>{gameState.turn.multiplier}X BOOST</span>
            </div>
          )}

          {/* Direction Indicator */}
          <div
            title={`Direction: ${gameState.turn.direction}`}
            className="flex items-center space-x-1 px-3 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-cyan-300"
          >
            <RotateCcw
              className={`w-4 h-4 transition-transform duration-500 ${
                gameState.turn.direction === 'COUNTER_CLOCKWISE' ? 'scale-x-[-1]' : ''
              }`}
            />
            <span className="hidden sm:inline">
              {gameState.turn.direction === 'CLOCKWISE' ? 'CW' : 'CCW'}
            </span>
          </div>

          {/* Round Indicator */}
          <div className="text-right">
            <div className="text-[10px] font-mono text-slate-500">ROUND</div>
            <div className="text-sm font-black text-white font-mono">#{gameState.roundNumber}</div>
          </div>
        </div>

        {/* Turn Status Banner */}
        <div
          className={`mt-2 px-6 py-1.5 rounded-full text-xs font-mono font-bold tracking-wider shadow-lg flex items-center space-x-2 border transition ${
            isMyTurn
              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.4)] animate-bounce'
              : 'bg-slate-950/80 border-slate-800 text-slate-400'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span>
            {isMyTurn
              ? 'YOUR TURN — SELECT AND PLAY A CARD!'
              : `${activePlayer ? activePlayer.username : 'Opponent'}'s Turn...`}
          </span>
        </div>

        {/* Action Error Banner */}
        {actionError && (
          <div className="mt-1 px-3 py-1 bg-red-950/80 border border-red-500/60 rounded-lg text-red-200 text-xs font-mono">
            ⚠️ {actionError}
          </div>
        )}
      </div>

      {/* Floating Side Event Log Toggle */}
      <div className="fixed top-20 right-4 pointer-events-auto z-30">
        <button
          onClick={() => setShowEvents(!showEvents)}
          className="bg-slate-900/90 border border-slate-700 hover:border-cyan-400 text-xs text-slate-300 px-3 py-1.5 rounded-xl flex items-center space-x-1 shadow-lg backdrop-blur-md"
        >
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span>Match Log ({gameState.lastEvents.length})</span>
          {showEvents ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showEvents && (
          <div className="mt-2 w-72 max-h-64 overflow-y-auto bg-slate-950/95 border border-cyan-900/60 rounded-xl p-3 shadow-2xl text-[11px] font-mono space-y-2 backdrop-blur-md">
            {gameState.lastEvents.length === 0 ? (
              <div className="text-slate-600">No events yet</div>
            ) : (
              gameState.lastEvents.map((evt) => (
                <div key={evt.id} className="border-b border-slate-900 pb-1 text-slate-300">
                  <span className="text-cyan-400 font-bold">› </span>
                  {evt.message}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Bottom Interactive Hand Container */}
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center pointer-events-auto">
        {/* Hand Cards Arc */}
        <div className="relative flex items-end justify-center w-full px-4 pb-2 overflow-x-auto min-h-[160px]">
          {myHand.map((card, idx) => {
            const isSelected = selectedCard?.id === card.id;
            return (
              <div
                key={card.id}
                onClick={() => handleCardClick(card)}
                className={`relative cursor-pointer transition-all duration-300 transform -ml-3 sm:-ml-2 first:ml-0 ${
                  isSelected
                    ? '-translate-y-8 scale-110 z-30'
                    : 'hover:-translate-y-4 hover:scale-105 hover:z-20'
                } ${!isMyTurn ? 'opacity-70 grayscale-[30%]' : ''}`}
              >
                {/* 3D-styled Holographic Card */}
                <div
                  className="w-28 sm:w-32 h-40 sm:h-44 rounded-2xl p-2.5 flex flex-col justify-between border bg-slate-950/95 shadow-xl transition"
                  style={{
                    borderColor: isSelected ? card.glowColor : `${card.glowColor}55`,
                    boxShadow: isSelected ? `0 0 25px ${card.glowColor}88` : `0 4px 15px rgba(0,0,0,0.5)`
                  }}
                >
                  {/* Card Top: Type & Value */}
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[9px] font-mono font-bold tracking-wider uppercase px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: `${card.glowColor}25`, color: card.glowColor }}
                    >
                      {card.type}
                    </span>
                    {card.type === 'NUMBER' && (
                      <span className="text-lg font-black font-mono text-white">
                        +{card.value}
                      </span>
                    )}
                  </div>

                  {/* Card Center: Title & Artwork */}
                  <div className="text-center my-1">
                    <div
                      className="w-10 h-10 mx-auto rounded-xl flex items-center justify-center font-bold text-sm mb-1"
                      style={{
                        backgroundColor: `${card.glowColor}20`,
                        border: `1px solid ${card.glowColor}60`,
                        color: card.glowColor
                      }}
                    >
                      {card.type === 'NUMBER' ? `+${card.value}` : '★'}
                    </div>
                    <div className="text-xs font-bold text-white tracking-tight leading-tight">
                      {card.name}
                    </div>
                  </div>

                  {/* Card Bottom: Description */}
                  <div className="text-[9px] text-slate-300 leading-tight line-clamp-2">
                    {card.description}
                  </div>
                </div>

                {/* Play Button when card is selected */}
                {isSelected && isMyTurn && (
                  <div className="absolute -top-9 left-1/2 -translate-x-1/2 z-40">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlaySelectedCard(card);
                      }}
                      disabled={isSubmitting}
                      className="px-4 py-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-mono font-black text-xs shadow-lg shadow-cyan-500/50 whitespace-nowrap"
                    >
                      PLAY CARD
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Hand Cards Count & Hint */}
        <div className="text-center mt-1">
          <span className="text-[11px] font-mono text-slate-400">
            YOUR HAND ({myHand.length} CARDS) — {isMyTurn ? 'CLICK A CARD TO PLAY' : 'OPPONENT THINKING'}
          </span>
        </div>
      </div>
    </div>
  );
};
