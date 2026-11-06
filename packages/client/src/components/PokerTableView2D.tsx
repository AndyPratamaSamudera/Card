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
  ChevronDown,
  AlertTriangle,
  Bomb
} from 'lucide-react';

interface PokerTableView2DProps {
  gameState: GameState;
  myHand: Card[];
  myPlayerId: string | null;
}

// Seat positions around the oval table (percentage based matching reference image)
const OPPONENT_SEAT_POSITIONS = [
  { top: '4%', left: '50%', transform: 'translate(-50%, -50%)' },      // Top Center
  { top: '10%', left: '22%', transform: 'translate(-50%, -50%)' },     // Top Left
  { top: '10%', left: '78%', transform: 'translate(-50%, -50%)' },     // Top Right
  { top: '48%', left: '4%', transform: 'translate(-50%, -50%)' },      // Middle Left
  { top: '48%', left: '96%', transform: 'translate(-50%, -50%)' },     // Middle Right
  { top: '86%', left: '16%', transform: 'translate(-50%, -50%)' },     // Bottom Left
  { top: '86%', left: '84%', transform: 'translate(-50%, -50%)' },     // Bottom Right
];

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
      setActionError(res.error || 'Gagal memainkan kartu');
    }
  };

  // Suit generator helper for classic card representation
  const getCardSuit = (card: Card) => {
    if (card.type === 'NUMBER') {
      const suits = ['♠', '♥', '♦', '♣'];
      const suit = suits[card.value % 4];
      const isRed = suit === '♥' || suit === '♦';
      return { suit, isRed };
    }
    return { suit: '★', isRed: true };
  };

  // Render a classic poker playing card
  const renderClassicCard = (card: Card, isHandCard = false, isSelected = false) => {
    const { suit, isRed } = getCardSuit(card);
    const textColor = isRed ? 'text-red-600' : 'text-slate-900';

    return (
      <div
        className={`relative bg-white rounded-md border border-slate-400 shadow-md flex flex-col justify-between select-none transition-all ${
          isHandCard
            ? `w-20 sm:w-24 h-28 sm:h-36 p-1.5 sm:p-2 cursor-pointer ${
                isSelected ? '-translate-y-6 ring-2 ring-amber-400 shadow-xl' : 'hover:-translate-y-3'
              }`
            : 'w-12 sm:w-14 h-16 sm:h-20 p-1'
        }`}
      >
        {/* Top-Left Index */}
        <div className={`flex flex-col items-start leading-none ${textColor}`}>
          <span className={`${isHandCard ? 'text-base sm:text-lg font-black' : 'text-xs sm:text-sm font-bold'}`}>
            {card.type === 'NUMBER' ? card.value : '★'}
          </span>
          <span className={`${isHandCard ? 'text-xs sm:text-sm' : 'text-[10px]'}`}>{suit}</span>
        </div>

        {/* Center Artwork / Suit */}
        <div className={`text-center my-auto leading-none ${textColor}`}>
          {card.type === 'NUMBER' ? (
            <span className={`${isHandCard ? 'text-2xl sm:text-3xl' : 'text-base sm:text-lg'}`}>
              {suit}
            </span>
          ) : (
            <div className="flex flex-col items-center">
              <span className={`${isHandCard ? 'text-base sm:text-xl' : 'text-xs'} text-amber-600`}>★</span>
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-800 uppercase tracking-tighter line-clamp-1">
                {card.name}
              </span>
            </div>
          )}
        </div>

        {/* Bottom-Right Inverted Index */}
        <div className={`flex flex-col items-end leading-none rotate-180 ${textColor}`}>
          <span className={`${isHandCard ? 'text-base sm:text-lg font-black' : 'text-xs sm:text-sm font-bold'}`}>
            {card.type === 'NUMBER' ? card.value : '★'}
          </span>
          <span className={`${isHandCard ? 'text-xs sm:text-sm' : 'text-[10px]'}`}>{suit}</span>
        </div>

        {/* Description overlay for hand cards */}
        {isHandCard && card.type === 'SPECIAL' && (
          <div className="absolute inset-x-1 bottom-1 text-[8px] sm:text-[9px] text-slate-600 bg-amber-50/90 rounded px-1 py-0.5 border border-amber-200 line-clamp-2 leading-tight">
            {card.description}
          </div>
        )}
      </div>
    );
  };

  // Render classic face-down card back
  const renderCardBack = (count = 2) => {
    return (
      <div className="flex -space-x-4 drop-shadow-sm">
        {Array.from({ length: Math.min(count, 4) }).map((_, i) => (
          <div
            key={i}
            className="w-7 sm:w-8 h-10 sm:h-12 rounded bg-gradient-to-br from-red-700 via-red-800 to-red-950 border border-white/80 shadow-sm flex items-center justify-center"
          >
            <div className="w-5 sm:w-6 h-8 sm:h-10 border border-red-400/40 rounded-sm flex items-center justify-center">
              <span className="text-[8px] text-red-200">♦</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between pt-16 pb-3 px-2 sm:px-6 card-suits-pattern overflow-hidden font-sans select-none text-slate-100">
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

      {/* Floating Match History Toggle (Top Right) */}
      <div className="absolute top-16 right-4 z-30">
        <button
          onClick={() => setShowEvents(!showEvents)}
          className="bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300 px-3 py-1.5 rounded-lg flex items-center space-x-1.5 shadow-md transition"
        >
          <Layers className="w-3.5 h-3.5 text-amber-400" />
          <span>Riwayat ({gameState.lastEvents.length})</span>
          {showEvents ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showEvents && (
          <div className="mt-1.5 w-80 max-h-60 overflow-y-auto bg-slate-900/95 border border-slate-700 rounded-xl p-3 shadow-2xl text-[11px] font-mono space-y-2 backdrop-blur-sm">
            {gameState.lastEvents.length === 0 ? (
              <div className="text-slate-500">Belum ada aksi permainan</div>
            ) : (
              gameState.lastEvents.map((evt) => (
                <div key={evt.id} className="border-b border-slate-800 pb-1 text-slate-300">
                  <span className="text-amber-400 font-bold">› </span>
                  {evt.message}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* CLASSIC POKER TABLE CONTAINER (Matches User's Reference Image) */}
      {/* ============================================================== */}
      <div className="relative my-auto w-full max-w-5xl mx-auto flex items-center justify-center px-2 py-4">
        {/* Outer Oval Table with Padded Leather Bumper & Wood Inlay */}
        <div className="relative w-full aspect-[16/9] max-h-[380px] sm:max-h-[440px] rounded-[180px] sm:rounded-[220px] poker-bumper p-3.5 sm:p-5 flex items-center justify-center">
          {/* Inner Wooden / Cream Bevel Trim */}
          <div className="relative w-full h-full rounded-[160px] sm:rounded-[200px] poker-wood-rim p-1 sm:p-1.5 flex items-center justify-center">
            {/* The Classic Emerald Green Felt Table Surface */}
            <div className="relative w-full h-full rounded-[150px] sm:rounded-[190px] poker-felt flex items-center justify-center shadow-inner overflow-visible">
              {/* Thin White Table Inlay Oval Line */}
              <div className="absolute inset-4 sm:inset-6 rounded-[140px] sm:rounded-[180px] border border-white/20 pointer-events-none" />

              {/* Table Direction Flow Indicator (Left and Right) */}
              <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center space-x-1 text-white/40 font-mono text-[10px]">
                <RotateCcw className={`w-4 h-4 ${gameState.turn.direction === 'CLOCKWISE' ? '' : 'scale-x-[-1]'}`} />
                <span>{gameState.turn.direction === 'CLOCKWISE' ? 'CW' : 'CCW'}</span>
              </div>

              {/* ============================================================== */}
              {/* OPPONENT SEATS PLACED EXACTLY ALONG THE POKER TABLE RIM       */}
              {/* ============================================================== */}
              {opponents.map((p, idx) => {
                const pos = OPPONENT_SEAT_POSITIONS[idx % OPPONENT_SEAT_POSITIONS.length];
                const isPlayerActive = gameState.turn.activePlayerId === p.id;

                return (
                  <div
                    key={p.id}
                    className="absolute z-20 flex flex-col items-center"
                    style={{
                      top: pos.top,
                      left: pos.left,
                      transform: pos.transform
                    }}
                  >
                    {/* Face-down cards standing behind the player badge */}
                    <div className="mb-1">
                      {renderCardBack(p.cardsInHandCount || 2)}
                    </div>

                    {/* Classic Navy/Charcoal Seat Badge (Just like deepseek, claude in image) */}
                    <div
                      className={`relative min-w-[85px] sm:min-w-[110px] px-2.5 py-1 rounded-md text-center transition shadow-md ${
                        isPlayerActive
                          ? 'bg-[#1a2b3c] border-2 border-amber-400 ring-2 ring-amber-400/30'
                          : 'bg-[#15202b] border border-slate-700/80 hover:border-slate-600'
                      } ${p.isEliminated ? 'opacity-40 grayscale' : ''}`}
                    >
                      {/* Player Username */}
                      <div className="text-[11px] sm:text-xs font-bold text-white truncate max-w-[100px] leading-tight">
                        {p.username}
                      </div>

                      {/* Overload Level / Chips indicator */}
                      <div className="flex items-center justify-center space-x-1 text-[10px] sm:text-[11px] font-mono text-emerald-400 font-semibold leading-tight mt-0.5">
                        {p.isEliminated ? (
                          <span className="text-red-400 font-bold">K.O.</span>
                        ) : (
                          <>
                            <span className="text-slate-400 text-[9px]">⚡</span>
                            <span>{p.overloadLevel}/3 Penalti</span>
                          </>
                        )}
                      </div>

                      {/* Active Player Turn Flag */}
                      {isPlayerActive && (
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-1.5 py-0.2 bg-amber-400 text-slate-950 text-[8px] font-mono font-black rounded uppercase">
                          GILIRAN
                        </div>
                      )}

                      {/* Shield Indicator */}
                      {p.hasShield && (
                        <div className="absolute -top-2 -right-2 bg-blue-600 rounded-full p-0.5 shadow border border-white">
                          <Shield className="w-3 h-3 text-white" />
                        </div>
                      )}

                      {/* Time Bomb */}
                      {p.timeBombTurnsRemaining !== null && (
                        <div className="absolute -top-2 -left-2 bg-red-600 rounded-full p-0.5 shadow border border-white flex items-center text-[9px] font-mono font-black text-white px-1">
                          <Bomb className="w-2.5 h-2.5 mr-0.5" />
                          {p.timeBombTurnsRemaining}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* ============================================================== */}
              {/* CENTER BOARD: COMMUNITY CARDS & POT VALUE (Like Texas Hold'em) */}
              {/* ============================================================== */}
              <div className="flex flex-col items-center justify-center z-10">
                {/* Community Cards Laid Out Flat in the Center of the Table */}
                <div className="flex items-center space-x-1.5 sm:space-x-2 mb-2">
                  {gameState.activeCardInPlay ? (
                    renderClassicCard(gameState.activeCardInPlay)
                  ) : (
                    <div className="w-12 sm:w-14 h-16 sm:h-20 rounded-md border-2 border-dashed border-white/20 flex items-center justify-center text-white/30 text-xs font-mono">
                      <span>POT</span>
                    </div>
                  )}
                </div>

                {/* Pot / Core Total Display (Matches the "$6,600" text in reference image) */}
                <div className="text-center">
                  <div className="text-xl sm:text-3xl font-black text-white font-mono tracking-tight drop-shadow">
                    CORE: {gameState.coreTotal} <span className="text-white/60 text-sm sm:text-base font-normal">/ {gameState.overloadLimit}</span>
                  </div>

                  {/* Sisa points to Overload limit */}
                  <div className="text-[10px] sm:text-xs font-mono text-emerald-300 font-semibold">
                    {remainingHeadroom === 0
                      ? '⚠️ OVERLOAD LIMIT TERCAPAI!'
                      : `${remainingHeadroom} angka lagi ke Overload`}
                  </div>

                  {/* Multiplier 2X Chip */}
                  {gameState.turn.multiplier > 1 && (
                    <div className="mt-1 inline-flex items-center space-x-1 px-2 py-0.5 bg-amber-500 text-slate-950 rounded-full text-[10px] font-bold shadow-sm">
                      <Zap className="w-3 h-3" />
                      <span>2X OVERCLOCK AKTIF</span>
                    </div>
                  )}
                </div>

                {/* Classic Dealer Button sitting on felt */}
                <div className="absolute right-1/4 bottom-1/4 w-6 h-6 rounded-full bg-white border border-slate-400 text-slate-900 font-black text-[11px] font-mono flex items-center justify-center shadow">
                  D
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* BOTTOM AREA: PLAYER'S SEAT & CLASSIC POKER HAND               */}
      {/* ============================================================== */}
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center z-20">
        {/* Turn Status Banner & Player Identity */}
        <div className="w-full flex items-center justify-between mb-2 px-2">
          {/* My Player Badge (Matching reference image style) */}
          {myPlayer && (
            <div className="flex items-center space-x-2 bg-[#15202b] border border-slate-700/80 px-3 py-1.5 rounded-lg shadow-sm">
              <div>
                <div className="text-xs font-bold text-white flex items-center space-x-1">
                  <span>{myPlayer.username}</span>
                  <span className="text-emerald-400 text-[10px] font-mono">(Kamu)</span>
                </div>
                <div className="text-[10px] font-mono text-emerald-400">
                  ⚡ {myPlayer.overloadLevel}/3 Penalti
                </div>
              </div>

              {myPlayer.hasShield && (
                <Shield className="w-4 h-4 text-blue-400" />
              )}
            </div>
          )}

          {/* Action Callout */}
          <div
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold flex items-center space-x-1.5 ${
              isMyTurn
                ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>
              {isMyTurn
                ? '👉 GILIRANMU — PILIH KARTU'
                : `Menunggu ${activePlayer?.username || 'lawan'}...`}
            </span>
          </div>
        </div>

        {/* Error notification if action rejected */}
        {actionError && (
          <div className="mb-2 px-3 py-1 bg-red-950/90 border border-red-500 text-red-200 text-xs font-mono rounded-md">
            ⚠️ {actionError}
          </div>
        )}

        {/* Player's Poker Hand of Cards */}
        <div className="relative flex items-end justify-center w-full px-2 pb-1 overflow-x-auto min-h-[145px] sm:min-h-[170px]">
          {myHand.map((card) => {
            const isSelected = selectedCard?.id === card.id;
            const willOverload =
              card.type === 'NUMBER' &&
              card.value * gameState.turn.multiplier > remainingHeadroom;

            return (
              <div
                key={card.id}
                onClick={() => handleCardClick(card)}
                className={`relative transform -ml-2 sm:-ml-3 first:ml-0 transition-all ${
                  isSelected ? 'z-30' : 'z-10'
                } ${!isMyTurn ? 'opacity-80' : ''}`}
              >
                {/* Classic Playing Card */}
                {renderClassicCard(card, true, isSelected)}

                {/* Overload Alert Tag on Card */}
                {willOverload && isMyTurn && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[8px] font-mono font-black px-1 py-0.5 rounded shadow whitespace-nowrap">
                    OVERLOAD!
                  </div>
                )}

                {/* Play Card Action Button */}
                {isSelected && isMyTurn && (
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-40">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlaySelectedCard(card);
                      }}
                      disabled={isSubmitting}
                      className="px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md whitespace-nowrap transition"
                    >
                      MAINKAN
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Helper Hint Text */}
        <div className="text-[11px] font-mono text-slate-400 text-center mt-0.5">
          {isMyTurn ? 'Klik kartu di tangan untuk memainkannya ke meja' : 'Giliran lawan sedang berjalan...'}
        </div>
      </div>
    </div>
  );
};
