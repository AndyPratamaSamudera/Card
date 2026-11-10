import type { Action, ActionResult, MatchState, MatchView } from './types.js';
import { applyAction, resolveDurationMs } from './reducer.js';
import { chooseMove } from './ai.js';
import { activePlayer } from './rules.js';
import { buildView } from './view.js';

export interface RunnerOptions {
  onChange: (runner: MatchRunner) => void;
  /** Bot "thinking" time range in ms */
  botDelayMs?: [number, number];
  /**
   * When true the human turn timer only starts after startHumanTimer() is
   * called (hot-seat: after the "pass the device" screen).
   */
  manualHumanTimer?: boolean;
  now?: () => number;
  random?: () => number;
}

/**
 * Drives a MatchState in real time: fires RESOLVE after the roll animation,
 * makes bots/autopilot players move and enforces the turn timer.
 *
 * Exactly one timer is pending at any time and every callback re-checks the
 * state it was scheduled for, so stale timers can never act on a new turn.
 * Used by the server (online) and by the browser (bots / hot-seat).
 */
export class MatchRunner {
  private _state: MatchState;
  private _version = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private turnDeadline: number | null = null;
  private timerTurnSeq = -1;
  private disposed = false;
  private readonly opts: Required<Omit<RunnerOptions, 'onChange'>> & Pick<RunnerOptions, 'onChange'>;

  constructor(initial: MatchState, opts: RunnerOptions) {
    this._state = initial;
    this.opts = {
      botDelayMs: [900, 1700],
      manualHumanTimer: false,
      now: () => Date.now(),
      random: Math.random,
      ...opts,
    };
  }

  get state(): MatchState {
    return this._state;
  }

  get version(): number {
    return this._version;
  }

  start(): void {
    this.schedule();
    this.opts.onChange(this);
  }

  dispatch(action: Action): ActionResult {
    if (this.disposed) return { ok: false, error: 'Match sudah ditutup.' };
    const res = applyAction(this._state, action);
    if (res.ok) {
      this._state = res.state;
      this._version++;
      this.schedule();
      this.opts.onChange(this);
    }
    return res;
  }

  /** Hot-seat: start the turn timer for the current human turn (idempotent). */
  startHumanTimer(): void {
    const s = this._state;
    const p = activePlayer(s);
    if (!p || s.phase !== 'TURN' || p.isBot || p.autopilot) return;
    if (this.timerTurnSeq === s.turnSeq || s.settings.turnSeconds <= 0) return;
    this.armTurnTimer();
    this.opts.onChange(this);
  }

  turnMsLeft(): number | null {
    if (this.turnDeadline === null) return null;
    return Math.max(0, this.turnDeadline - this.opts.now());
  }

  view(viewerId: string | null, connected?: Record<string, boolean>): MatchView {
    return buildView(this._state, viewerId, {
      version: this._version,
      turnMsLeft: this.turnMsLeft(),
      connected,
    });
  }

  dispose(): void {
    this.disposed = true;
    this.clear();
  }

  // ─── internals ────────────────────────────────────────────────────────────
  private clear() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.turnDeadline = null;
    this.timerTurnSeq = -1;
  }

  private later(ms: number, fn: () => void) {
    this.timer = setTimeout(() => {
      this.timer = null;
      if (!this.disposed) fn();
    }, ms);
  }

  private schedule() {
    this.clear();
    const s = this._state;
    if (s.phase === 'OVER') return;

    if (s.phase === 'RESOLVING') {
      const resId = s.resolution?.id;
      this.later(resolveDurationMs(s.resolution), () => {
        if (this._state.phase === 'RESOLVING' && this._state.resolution?.id === resId) {
          this.dispatch({ type: 'RESOLVE' });
        }
      });
      return;
    }

    const p = activePlayer(s);
    if (!p) return;
    const turnSeq = s.turnSeq;

    if (p.isBot || p.autopilot) {
      const [min, max] = this.opts.botDelayMs;
      const delay = min + Math.floor(this.opts.random() * Math.max(1, max - min));
      this.later(delay, () => this.botMove(turnSeq));
      return;
    }

    if (s.settings.turnSeconds > 0 && !this.opts.manualHumanTimer) this.armTurnTimer();
  }

  private armTurnTimer() {
    const s = this._state;
    const turnSeq = s.turnSeq;
    const ms = s.settings.turnSeconds * 1000;
    if (this.timer) clearTimeout(this.timer);
    this.timerTurnSeq = turnSeq;
    this.turnDeadline = this.opts.now() + ms;
    this.later(ms, () => {
      if (this._state.phase === 'TURN' && this._state.turnSeq === turnSeq) {
        this.dispatch({ type: 'TIMEOUT', turnSeq });
      }
    });
  }

  private botMove(turnSeq: number) {
    const s = this._state;
    const p = activePlayer(s);
    if (s.phase !== 'TURN' || s.turnSeq !== turnSeq || !p) return;
    const level = s.settings.botLevel;
    const cardId = chooseMove(s, p.id, level, this.opts.random);
    if (!cardId) {
      this.dispatch({ type: 'PASS', playerId: p.id });
      return;
    }
    const res = this.dispatch({ type: 'PLAY', playerId: p.id, cardId });
    if (!res.ok) {
      // Should never happen (AI only picks legal cards) — fall back to the timeout path.
      this.dispatch({ type: 'TIMEOUT', turnSeq });
    }
  }
}
