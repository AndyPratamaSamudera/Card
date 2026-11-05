import {
  Card,
  NumberCard,
  SpecialCard,
  Player,
  AIDifficulty
} from '@cosmic/shared';

export interface AIDecision {
  cardId: string;
  targetPlayerId?: string;
  reasoning: string;
}

export type AIPersonality = 'AGGRESSIVE' | 'DEFENSIVE' | 'CHAOTIC' | 'STRATEGIC';

export class AIEngine {
  public static decideAction(
    aiPlayer: Player,
    hand: Card[],
    opponents: Player[],
    coreTotal: number,
    overloadLimit: number,
    turnMultiplier: number,
    personality: AIPersonality = 'STRATEGIC'
  ): AIDecision {
    if (hand.length === 0) {
      throw new Error('AI hand is empty');
    }

    const difficulty: AIDifficulty = aiPlayer.aiDifficulty || 'NORMAL';
    const remainingHeadroom = overloadLimit - coreTotal;
    const activeOpponents = opponents.filter(p => !p.isEliminated && p.id !== aiPlayer.id);

    // Pick a sensible target opponent (e.g. player with lowest penalties for aggressive, or player with fewest cards)
    const pickTarget = (): string | undefined => {
      if (activeOpponents.length === 0) return undefined;
      if (personality === 'AGGRESSIVE') {
        // Target player with highest overload level to knock them out!
        const sorted = [...activeOpponents].sort((a, b) => b.overloadLevel - a.overloadLevel);
        return sorted[0]?.id;
      }
      if (personality === 'DEFENSIVE') {
        // Target player with most cards or no shield
        const sorted = [...activeOpponents].sort((a, b) => (b.hasShield ? -1 : 1));
        return sorted[0]?.id;
      }
      // Strategic / Chaotic
      const randIdx = Math.floor(Math.random() * activeOpponents.length);
      return activeOpponents[randIdx]?.id;
    };

    // Easy AI: picks randomly with slight bias towards not dying
    if (difficulty === 'EASY') {
      const safeNumbers = hand.filter(
        (c): c is NumberCard => c.type === 'NUMBER' && c.value * turnMultiplier <= remainingHeadroom
      );
      if (safeNumbers.length > 0 && Math.random() < 0.6) {
        const chosen = safeNumbers[Math.floor(Math.random() * safeNumbers.length)];
        return { cardId: chosen.id, reasoning: 'Easy AI played safe number' };
      }
      // Otherwise pick any card
      const chosen = hand[Math.floor(Math.random() * hand.length)];
      return {
        cardId: chosen.id,
        targetPlayerId: chosen.type === 'SPECIAL' && chosen.requiresTarget ? pickTarget() : undefined,
        reasoning: 'Easy AI played card'
      };
    }

    // Normal & Hard AI: Analytical Decision Engine
    // 1. If danger is critical (headroom <= 7):
    if (remainingHeadroom <= 7) {
      // Look for defensive or resetting special cards:
      // a) CRYO_STUN (skip next player, let someone else deal with it)
      const cryo = hand.find(c => c.type === 'SPECIAL' && c.specialId === 'CRYO_STUN');
      if (cryo) return { cardId: cryo.id, reasoning: 'High danger: Skipping next player' };

      // b) WARP_INVERSION (reverse turn back to previous player)
      const reverse = hand.find(c => c.type === 'SPECIAL' && c.specialId === 'WARP_INVERSION');
      if (reverse) return { cardId: reverse.id, reasoning: 'High danger: Reversing turn' };

      // c) ANTIMATTER_FLUSH (lower core by 5)
      const flush = hand.find(c => c.type === 'SPECIAL' && c.specialId === 'ANTIMATTER_FLUSH');
      if (flush) return { cardId: flush.id, reasoning: 'High danger: Flushing core' };

      // d) CORE_REBOOT (reset to 0)
      const reboot = hand.find(c => c.type === 'SPECIAL' && c.specialId === 'CORE_REBOOT');
      if (reboot) return { cardId: reboot.id, reasoning: 'High danger: Hard rebooting core' };

      // e) PLASMA_SHIELD (protect self from overload)
      const shield = hand.find(c => c.type === 'SPECIAL' && c.specialId === 'PLASMA_SHIELD');
      if (shield && !aiPlayer.hasShield) {
        return { cardId: shield.id, reasoning: 'High danger: Shielding self' };
      }

      // f) Safe number card that fits within headroom
      const safeNumbers = hand
        .filter((c): c is NumberCard => c.type === 'NUMBER' && c.value * turnMultiplier <= remainingHeadroom)
        .sort((a, b) => b.value - a.value); // Play highest safe number to leave minimum room for next player!

      if (safeNumbers.length > 0) {
        const chosen = safeNumbers[0];
        return { cardId: chosen.id, reasoning: `High danger: Playing safe number +${chosen.value}` };
      }

      // If hard difficulty and no safe number, try sabotage before overload
      if (difficulty === 'HARD') {
        const steal = hand.find(c => c.type === 'SPECIAL' && c.specialId === 'QUANTUM_STEAL');
        if (steal) return { cardId: steal.id, targetPlayerId: pickTarget(), reasoning: 'Seeking safe card via Steal' };

        const swap = hand.find(c => c.type === 'SPECIAL' && c.specialId === 'WARP_SWAP');
        if (swap) return { cardId: swap.id, targetPlayerId: pickTarget(), reasoning: 'Seeking safe card via Swap' };
      }
    }

    // 2. If headroom is comfortable (headroom > 15):
    // Can push aggressively or set traps
    if (remainingHeadroom > 15) {
      if (personality === 'AGGRESSIVE' || difficulty === 'HARD') {
        // Use Overclock Surge or Hyper Surge to ramp pressure
        const surge = hand.find(c => c.type === 'SPECIAL' && c.specialId === 'OVERCLOCK_SURGE');
        if (surge && turnMultiplier === 1) {
          return { cardId: surge.id, reasoning: 'Comfortable headroom: Overclocking Core' };
        }
        const hyper = hand.find(c => c.type === 'SPECIAL' && c.specialId === 'HYPER_SURGE');
        if (hyper && remainingHeadroom >= 18) {
          return { cardId: hyper.id, reasoning: 'Comfortable headroom: Hyper-Surge burst' };
        }
      }

      // Play medium to high safe number cards
      const availableNumbers = hand
        .filter((c): c is NumberCard => c.type === 'NUMBER' && c.value * turnMultiplier <= remainingHeadroom)
        .sort((a, b) => b.value - a.value);

      if (availableNumbers.length > 0) {
        const chosen = availableNumbers[0];
        return { cardId: chosen.id, reasoning: `Ramping total with +${chosen.value}` };
      }
    }

    // 3. Fallback: Find any safe number card
    const anySafeNumber = hand
      .filter((c): c is NumberCard => c.type === 'NUMBER' && c.value * turnMultiplier <= remainingHeadroom)
      .sort((a, b) => a.value - b.value); // Play smallest number

    if (anySafeNumber.length > 0) {
      return { cardId: anySafeNumber[0].id, reasoning: 'Playing lowest safe number' };
    }

    // 4. If no safe number, play any special card that doesn't increase core
    const harmlessSpecials = hand.filter(
      (c): c is SpecialCard =>
        c.type === 'SPECIAL' && c.specialId !== 'HYPER_SURGE'
    );
    if (harmlessSpecials.length > 0) {
      const chosen = harmlessSpecials[0];
      return {
        cardId: chosen.id,
        targetPlayerId: chosen.requiresTarget ? pickTarget() : undefined,
        reasoning: 'Playing utility special card to avoid overload'
      };
    }

    // 5. Unavoidable overload: Play smallest number card
    const allNumbers = hand
      .filter((c): c is NumberCard => c.type === 'NUMBER')
      .sort((a, b) => a.value - b.value);

    if (allNumbers.length > 0) {
      return { cardId: allNumbers[0].id, reasoning: 'No safe play: Minimizing damage' };
    }

    // Ultimate fallback
    return {
      cardId: hand[0].id,
      targetPlayerId: hand[0].type === 'SPECIAL' && hand[0].requiresTarget ? pickTarget() : undefined,
      reasoning: 'Fallback play'
    };
  }
}
