import type { MatchState, MatchView } from './types.js';
import { legalMoves } from './rules.js';
import { resolveDurationMs } from './reducer.js';

export interface ViewExtras {
  version: number;
  turnMsLeft: number | null;
  /** playerId → connected (defaults to true) */
  connected?: Record<string, boolean>;
}

/**
 * Build what one viewer is allowed to see: no deck order, no RNG state and
 * no other players' hands.
 */
export function buildView(state: MatchState, viewerId: string | null, extras: ViewExtras): MatchView {
  const me = viewerId && state.players.some((p) => p.id === viewerId) ? viewerId : null;
  const legal = me ? legalMoves(state, me) : { cardIds: [], trapped: false };
  return {
    version: extras.version,
    settings: { ...state.settings },
    players: state.players.map((p) => ({
      ...p,
      handCount: state.hands[p.id]?.length ?? 0,
      connected: extras.connected?.[p.id] ?? true,
    })),
    total: state.total,
    direction: state.direction,
    activePlayerId: state.phase === 'OVER' ? null : state.players[state.activeIndex]?.id ?? null,
    restriction: state.restriction,
    phase: state.phase,
    lastPlay: state.lastPlay,
    resolution: state.resolution,
    winnerId: state.winnerId,
    log: state.log.slice(),
    deckCount: state.deck.length,
    turnSeq: state.turnSeq,
    turnMsLeft: extras.turnMsLeft,
    resolveMs: resolveDurationMs(state.resolution),
    me,
    myHand: me ? (state.hands[me] ?? []).slice() : [],
    legalCardIds: legal.cardIds,
    trapped: legal.trapped,
  };
}
