import { Card, SpecialCardId } from './card.js';
import { Player } from './player.js';

export type TurnDirection = 'CLOCKWISE' | 'COUNTER_CLOCKWISE';

export interface TurnState {
  activePlayerId: string;
  turnStartedAt: number;
  timeRemaining: number;
  direction: TurnDirection;
  multiplier: number; // e.g. 2 for Overclock Surge, resets back to 1 after next number card
}

export interface MatchEvent {
  id: string;
  timestamp: number;
  type:
    | 'GAME_STARTED'
    | 'ROUND_STARTED'
    | 'CARD_PLAYED'
    | 'SPECIAL_EFFECT_TRIGGERED'
    | 'OVERLOAD_TRIGGERED'
    | 'PLAYER_PENALIZED'
    | 'PLAYER_ELIMINATED'
    | 'SHIELD_ABSORBED'
    | 'TIME_BOMB_TICK'
    | 'TIME_BOMB_EXPLODED'
    | 'MATCH_WON';
  actorPlayerId?: string;
  targetPlayerId?: string;
  cardName?: string;
  cardValue?: number;
  specialId?: SpecialCardId;
  message: string;
  payload?: Record<string, unknown>;
}

export interface GameState {
  roundNumber: number;
  coreTotal: number;
  overloadLimit: number;
  turn: TurnState;
  players: Player[];
  activeCardInPlay: Card | null;
  lastEvents: MatchEvent[];
  winnerPlayerId: string | null;
}

export interface PlayerPrivateView {
  gameState: GameState;
  myHand: Card[];
  myPlayerId: string;
}
