import { NumberCard, SpecialCard, SpecialCardId } from '../types/card.js';

export interface CardBlueprint {
  countInDeck: number;
  template: Omit<NumberCard, 'id'> | Omit<SpecialCard, 'id'>;
}

export const SPECIAL_CARDS_BLUEPRINTS: Record<SpecialCardId, Omit<SpecialCard, 'id'>> = {
  WARP_INVERSION: {
    type: 'SPECIAL',
    specialId: 'WARP_INVERSION',
    name: 'Warp Inversion',
    description: 'Reverses the turn order of the cosmic arena table.',
    glowColor: '#38bdf8', // Cyan
    requiresTarget: false,
    flavorText: 'Tachyon fields flip space-time clockwise into counter-clockwise.'
  },
  CRYO_STUN: {
    type: 'SPECIAL',
    specialId: 'CRYO_STUN',
    name: 'Cryo-Stun',
    description: 'Freezes the next player, skipping their turn immediately.',
    glowColor: '#67e8f9', // Ice cyan
    requiresTarget: false,
    flavorText: 'Flash-frozen in liquid helium. Enjoy the ice age.'
  },
  OVERCLOCK_SURGE: {
    type: 'SPECIAL',
    specialId: 'OVERCLOCK_SURGE',
    name: 'Overclock Surge',
    description: 'The next number card played has its value multiplied by 2x!',
    glowColor: '#f59e0b', // Amber/orange
    requiresTarget: false,
    flavorText: 'Bypassing Core safety limiters... Power doubled!'
  },
  ANTIMATTER_FLUSH: {
    type: 'SPECIAL',
    specialId: 'ANTIMATTER_FLUSH',
    name: 'Antimatter Flush',
    description: 'Reduces the central Core Total by 5 (cannot drop below 0).',
    glowColor: '#10b981', // Emerald
    requiresTarget: false,
    flavorText: 'Venting excess plasma into the stellar vacuum.'
  },
  QUANTUM_STEAL: {
    type: 'SPECIAL',
    specialId: 'QUANTUM_STEAL',
    name: 'Quantum Steal',
    description: 'Steal 1 random card from a chosen opponent.',
    glowColor: '#a855f7', // Purple
    requiresTarget: true,
    flavorText: 'Miniature wormhole opened inside opponent hand.'
  },
  PLASMA_SHIELD: {
    type: 'SPECIAL',
    specialId: 'PLASMA_SHIELD',
    name: 'Plasma Shield',
    description: 'Grants a forcefield that absorbs 1 negative effect or 1 overload penalty.',
    glowColor: '#06b6d4', // Cyan neon
    requiresTarget: false,
    flavorText: 'Hexagonal barrier humming at 100 terahertz.'
  },
  WARP_SWAP: {
    type: 'SPECIAL',
    specialId: 'WARP_SWAP',
    name: 'Warp Swap',
    description: 'Swap 2 random cards between your hand and a chosen opponent.',
    glowColor: '#ec4899', // Pink
    requiresTarget: true,
    flavorText: 'Quantum entanglement rearranges deck matter.'
  },
  HYPER_SURGE: {
    type: 'SPECIAL',
    specialId: 'HYPER_SURGE',
    name: 'Hyper-Surge',
    description: 'Instantly adds +15 to Core Total, but grants you 1 immediate extra turn!',
    glowColor: '#ef4444', // Red
    requiresTarget: false,
    flavorText: 'Direct solar siphon! Overheat warning imminent.'
  },
  TACHYON_MIRROR: {
    type: 'SPECIAL',
    specialId: 'TACHYON_MIRROR',
    name: 'Tachyon Mirror',
    description: 'Deflects incoming targeted sabotages back to another player.',
    glowColor: '#f43f5e', // Rose
    requiresTarget: true,
    flavorText: 'Prismatic reflector turns enemy attacks into regret.'
  },
  CORE_REBOOT: {
    type: 'SPECIAL',
    specialId: 'CORE_REBOOT',
    name: 'Core Reboot',
    description: 'Hard-resets Core Total to 0, but reduces Overload Limit by 5 for this round.',
    glowColor: '#6366f1', // Indigo
    requiresTarget: false,
    flavorText: 'Turn it off and on again. Capacitors slightly degraded.'
  },
  TIME_BOMB: {
    type: 'SPECIAL',
    specialId: 'TIME_BOMB',
    name: 'Dark Matter Bomb',
    description: 'Plants a ticking bomb on target. Detonates with +1 Overload if no round end in 3 turns.',
    glowColor: '#e11d48', // Crimson
    requiresTarget: true,
    flavorText: 'Tick... tick... tick... unstable isotopic decay.'
  },
  GRAVITY_CRUSH: {
    type: 'SPECIAL',
    specialId: 'GRAVITY_CRUSH',
    name: 'Gravity Crush',
    description: 'Forces target opponent to discard their highest number card and draw a replacement.',
    glowColor: '#8b5cf6', // Violet
    requiresTarget: true,
    flavorText: 'Localized singularity collapses their heaviest asset.'
  },
  HARMONIC_EQUALIZER: {
    type: 'SPECIAL',
    specialId: 'HARMONIC_EQUALIZER',
    name: 'Harmonic Equalizer',
    description: 'Snaps the Core Total directly to exactly 50% of the Overload Limit.',
    glowColor: '#14b8a6', // Teal
    requiresTarget: false,
    flavorText: 'Resonant tuning brings chaotic energy into perfect balance.'
  },
  GLITCH_PULSE: {
    type: 'SPECIAL',
    specialId: 'GLITCH_PULSE',
    name: 'Glitch Pulse',
    description: 'Scrambles the card numbers of the next 2 players with holographic static.',
    glowColor: '#84cc16', // Lime
    requiresTarget: false,
    flavorText: 'EMP blast corrupts the visual display of nearby aliens.'
  }
};

/**
 * Standard deck configuration: 40 Number Cards + 14 Special Cards = 54 Cards
 */
export const NUMBER_CARD_DISTRIBUTION: Record<number, number> = {
  1: 5,
  2: 5,
  3: 5,
  4: 4,
  5: 4,
  6: 4,
  7: 4,
  8: 3,
  9: 3,
  10: 3
};
