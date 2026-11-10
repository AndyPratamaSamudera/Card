import { describe, expect, it } from 'vitest';
import {
  applyAction,
  buildDeck,
  buildView,
  chooseMove,
  createMatch,
  createRng,
  DEFAULT_SETTINGS,
  legalMoves,
  type Action,
  type Card,
  type MatchState,
  type PlayerSeed,
  type BotLevel,
} from '../src/index.js';

const seeds = (n: number, bot = false): PlayerSeed[] =>
  Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}`, avatar: i, isBot: bot }));

const num = (value: number, id = `t_n${value}_${Math.random()}`): Card => ({ id, kind: 'NUMBER', value });
const sp = (special: any, threshold?: number): Card => ({ id: `t_${special}_${Math.random()}`, kind: 'SPECIAL', special, threshold });

/** Fresh match with p0 active and controlled hands. */
function setup(n: number, hands: Card[][], patch: Partial<MatchState> = {}): MatchState {
  const s = createMatch(seeds(n), DEFAULT_SETTINGS, 42);
  hands.forEach((h, i) => (s.hands[`p${i}`] = h));
  s.activeIndex = 0;
  return { ...s, ...patch };
}

function ok(s: MatchState, a: Action): MatchState {
  const r = applyAction(s, a);
  if (!r.ok) throw new Error(r.error);
  return r.state;
}

const active = (s: MatchState) => s.players[s.activeIndex].id;

describe('deck', () => {
  it('has 58 cards with unique ids', () => {
    const d = buildDeck();
    expect(d).toHaveLength(58);
    expect(new Set(d.map((c) => c.id)).size).toBe(58);
    expect(d.filter((c) => c.kind === 'SPECIAL')).toHaveLength(10);
  });

  it('deals hand size to every player', () => {
    const s = createMatch(seeds(8), DEFAULT_SETTINGS, 1);
    for (const p of s.players) expect(s.hands[p.id]).toHaveLength(5);
    expect(s.deck).toHaveLength(58 - 40);
  });
});

describe('turn flow', () => {
  it('number card adds to total, draws and passes turn', () => {
    const c = num(5);
    let s = setup(3, [[c, num(1)], [num(2)], [num(3)]]);
    s = ok(s, { type: 'PLAY', playerId: 'p0', cardId: c.id });
    expect(s.total).toBe(5);
    expect(s.hands.p0).toHaveLength(2);
    expect(active(s)).toBe('p1');
  });

  it('rejects play out of turn and unknown cards', () => {
    const s = setup(2, [[num(1)], [num(2)]]);
    expect(applyAction(s, { type: 'PLAY', playerId: 'p1', cardId: s.hands.p1[0].id }).ok).toBe(false);
    expect(applyAction(s, { type: 'PLAY', playerId: 'p0', cardId: 'nope' }).ok).toBe(false);
  });

  it('does not mutate the previous state', () => {
    const s = setup(2, [[num(4)], [num(2)]]);
    const snapshot = JSON.stringify(s);
    ok(s, { type: 'PLAY', playerId: 'p0', cardId: s.hands.p0[0].id });
    expect(JSON.stringify(s)).toBe(snapshot);
  });

  it('reshuffles discard when deck is empty', () => {
    const c = num(1);
    let s = setup(2, [[c], [num(2)]], { deck: [], discard: [num(9), num(8)] });
    s = ok(s, { type: 'PLAY', playerId: 'p0', cardId: c.id });
    expect(s.hands.p0).toHaveLength(1);
    expect(s.deck.length + s.discard.length).toBe(2);
  });
});

describe('overload', () => {
  it('going over the limit enters RESOLVING and blocks plays', () => {
    const c = num(5);
    let s = setup(3, [[c], [num(1)], [num(1)]], { total: 20 });
    s = ok(s, { type: 'PLAY', playerId: 'p0', cardId: c.id });
    expect(s.phase).toBe('RESOLVING');
    expect(s.resolution?.kind).toBe('OVERLOAD');
    expect(s.resolution?.total).toBe(25);
    expect(applyAction(s, { type: 'PLAY', playerId: 'p1', cardId: s.hands.p1[0].id }).ok).toBe(false);
    s = ok(s, { type: 'RESOLVE' });
    expect(s.total).toBe(0);
    expect(s.phase === 'TURN' || s.phase === 'OVER').toBe(true);
    expect(active(s)).toBe('p1');
    if (s.players[0].eliminated) expect(s.hands.p0).toHaveLength(0);
  });

  it('exactly the limit is safe', () => {
    const c = num(5);
    const s = ok(setup(2, [[c], [num(1)]], { total: 16 }), { type: 'PLAY', playerId: 'p0', cardId: c.id });
    expect(s.total).toBe(21);
    expect(s.phase).toBe('TURN');
  });

  it('death of the second-to-last player ends the match', () => {
    const c = num(9);
    let s = setup(2, [[c], [num(1)]], { total: 20, settings: { ...DEFAULT_SETTINGS, surviveChance: 50 } });
    s = ok(s, { type: 'PLAY', playerId: 'p0', cardId: c.id });
    s.resolution!.rolls[0] = { playerId: 'p0', roll: 99, survived: false };
    s = ok(s, { type: 'RESOLVE' });
    expect(s.phase).toBe('OVER');
    expect(s.winnerId).toBe('p1');
  });
});

describe('special cards', () => {
  it('ROLEBACK reverses and cannot be answered with ROLEBACK', () => {
    const r1 = sp('ROLEBACK');
    const r2 = sp('ROLEBACK');
    let s = setup(3, [[r1, num(1)], [num(1)], [r2, num(2)]]);
    s = ok(s, { type: 'PLAY', playerId: 'p0', cardId: r1.id });
    expect(s.direction).toBe(-1);
    expect(active(s)).toBe('p2');
    expect(applyAction(s, { type: 'PLAY', playerId: 'p2', cardId: r2.id }).ok).toBe(false);
    expect(legalMoves(s, 'p2').cardIds).not.toContain(r2.id);
  });

  it('GREATER_THAN forces a bigger number and bans specials', () => {
    const gt = sp('GREATER_THAN', 3);
    const low = num(2);
    const high = num(7);
    const skip = sp('SKIP');
    let s = setup(2, [[gt, num(1)], [low, high, skip]]);
    s = ok(s, { type: 'PLAY', playerId: 'p0', cardId: gt.id });
    expect(s.restriction).toEqual({ kind: 'GREATER_THAN', min: 3 });
    expect(legalMoves(s, 'p1')).toEqual({ cardIds: [high.id], trapped: false });
    expect(applyAction(s, { type: 'PLAY', playerId: 'p1', cardId: skip.id }).ok).toBe(false);
    s = ok(s, { type: 'PLAY', playerId: 'p1', cardId: high.id });
    expect(s.restriction).toBeNull();
  });

  it('TRAPPED: no legal card → any card, effect cancelled, forced roll', () => {
    const gt = sp('GREATER_THAN', 3);
    const reset = sp('RESET_ZERO');
    let s = setup(2, [[gt, num(1)], [reset, num(2)]], { total: 10 });
    s = ok(s, { type: 'PLAY', playerId: 'p0', cardId: gt.id });
    const legal = legalMoves(s, 'p1');
    expect(legal.trapped).toBe(true);
    expect(legal.cardIds).toHaveLength(2);
    s = ok(s, { type: 'PLAY', playerId: 'p1', cardId: reset.id });
    expect(s.phase).toBe('RESOLVING');
    expect(s.resolution?.kind).toBe('TRAPPED');
    expect(s.total).toBe(10); // effect cancelled
  });

  it('SKIP skips one player (3+) and just passes with 2', () => {
    const k = sp('SKIP');
    let s = ok(setup(3, [[k, num(1)], [num(1)], [num(1)]]), { type: 'PLAY', playerId: 'p0', cardId: k.id });
    expect(active(s)).toBe('p2');
    const k2 = sp('SKIP');
    s = ok(setup(2, [[k2, num(1)], [num(1)]]), { type: 'PLAY', playerId: 'p0', cardId: k2.id });
    expect(active(s)).toBe('p1');
  });

  it('RESET_ZERO, SET_LIMIT, MINUS_5', () => {
    const z = sp('RESET_ZERO');
    expect(ok(setup(2, [[z], [num(1)]], { total: 15 }), { type: 'PLAY', playerId: 'p0', cardId: z.id }).total).toBe(0);
    const m = sp('SET_LIMIT');
    const custom = { ...DEFAULT_SETTINGS, overloadLimit: 25 };
    expect(ok(setup(2, [[m], [num(1)]], { total: 3, settings: custom }), { type: 'PLAY', playerId: 'p0', cardId: m.id }).total).toBe(25);
    const minus = sp('MINUS_5');
    expect(ok(setup(2, [[minus], [num(1)]], { total: 3 }), { type: 'PLAY', playerId: 'p0', cardId: minus.id }).total).toBe(0);
  });

  it('DEATH rolls everyone; if all fail the owner is spared', () => {
    const d = sp('DEATH');
    let s = setup(3, [[d, num(1)], [num(1)], [num(1)]]);
    s = ok(s, { type: 'PLAY', playerId: 'p0', cardId: d.id });
    expect(s.resolution?.kind).toBe('DEATH');
    expect(s.resolution?.rolls).toHaveLength(3);
    // force everyone to fail
    s.resolution!.rolls = s.resolution!.rolls.map((r) => ({ ...r, roll: 100, survived: false, spared: r.playerId === 'p0' }));
    s = ok(s, { type: 'RESOLVE' });
    expect(s.phase).toBe('OVER');
    expect(s.winnerId).toBe('p0');
  });
});

describe('timeouts, autopilot and leaving', () => {
  it('TIMEOUT plays a legal card for the active player', () => {
    let s = setup(2, [[num(3), num(4)], [num(1)]]);
    s = ok(s, { type: 'TIMEOUT', turnSeq: s.turnSeq });
    expect(active(s)).toBe('p1');
    expect(applyAction(s, { type: 'TIMEOUT', turnSeq: s.turnSeq - 1 }).ok).toBe(false);
  });

  it('REMOVE_PLAYER on the active player passes the turn', () => {
    let s = setup(3, [[num(1)], [num(1)], [num(1)]]);
    s = ok(s, { type: 'REMOVE_PLAYER', playerId: 'p0' });
    expect(s.players[0].eliminated).toBe(true);
    expect(active(s)).toBe('p1');
    s = ok(s, { type: 'REMOVE_PLAYER', playerId: 'p2' });
    expect(s.phase).toBe('OVER');
    expect(s.winnerId).toBe('p1');
  });

  it('REMOVE_PLAYER during RESOLVING still resolves cleanly', () => {
    const c = num(10);
    let s = setup(3, [[c], [num(1)], [num(1)]], { total: 15 });
    s = ok(s, { type: 'PLAY', playerId: 'p0', cardId: c.id });
    s = ok(s, { type: 'REMOVE_PLAYER', playerId: 'p1' });
    s = ok(s, { type: 'RESOLVE' });
    if (s.phase === 'TURN') expect(active(s)).toBe('p2');
  });
});

describe('views', () => {
  it('never leak other hands, deck or rng', () => {
    const s = createMatch(seeds(3), DEFAULT_SETTINGS, 9);
    const v = buildView(s, 'p1', { version: 1, turnMsLeft: null });
    const json = JSON.stringify(v);
    for (const c of s.hands.p0) expect(json).not.toContain(`"${c.id}"`);
    expect(json).not.toContain('rngState');
    expect(v.myHand).toEqual(s.hands.p1);
  });
});

describe('simulation', () => {
  const levels: BotLevel[] = ['EASY', 'NORMAL', 'HARD'];
  it('1000 random bot matches always finish with exactly one winner and no illegal move', () => {
    for (let game = 0; game < 1000; game++) {
      const n = 2 + (game % 7);
      const settings = {
        ...DEFAULT_SETTINGS,
        handSize: 3 + (game % 5),
        overloadLimit: 15 + (game % 17),
        surviveChance: 50 + (game % 41),
        botLevel: levels[game % 3],
      };
      let s = createMatch(seeds(n, true), settings, game + 1);
      const rand = createRng(game * 7 + 3);
      let steps = 0;
      while (s.phase !== 'OVER') {
        if (++steps > 5000) throw new Error(`match ${game} did not finish`);
        if (s.phase === 'RESOLVING') {
          s = ok(s, { type: 'RESOLVE' });
          continue;
        }
        const p = s.players[s.activeIndex];
        expect(p.eliminated).toBe(false);
        // occasionally a player leaves
        if (rand.next() < 0.002) {
          s = ok(s, { type: 'REMOVE_PLAYER', playerId: p.id });
          continue;
        }
        const cardId = chooseMove(s, p.id, settings.botLevel, () => rand.next());
        s = cardId ? ok(s, { type: 'PLAY', playerId: p.id, cardId }) : ok(s, { type: 'PASS', playerId: p.id });
        // card conservation
        const inHands = Object.values(s.hands).reduce((a, h) => a + h.length, 0);
        expect(inHands + s.deck.length + s.discard.length).toBe(58);
      }
      expect(s.winnerId).not.toBeNull();
      expect(s.players.filter((p) => !p.eliminated)).toHaveLength(1);
      expect(s.players.find((p) => !p.eliminated)!.id).toBe(s.winnerId);
    }
  });
});
