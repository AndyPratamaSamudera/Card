import type { Card, MatchState, PlayerSlot, Restriction } from './types.js';

export function isAlive(p: PlayerSlot): boolean {
  return !p.eliminated;
}

export function alivePlayers(state: MatchState): PlayerSlot[] {
  return state.players.filter(isAlive);
}

export function activePlayer(state: MatchState): PlayerSlot | null {
  if (state.phase === 'OVER') return null;
  return state.players[state.activeIndex] ?? null;
}

/** Is a card allowed under the current restriction (ignoring the trapped rule)? */
export function isAllowed(card: Card, restriction: Restriction): boolean {
  if (!restriction) return true;
  if (restriction.kind === 'GREATER_THAN') {
    return card.kind === 'NUMBER' && card.value > restriction.min;
  }
  // NO_ROLEBACK
  return !(card.kind === 'SPECIAL' && card.special === 'ROLEBACK');
}

export interface LegalMoves {
  cardIds: string[];
  /**
   * True when no card satisfies the restriction. Then every card may be
   * played, its effect is cancelled and the player must roll.
   */
  trapped: boolean;
}

export function legalMoves(state: MatchState, playerId: string): LegalMoves {
  const p = activePlayer(state);
  if (state.phase !== 'TURN' || !p || p.id !== playerId) return { cardIds: [], trapped: false };
  const hand = state.hands[playerId] ?? [];
  const allowed = hand.filter((c) => isAllowed(c, state.restriction));
  if (allowed.length > 0) return { cardIds: allowed.map((c) => c.id), trapped: false };
  return { cardIds: hand.map((c) => c.id), trapped: hand.length > 0 };
}

export function restrictionError(restriction: Restriction): string {
  if (!restriction) return 'Kartu tidak bisa dimainkan.';
  if (restriction.kind === 'GREATER_THAN') {
    return `Wajib main kartu angka lebih dari ${restriction.min}! Kartu spesial dilarang.`;
  }
  return 'Roleback tidak bisa dibalas dengan Roleback!';
}

/**
 * Index of the alive player `steps` positions away from `from` in the current
 * direction. `from` itself may be eliminated.
 */
export function stepFrom(state: MatchState, from: number, steps: number): number {
  const n = state.players.length;
  let idx = from;
  let moved = 0;
  // Guard against infinite loops: at most n * steps iterations.
  for (let guard = 0; guard < n * (steps + 1) && moved < steps; guard++) {
    idx = (((idx + state.direction) % n) + n) % n;
    if (isAlive(state.players[idx])) moved++;
  }
  return idx;
}

/** Danger helper for UI / AI: would this number card overload the table? */
export function wouldOverload(state: MatchState, card: Card): boolean {
  return card.kind === 'NUMBER' && state.total + card.value > state.settings.overloadLimit;
}
