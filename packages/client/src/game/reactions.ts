import type { MatchView } from '@overload21/shared';
import { sfx } from '../audio/audio';

/** Fire sound effects by diffing two consecutive views. */
export function reactToView(prev: MatchView | null, next: MatchView) {
  if (!prev) return;

  if (next.lastPlay && next.lastPlay.seq !== prev.lastPlay?.seq) {
    const c = next.lastPlay.card;
    if (c.kind === 'NUMBER') sfx.playNumber(c.value);
    else sfx.playSpecial();
  }

  if (next.resolution && next.resolution.id !== prev.resolution?.id) {
    // The roll overlay plays the drum-roll and reveal sounds.
    sfx.warning();
  }

  if (next.phase === 'OVER' && prev.phase !== 'OVER') {
    if (next.me && next.winnerId === next.me) sfx.win();
    else if (next.me) sfx.lose();
    else sfx.win();
  }

  if (
    next.phase === 'TURN' &&
    next.me &&
    next.activePlayerId === next.me &&
    (prev.activePlayerId !== next.me || prev.turnSeq !== next.turnSeq)
  ) {
    sfx.myTurn();
  }
}
