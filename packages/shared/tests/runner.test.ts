import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMatch, DEFAULT_SETTINGS, MatchRunner, type PlayerSeed } from '../src/index.js';

const players = (humans: number, bots: number): PlayerSeed[] => [
  ...Array.from({ length: humans }, (_, i) => ({ id: `h${i}`, name: `H${i}`, avatar: i, isBot: false })),
  ...Array.from({ length: bots }, (_, i) => ({ id: `b${i}`, name: `B${i}`, avatar: i, isBot: true })),
];

describe('MatchRunner', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('an all-bot match plays itself to the end', () => {
    const r = new MatchRunner(createMatch(players(0, 4), DEFAULT_SETTINGS, 5), { onChange: () => {} });
    r.start();
    vi.advanceTimersByTime(30 * 60 * 1000);
    expect(r.state.phase).toBe('OVER');
    r.dispose();
  });

  it('turn timer auto-plays for an idle human, so the match never stalls', () => {
    const s = createMatch(players(3, 0), { ...DEFAULT_SETTINGS, turnSeconds: 10 }, 7);
    const r = new MatchRunner(s, { onChange: () => {} });
    r.start();
    const seq = r.state.turnSeq;
    expect(r.turnMsLeft()).toBe(10_000);
    vi.advanceTimersByTime(10_001);
    expect(r.state.turnSeq).toBeGreaterThan(seq);
    vi.advanceTimersByTime(60 * 60 * 1000);
    expect(r.state.phase).toBe('OVER');
    r.dispose();
  });

  it('autopilot takes over a disconnected human immediately', () => {
    const s = createMatch(players(2, 0), { ...DEFAULT_SETTINGS, turnSeconds: 0 }, 3);
    const r = new MatchRunner(s, { onChange: () => {} });
    r.start();
    const active = r.state.players[r.state.activeIndex].id;
    const seq = r.state.turnSeq;
    vi.advanceTimersByTime(60_000);
    expect(r.state.turnSeq).toBe(seq); // no timer → waits forever for a human
    r.dispatch({ type: 'SET_AUTOPILOT', playerId: active, on: true });
    vi.advanceTimersByTime(2_000);
    expect(r.state.turnSeq).toBeGreaterThan(seq);
    r.dispose();
  });

  it('manual human timer only starts when asked (hot-seat)', () => {
    const s = createMatch(players(2, 0), { ...DEFAULT_SETTINGS, turnSeconds: 10 }, 3);
    const r = new MatchRunner(s, { onChange: () => {}, manualHumanTimer: true });
    r.start();
    expect(r.turnMsLeft()).toBeNull();
    r.startHumanTimer();
    expect(r.turnMsLeft()).toBe(10_000);
    r.dispose();
  });

  it('dispose stops everything', () => {
    const r = new MatchRunner(createMatch(players(0, 3), DEFAULT_SETTINGS, 5), { onChange: () => {} });
    r.start();
    r.dispose();
    const seq = r.state.turnSeq;
    vi.advanceTimersByTime(60_000);
    expect(r.state.turnSeq).toBe(seq);
  });
});
