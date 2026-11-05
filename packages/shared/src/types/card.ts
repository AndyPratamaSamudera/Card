export type CardType = 'NUMBER' | 'SPECIAL';

export type SpecialCardId =
  | 'WARP_INVERSION'     // Reverse turn order
  | 'CRYO_STUN'          // Freeze / skip next player
  | 'OVERCLOCK_SURGE'    // Double next number card
  | 'ANTIMATTER_FLUSH'   // Zero-G vent (-5 from core)
  | 'QUANTUM_STEAL'      // Steal 1 random card from opponent
  | 'PLASMA_SHIELD'      // Shield against negative effect or 1 overload
  | 'WARP_SWAP'          // Swap 2 random cards with opponent
  | 'HYPER_SURGE'        // +15 to core, grant user immediate extra turn
  | 'TACHYON_MIRROR'     // Deflect/redirect targeted effect
  | 'CORE_REBOOT'        // Reset core to 0, reduce overload limit by 5 for round
  | 'TIME_BOMB'          // Attach ticking bomb to target; detonates in 3 turns
  | 'GRAVITY_CRUSH'      // Target discards highest number card
  | 'HARMONIC_EQUALIZER' // Snap core to 50% of overload limit
  | 'GLITCH_PULSE';      // Scramble visible card numbers of next 2 players

export interface BaseCard {
  id: string; // unique card instance ID, e.g. "c_123"
  type: CardType;
  name: string;
  description: string;
  glowColor: string;
  flavorText?: string;
}

export interface NumberCard extends BaseCard {
  type: 'NUMBER';
  value: number; // 1 to 10
}

export interface SpecialCard extends BaseCard {
  type: 'SPECIAL';
  specialId: SpecialCardId;
  requiresTarget: boolean; // true if targeting an opponent is needed (e.g. Steal, Swap, Time Bomb, Gravity Crush)
}

export type Card = NumberCard | SpecialCard;

/**
 * Publicly visible card info for opponents (zero knowledge hand)
 */
export interface PublicOpponentHand {
  playerId: string;
  cardCount: number;
  hasShield: boolean;
  isGlitchScrambled?: boolean;
}
