import type { BotLevel, Card, MatchState, NumberCard, SpecialCard, SpecialId } from './types.js';
import { activePlayer, alivePlayers, legalMoves } from './rules.js';

const isNum = (c: Card): c is NumberCard => c.kind === 'NUMBER';
const isSpecial = (id: SpecialId) => (c: Card): c is SpecialCard => c.kind === 'SPECIAL' && c.special === id;

/**
 * Pick a card for `playerId`. Always returns one of the legal card ids, or
 * null when the player has no cards at all. Never throws.
 */
export function chooseMove(
  state: MatchState,
  playerId: string,
  level: BotLevel,
  random: () => number = Math.random,
): string | null {
  const { cardIds, trapped } = legalMoves(state, playerId);
  if (cardIds.length === 0) return null;
  const hand = (state.hands[playerId] ?? []).filter((c) => cardIds.includes(c.id));
  if (hand.length === 1) return hand[0].id;

  const pick = <T extends Card>(cards: T[]) => cards[Math.floor(random() * cards.length)];

  // Trapped: the card is wasted anyway → dump the least valuable one.
  if (trapped) {
    const nums = hand.filter(isNum).sort((a, b) => a.value - b.value);
    return (nums[0] ?? hand[0]).id;
  }

  const limit = state.settings.overloadLimit;
  const room = limit - state.total;
  const safeNums = hand.filter(isNum).filter((c) => c.value <= room).sort((a, b) => b.value - a.value);
  const specials = hand.filter((c): c is SpecialCard => c.kind === 'SPECIAL');
  const nonDeathSpecials = specials.filter((c) => c.special !== 'DEATH');

  if (level === 'EASY') {
    const safe: Card[] = [...safeNums, ...nonDeathSpecials];
    if (safe.length > 0 && random() < 0.7) return pick(safe).id;
    return pick(hand).id;
  }

  const find = (id: SpecialId) => specials.find(isSpecial(id));
  const alive = alivePlayers(state).length;
  const me = activePlayer(state);

  // HARD: be aggressive when the table is calm.
  if (level === 'HARD') {
    const gt = specials.filter(isSpecial('GREATER_THAN')).sort((a, b) => (b.threshold ?? 0) - (a.threshold ?? 0))[0];
    // Total close to the limit: lock the next player into a big number.
    if (gt && room <= 6) return gt.id;
    // Push the table to the limit when we have no other safe option.
    const setLimit = find('SET_LIMIT');
    if (setLimit && safeNums.length === 0 && state.total < limit) return setLimit.id;
  }

  // Comfortable: play the biggest safe number (leaves less room for others),
  // keep specials for emergencies. NORMAL sometimes plays a mid card.
  if (safeNums.length > 0 && room > 4) {
    if (level === 'NORMAL' && safeNums.length > 1 && random() < 0.3) {
      return safeNums[Math.floor(safeNums.length / 2)].id;
    }
    return safeNums[0].id;
  }

  // Danger zone: defend first.
  const defenders: Array<SpecialCard | undefined> = [
    find('RESET_ZERO'),
    room < 5 ? find('MINUS_5') : undefined,
    alive > 2 ? find('SKIP') : undefined,
    find('ROLEBACK'),
    find('SKIP'),
    specials.filter(isSpecial('GREATER_THAN'))[0],
  ];
  const defender = defenders.find(Boolean);

  if (safeNums.length > 0 && !(level === 'HARD' && defender)) return safeNums[0].id;
  if (defender) return defender.id;

  const setLimit = find('SET_LIMIT');
  if (setLimit && state.total <= limit) return setLimit.id;
  const minus = find('MINUS_5');
  if (minus) return minus.id;

  // Nothing safe left. Death card spreads the risk over everyone.
  const death = find('DEATH');
  if (death && me && alive > 2) return death.id;

  const lowest = hand.filter(isNum).sort((a, b) => a.value - b.value)[0];
  return (lowest ?? death ?? hand[0]).id;
}
