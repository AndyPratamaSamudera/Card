import React, { useState } from 'react';
import { GameState, Card, Player, AlienAvatarId } from '@cosmic/shared';
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
  ChevronDown,
  AlertTriangle,
  Bomb
} from 'lucide-react';

interface PokerTableView2DProps {
  gameState: GameState;
  myHand: Card[];
  myPlayerId: string | null;
}

export const PokerTableView2D: React.FC<PokerTableView2DProps> = ({
  gameState,
  myHand,
  myPlayerId
}) => {
  const { selectedCard, selectCard } = useCosmicStore();
  const [targetPickerCard, setTargetPickerCard] = useState<Card | null>(null);
  const [showEvents, setShowEvents] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const activePlayer = gameState.players.find(p => p.id === gameState.turn.activePlayerId);
  const isMyTurn = gameState.turn.activePlayerId === myPlayerId;
  const myPlayer = gameState.players.find(p => p.id === myPlayerId);

  // Other players seated around the table
  const opponents = gameState.players.filter(p => p.id !== myPlayerId);

  const ratio = Math.min(1.2, gameState.coreTotal / (gameState.overloadLimit || 1));
  const remainingHeadroom = Math.max(0, gameState.overloadLimit - gameState.coreTotal);

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

  // Helper for rendering stylized alien portrait
  const renderAlienAvatar = (avatarId: AlienAvatarId, overloadLevel: number, isEliminated: boolean) => {
    const isSwollen = overloadLevel === 1;
    const isJittering = overloadLevel === 2;

    const baseColor =
      avatarId === 'alien_zorblax' ? '#22c55e' :
      avatarId === 'alien_vex' ? '#a855f7' :
      avatarId === 'alien_blobbo' ? '#f97316' : '#38bdf8';

    return (
      <div className={`relative flex items-center justify-center transition-transform ${isJittering ? 'animate-wiggle' : ''}`}>
        <div
          className={`w-14 h-14 rounded-full flex items-center justify-center border-2 shadow-lg transition-transform ${
            isEliminated
              ? 'opacity-30 grayscale border-slate-700 bg-slate-900'
              : isSwollen
              ? 'scale-125 border-amber-400 bg-amber-950/40'
              : isJittering
              ? 'scale-110 border-red-500 bg-red-950/60 shadow-red-500/50'
              : 'border-cyan-400/80 bg-slate-900'
          }`}
          style={{
            borderColor: isEliminated ? '#475569' : isJittering ? '#ef4444' : isSwollen ? '#f59e0b' : baseColor
          }}
        >
          {/* Stylized Alien Face */}
          {avatarId === 'alien_zorblax' ? (
            <div className="flex flex-col items-center">
              <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center border border-slate-900">
                <div className={`w-2.5 h-2.5 rounded-full ${overloadLevel > 0 ? 'bg-red-500' : 'bg-green-600'}`} />
              </div>
              <div className="w-4 h-1 bg-green-400 rounded-full mt-1" />
            </div>
          ) : avatarId === 'alien_vex' ? (
            <div className="flex flex-col items-center">
              <div className="flex space-x-1 mb-0.5">
                <div className="w-1 h-2 bg-purple-400 rounded-full transform -rotate-12" />
                <div className="w-1 h-2 bg-purple-400 rounded-full transform rotate-12" />
              </div>
              <div className="flex space-x-2">
                <div className="w-2.5 h-2.5 rounded-full bg-pink-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-pink-400" />
              </div>
            </div>
          ) : avatarId === 'alien_blobbo' ? (
            <div className="flex flex-col items-center">
              <div className="flex space-x-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-white flex items-center justify-center">
                  <div className="w-1 h-1 bg-black rounded-full" />
                </div>
                <div className="w-2 h-2 rounded-full bg-white flex items-center justify-center">
                  <div className="w-1 h-1 bg-black rounded-full" />
                </div>
              </div>
              <div className={`w-3 h-1.5 rounded-full ${overloadLevel > 0 ? 'bg-red-500' : 'bg-orange-400'}`} />
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-6 h-6 rounded-full bg-cyan-400/20 border border-cyan-300 flex items-center justify-center">
                <span className="text-cyan-200 text-xs">✦</span>
              </div>
            </div>
          )}
        </div>

        {/* Ejected X mark */}
        {isEliminated && (
          <div className="absolute inset-0 flex items-center justify-center text-red-500 font-black text-2xl font-mono">
            ✕
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between pt-16 pb-4 px-4 bg-gradient-to-b from-[#060814] via-[#091124] to-[#04060d] select-none overflow-hidden font-sans">
      {/* Target Picker Modal */}
      {targetPickerCard && (
        <TargetPickerModal
          card={targetPickerCard}
          players={gameState.players}
          myPlayerId={myPlayerId}
          onSelectTarget={(targetId) => handlePlaySelectedCard(targetPickerCard, targetId)}
          onCancel={() => setTargetPickerCard(null)}
        />
      )}

      {/* Floating Match Log Drawer Toggle (Top Right) */}
      <div className="absolute top-16 right-4 z-30">
        <button
          onClick={() => setShowEvents(!showEvents)}
          className="bg-slate-900/90 border border-cyan-500/30 hover:border-cyan-400 text-xs font-mono text-cyan-300 px-3 py-1.5 rounded-xl flex items-center space-x-1.5 shadow-lg backdrop-blur-md transition"
        >
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span>Match Log ({gameState.lastEvents.length})</span>
          {showEvents ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showEvents && (
          <div className="mt-2 w-80 max-h-64 overflow-y-auto bg-slate-950/95 border border-cyan-800/60 rounded-2xl p-3 shadow-2xl text-[11px] font-mono space-y-2 backdrop-blur-md">
            {gameState.lastEvents.length === 0 ? (
              <div className="text-slate-600">No events recorded</div>
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

      {/* TOP AREA: Opponents Seated Around the Table */}
      <div className="w-full max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-3 sm:gap-6 pt-1 z-10">
        {opponents.map((p) => {
          const isPlayerActive = gameState.turn.activePlayerId === p.id;
          return (
            <div
              key={p.id}
              className={`relative flex items-center space-x-3 px-3 py-2 rounded-2xl border transition-all ${
                isPlayerActive
                  ? 'bg-cyan-950/70 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)] ring-2 ring-cyan-400/50 scale-105'
                  : 'bg-slate-900/70 border-slate-800/80 hover:border-slate-700'
              } ${p.isEliminated ? 'opacity-40 grayscale' : ''}`}
            >
              {/* Turn Spotlight Beacon */}
              {isPlayerActive && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-cyan-500 text-slate-950 text-[9px] font-mono font-black rounded-full uppercase tracking-wider animate-pulse">
                  PLAYING NOW
                </span>
              )}

              {/* Avatar */}
              {renderAlienAvatar(p.avatarId, p.overloadLevel, p.isEliminated)}

              {/* Info Column */}
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-bold text-white truncate max-w-[90px] sm:max-w-[120px]">
                    {p.username}
                  </span>
                  {p.isAI && (
                    <span className="text-[9px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/40 px-1 py-0.2 rounded">
                      BOT
                    </span>
                  )}
                  {p.hasShield && (
                    <span title="Plasma Shield Active">
                      <Shield className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400/30" />
                    </span>
                  )}
                  {p.timeBombTurnsRemaining !== null && (
                    <span title={`Time Bomb: ${p.timeBombTurnsRemaining} turns left`} className="flex items-center text-red-400 text-[10px] font-mono animate-bounce">
                      <Bomb className="w-3 h-3 mr-0.5" />
                      {p.timeBombTurnsRemaining}
                    </span>
                  )}
                </div>

                {/* Overload Level Striker Battery */}
                <div className="flex items-center space-x-1 mt-1">
                  <span className="text-[10px] text-slate-400 font-mono">OVERLOAD:</span>
                  <div className="flex space-x-1">
                    {[1, 2, 3].map((lvl) => (
                      <div
                        key={lvl}
                        className={`w-3 h-3 rounded-full border transition-all ${
                          p.overloadLevel >= lvl
                            ? 'bg-red-500 border-red-400 shadow-[0_0_6px_#ef4444]'
                            : 'bg-slate-950 border-slate-700'
                        }`}
                        title={`Overload Level ${lvl}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Hand cards representation */}
                <div className="flex items-center space-x-1 mt-1">
                  <span className="text-[10px] text-slate-400 font-mono">CARDS:</span>
                  <div className="flex -space-x-1.5">
                    {Array.from({ length: Math.min(6, p.cardsInHandCount) }).map((_, i) => (
                      <div
                        key={i}
                        className="w-3.5 h-5 rounded-sm bg-gradient-to-tr from-cyan-900 to-slate-800 border border-cyan-500/40 shadow-sm"
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-cyan-300 font-mono ml-1 font-bold">
                    {p.cardsInHandCount}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CENTER AREA: THE POKER TABLE FELT & CORE REACTOR */}
      <div className="relative my-auto w-full max-w-4xl mx-auto flex items-center justify-center">
        {/* Oval Poker Table Felt Surface */}
        <div className="relative w-full aspect-[21/9] max-h-[290px] rounded-[140px] bg-gradient-to-b from-[#0a1b2a] via-[#091522] to-[#060c14] border-4 border-[#1e3a5f] shadow-[0_0_60px_rgba(6,182,212,0.15)] flex items-center justify-center p-4">
          {/* Inner Neon Felt Rail */}
          <div className="absolute inset-2 sm:inset-3 rounded-[130px] border border-cyan-500/30 pointer-events-none" />

          {/* Table Direction Flow Indicator (Left and Right Rails) */}
          <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col items-center text-cyan-500/60 font-mono text-[10px]">
            <RotateCcw className={`w-5 h-5 ${gameState.turn.direction === 'CLOCKWISE' ? '' : 'scale-x-[-1]'}`} />
            <span className="mt-0.5">{gameState.turn.direction === 'CLOCKWISE' ? 'CW' : 'CCW'}</span>
          </div>

          <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col items-center text-cyan-500/60 font-mono text-[10px]">
            <RotateCcw className={`w-5 h-5 ${gameState.turn.direction === 'CLOCKWISE' ? '' : 'scale-x-[-1]'}`} />
            <span className="mt-0.5">{gameState.turn.direction === 'CLOCKWISE' ? 'CW' : 'CCW'}</span>
          </div>

          {/* Table Center: The Core Pot & Last Played Card */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 z-10">
            {/* The Central Energy Core Gauge */}
            <div className="flex flex-col items-center text-center">
              <div className="text-[10px] sm:text-xs font-mono font-bold tracking-widest text-cyan-400 uppercase mb-1">
                CENTRAL CORE TOTAL
              </div>

              {/* Big Bold Gauge Circle */}
              <div
                className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-full flex flex-col items-center justify-center border-4 bg-slate-950/90 shadow-2xl transition-all duration-500 ${
                  ratio >= 0.85
                    ? 'border-red-500 shadow-[0_0_35px_#ef4444] animate-pulse'
                    : ratio >= 0.6
                    ? 'border-amber-400 shadow-[0_0_25px_#f59e0b]'
                    : 'border-cyan-400 shadow-[0_0_25px_#06b6d4]'
                }`}
              >
                {/* Core Total Number */}
                <div
                  className={`text-4xl sm:text-5xl font-black font-mono tracking-tight ${
                    ratio >= 0.85 ? 'text-red-400' : ratio >= 0.6 ? 'text-amber-400' : 'text-cyan-300'
                  }`}
                >
                  {gameState.coreTotal}
                </div>

                {/* Overload Limit Text */}
                <div className="text-[11px] font-mono text-slate-400 font-bold mt-0.5">
                  / {gameState.overloadLimit} LIMIT
                </div>

                {/* Remaining safe room */}
                <div
                  className={`text-[9px] font-mono font-bold uppercase mt-1 px-2 py-0.5 rounded-full ${
                    remainingHeadroom <= 5
                      ? 'bg-red-500/20 text-red-300'
                      : remainingHeadroom <= 10
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-cyan-500/20 text-cyan-300'
                  }`}
                >
                  {remainingHeadroom === 0 ? 'CRITICAL LIMIT' : `${remainingHeadroom} PTS TO DETONATION`}
                </div>
              </div>

              {/* Multiplier Boost Badge */}
              {gameState.turn.multiplier > 1 && (
                <div className="mt-2 inline-flex items-center space-x-1 px-2.5 py-0.5 bg-amber-500/20 border border-amber-500 text-amber-300 rounded-full text-[10px] font-mono font-black animate-pulse">
                  <Zap className="w-3 h-3" />
                  <span>{gameState.turn.multiplier}X NEXT NUMBER</span>
                </div>
              )}
            </div>

            {/* Last Played Card in Pot (Center Discard) */}
            <div className="flex flex-col items-center text-center">
              <div className="text-[10px] sm:text-xs font-mono font-bold tracking-widest text-slate-400 uppercase mb-1">
                LAST CARD IN PLAY
              </div>

              {gameState.activeCardInPlay ? (
                <div
                  className="w-20 h-28 sm:w-24 sm:h-32 rounded-xl p-2 bg-slate-950 border-2 flex flex-col justify-between shadow-xl animate-fadeIn"
                  style={{
                    borderColor: gameState.activeCardInPlay.glowColor,
                    boxShadow: `0 0 20px ${gameState.activeCardInPlay.glowColor}55`
                  }}
                >
                  <div className="flex justify-between items-center text-[9px] font-mono font-bold" style={{ color: gameState.activeCardInPlay.glowColor }}>
                    <span>{gameState.activeCardInPlay.type}</span>
                    {gameState.activeCardInPlay.type === 'NUMBER' && (
                      <span className="text-sm font-black font-mono">+{gameState.activeCardInPlay.value}</span>
                    )}
                  </div>

                  <div className="text-center my-auto">
                    <div className="text-xs font-black text-white leading-tight">
                      {gameState.activeCardInPlay.name}
                    </div>
                  </div>

                  <div className="text-[8px] text-slate-400 truncate">
                    {gameState.activeCardInPlay.description}
                  </div>
                </div>
              ) : (
                <div className="w-20 h-28 sm:w-24 sm:h-32 rounded-xl border-2 border-dashed border-slate-700/60 bg-slate-950/40 flex flex-col items-center justify-center text-slate-600 text-[10px] font-mono">
                  <span>EMPTY POT</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM AREA: PLAYER'S OWN SEAT & POKER HAND */}
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center z-20">
        {/* Player Status Ribbon & Turn Banner */}
        <div className="w-full flex items-center justify-between mb-2 px-2">
          {/* Player Identity & Overload Meter */}
          {myPlayer && (
            <div className="flex items-center space-x-3 bg-slate-950/80 border border-slate-800 px-3.5 py-1.5 rounded-2xl">
              {renderAlienAvatar(myPlayer.avatarId, myPlayer.overloadLevel, myPlayer.isEliminated)}
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-black text-white">{myPlayer.username} (You)</span>
                  {myPlayer.hasShield && (
                    <span title="Plasma Shield Active">
                      <Shield className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400/30" />
                    </span>
                  )}
                  {myPlayer.timeBombTurnsRemaining !== null && (
                    <span title={`Time Bomb: ${myPlayer.timeBombTurnsRemaining} turns left`} className="flex items-center text-red-400 text-[10px] font-mono animate-bounce">
                      <Bomb className="w-3 h-3 mr-0.5" />
                      {myPlayer.timeBombTurnsRemaining}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-1 mt-0.5">
                  <span className="text-[10px] text-slate-400 font-mono">OVERLOAD STRIKES:</span>
                  <div className="flex space-x-1">
                    {[1, 2, 3].map((lvl) => (
                      <div
                        key={lvl}
                        className={`w-3 h-3 rounded-full border ${
                          myPlayer.overloadLevel >= lvl
                            ? 'bg-red-500 border-red-400 shadow-[0_0_6px_#ef4444]'
                            : 'bg-slate-900 border-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Turn Alert & Timer */}
          <div
            className={`px-4 py-2 rounded-2xl border text-xs font-mono font-bold flex items-center space-x-2 transition ${
              isMyTurn
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.4)] animate-bounce'
                : 'bg-slate-900/80 border-slate-800 text-slate-400'
            }`}
          >
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>
              {isMyTurn ? '👉 YOUR TURN — PLAY A CARD!' : `Waiting for ${activePlayer?.username || 'Opponent'}...`}
            </span>
          </div>
        </div>

        {/* Action Error Message */}
        {actionError && (
          <div className="mb-2 px-3 py-1 bg-red-950/90 border border-red-500/60 rounded-xl text-red-200 text-xs font-mono">
            ⚠️ {actionError}
          </div>
        )}

        {/* Player's Poker Hand of Cards */}
        <div className="relative flex items-end justify-center w-full px-2 pb-1 overflow-x-auto min-h-[175px]">
          {myHand.map((card) => {
            const isSelected = selectedCard?.id === card.id;
            const willOverload =
              card.type === 'NUMBER' &&
              card.value * gameState.turn.multiplier > remainingHeadroom;

            return (
              <div
                key={card.id}
                onClick={() => handleCardClick(card)}
                className={`relative cursor-pointer transition-all duration-300 transform -ml-3 sm:-ml-2 first:ml-0 ${
                  isSelected
                    ? '-translate-y-8 scale-110 z-30'
                    : 'hover:-translate-y-4 hover:scale-105 hover:z-20'
                } ${!isMyTurn ? 'opacity-75 grayscale-[25%]' : ''}`}
              >
                {/* Card Container */}
                <div
                  className="w-28 sm:w-32 h-40 sm:h-44 rounded-2xl p-2.5 flex flex-col justify-between border-2 bg-slate-950 shadow-2xl transition"
                  style={{
                    borderColor: isSelected ? '#ffffff' : card.glowColor,
                    boxShadow: isSelected
                      ? `0 0 30px ${card.glowColor}`
                      : `0 4px 15px rgba(0,0,0,0.6)`
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
                      <span className="text-xl font-black font-mono text-white">
                        +{card.value}
                      </span>
                    )}
                  </div>

                  {/* Card Center: Art/Icon & Title */}
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

                  {/* Card Bottom: Description & Safe/Overload indicator */}
                  <div>
                    <div className="text-[9px] text-slate-300 leading-tight line-clamp-2">
                      {card.description}
                    </div>

                    {willOverload && isMyTurn && (
                      <div className="mt-1 flex items-center space-x-1 text-[8px] font-mono font-bold text-red-400 bg-red-950/60 px-1 py-0.5 rounded">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        <span>CAUTION: WILL OVERLOAD!</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Instant Play Button when selected */}
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

        {/* Hand Cards Hint */}
        <div className="text-center mt-0.5">
          <span className="text-[11px] font-mono text-slate-400">
            {isMyTurn ? 'CLICK ANY CARD TO PLAY' : 'OPPONENT IS CONSIDERING THEIR MOVE...'}
          </span>
        </div>
      </div>
    </div>
  );
};
