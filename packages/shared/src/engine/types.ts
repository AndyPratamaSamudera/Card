// ─── Cards ──────────────────────────────────────────────────────────────────
export type SpecialId =
  | 'DEATH'
  | 'ROLEBACK'
  | 'GREATER_THAN'
  | 'SKIP'
  | 'RESET_ZERO'
  | 'SET_LIMIT'
  | 'MINUS_5';

export interface NumberCard {
  id: string;
  kind: 'NUMBER';
  value: number;
}

export interface SpecialCard {
  id: string;
  kind: 'SPECIAL';
  special: SpecialId;
  /** Only for GREATER_THAN */
  threshold?: number;
}

export type Card = NumberCard | SpecialCard;

// ─── Settings ───────────────────────────────────────────────────────────────
export type BotLevel = 'EASY' | 'NORMAL' | 'HARD';

export interface MatchSettings {
  /** Total above this value = OVERLOAD */
  overloadLimit: number;
  /** 1..100 — chance (%) to survive an overload roll */
  surviveChance: number;
  handSize: number;
  /** 0 = no turn timer */
  turnSeconds: number;
  botLevel: BotLevel;
  maxPlayers: number;
}

// ─── Players ────────────────────────────────────────────────────────────────
export interface PlayerSlot {
  id: string;
  name: string;
  /** Avatar palette index 0..7 */
  avatar: number;
  /** Permanent bot */
  isBot: boolean;
  /** Human temporarily controlled by the bot (disconnect / AFK) */
  autopilot: boolean;
  eliminated: boolean;
  /** Left / kicked during the match (counts as eliminated) */
  left: boolean;
}

export interface PlayerSeed {
  id: string;
  name: string;
  avatar: number;
  isBot: boolean;
}

// ─── Match state ────────────────────────────────────────────────────────────
export type Restriction =
  | { kind: 'GREATER_THAN'; min: number }
  | { kind: 'NO_ROLEBACK' }
  | null;

export type Phase = 'TURN' | 'RESOLVING' | 'OVER';

export interface RollResult {
  playerId: string;
  roll: number;
  survived: boolean;
  /** Death Card edge case: everyone failed, the card owner is spared */
  spared?: boolean;
}

export interface Resolution {
  id: number;
  kind: 'OVERLOAD' | 'TRAPPED' | 'DEATH';
  actorId: string;
  /** Table total at the moment of the roll (may be above the limit) */
  total: number;
  rolls: RollResult[];
}

export interface LastPlay {
  seq: number;
  playerId: string;
  card: Card;
  trapped: boolean;
}

export type LogTone = 'info' | 'play' | 'special' | 'danger' | 'good' | 'win';

export interface LogEntry {
  id: number;
  tone: LogTone;
  text: string;
}

export interface MatchState {
  settings: MatchSettings;
  /** Seat order */
  players: PlayerSlot[];
  hands: Record<string, Card[]>;
  deck: Card[];
  discard: Card[];
  total: number;
  direction: 1 | -1;
  activeIndex: number;
  restriction: Restriction;
  phase: Phase;
  lastPlay: LastPlay | null;
  resolution: Resolution | null;
  winnerId: string | null;
  log: LogEntry[];
  /** Increments every time the active turn starts (used for timers) */
  turnSeq: number;
  /** Monotonic counter for ids (log, plays, resolutions) */
  seq: number;
  rngState: number;
}

// ─── Actions ────────────────────────────────────────────────────────────────
export type Action =
  | { type: 'PLAY'; playerId: string; cardId: string }
  /** Only allowed when the active player's hand is empty (should never happen) */
  | { type: 'PASS'; playerId: string }
  /** Finish the RESOLVING phase (fired by the runner after the animation) */
  | { type: 'RESOLVE' }
  /** Turn timer expired: auto-play for the active player */
  | { type: 'TIMEOUT'; turnSeq: number }
  | { type: 'SET_AUTOPILOT'; playerId: string; on: boolean }
  /** Player left / kicked mid-match: forfeit */
  | { type: 'REMOVE_PLAYER'; playerId: string };

export type ActionResult =
  | { ok: true; state: MatchState }
  | { ok: false; error: string };

// ─── Views (what a client sees) ─────────────────────────────────────────────
export interface PlayerView extends PlayerSlot {
  handCount: number;
  connected: boolean;
}

export interface MatchView {
  version: number;
  settings: MatchSettings;
  players: PlayerView[];
  total: number;
  direction: 1 | -1;
  activePlayerId: string | null;
  restriction: Restriction;
  phase: Phase;
  lastPlay: LastPlay | null;
  resolution: Resolution | null;
  winnerId: string | null;
  log: LogEntry[];
  deckCount: number;
  turnSeq: number;
  /** ms left on the turn timer when this view was produced (null = no timer) */
  turnMsLeft: number | null;
  /** ms the current resolution animation lasts */
  resolveMs: number;
  /** Viewer perspective (null = spectator) */
  me: string | null;
  myHand: Card[];
  legalCardIds: string[];
  trapped: boolean;
}
