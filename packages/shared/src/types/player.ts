export type AlienAvatarId =
  | 'alien_zorblax'     // Green cyclops slime
  | 'alien_vex'         // Purple mantis android
  | 'alien_blobbo'      // Orange puffer alien
  | 'alien_nebula';     // Blue cosmic entity

export type OverloadLevel = 0 | 1 | 2 | 3;

export type AIDifficulty = 'EASY' | 'NORMAL' | 'HARD';

export interface Player {
  id: string;
  username: string;
  avatarId: AlienAvatarId;
  seatIndex: number;
  isReady: boolean;
  isHost: boolean;
  isAI: boolean;
  aiDifficulty?: AIDifficulty;
  isConnected: boolean;
  overloadLevel: OverloadLevel;
  hasShield: boolean;
  timeBombTurnsRemaining: number | null; // null if no bomb, or 1-3
  isGlitchScrambled: boolean; // if scrambled by Glitch Pulse
  isEliminated: boolean;
  cardsInHandCount: number;
}

export interface PlayerStats {
  matchesPlayed: number;
  matchesWon: number;
  cardsPlayed: number;
  specialCardsPlayed: number;
  penaltiesIncurred: number;
}
