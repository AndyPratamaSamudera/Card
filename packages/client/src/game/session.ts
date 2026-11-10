import { io, type Socket } from 'socket.io-client';
import {
  createMatch,
  MatchRunner,
  randomSeed,
  type Ack,
  type C2SEvent,
  type JoinedAck,
  type MatchSettings,
  type MatchView,
  type PlayerSeed,
  type RoomView,
} from '@overload21/shared';
import { useStore, saveSetup, type LocalSetup } from '../store/store';
import { reactToView } from './reactions';
import { music, sfx } from '../audio/audio';

/**
 * The UI talks to a match only through these functions. Two backends:
 * - local: MatchRunner in the browser (bots / hot-seat)
 * - online: Socket.IO server (authoritative)
 */

const st = () => useStore.getState();

function pushView(view: MatchView) {
  const prev = st().view;
  // Ignore stale/out-of-order views (the view is reset to null between matches).
  if (prev && view.version < prev.version) return;
  reactToView(prev, view);
  useStore.setState({ view, viewAt: performance.now() });
}

// ─── Local ──────────────────────────────────────────────────────────────────
class LocalSession {
  private runner: MatchRunner;
  private humans: string[];
  /** Hot-seat: human whose hand is currently shown */
  private revealed: string | null = null;

  constructor(readonly setup: LocalSetup) {
    const seeds: PlayerSeed[] = [
      ...setup.humans.map((h, i) => ({ id: `h${i}`, name: h.name, avatar: h.avatar, isBot: false })),
      ...Array.from({ length: setup.bots }, (_, i) => ({
        id: `b${i}`,
        name: ['BYTE', 'PIXEL', 'GLITCH', 'TURBO', 'NEON', 'CHIP', 'LASER'][i] ?? `BOT${i + 1}`,
        avatar: (setup.humans.length + i + (setup.humans[0]?.avatar ?? 0)) % 8,
        isBot: true,
      })),
    ];
    this.humans = seeds.filter((s) => !s.isBot).map((s) => s.id);
    if (setup.mode === 'bot') this.revealed = this.humans[0];
    this.runner = new MatchRunner(createMatch(seeds, setup.settings, randomSeed()), {
      onChange: () => this.push(),
      manualHumanTimer: setup.mode === 'hotseat',
      botDelayMs: [700, 1300],
    });
  }

  start() {
    this.runner.start();
  }

  private push() {
    const s = this.runner.state;
    let cover: string | null = null;
    if (this.setup.mode === 'hotseat') {
      const active = s.players[s.activeIndex];
      const humanTurn = s.phase === 'TURN' && active && !active.isBot;
      if (humanTurn && active.id !== this.revealed) cover = active.id;
    }
    useStore.setState({ cover });
    pushView(this.runner.view(this.revealed));
  }

  reveal() {
    const cover = st().cover;
    if (!cover) return;
    this.revealed = cover;
    useStore.setState({ cover: null });
    this.runner.startHumanTimer();
    this.push();
  }

  play(cardId: string): string | null {
    if (!this.revealed) return 'Bukan giliranmu!';
    const res = this.runner.dispatch({ type: 'PLAY', playerId: this.revealed, cardId });
    return res.ok ? null : res.error;
  }

  dispose() {
    this.runner.dispose();
  }
}

let local: LocalSession | null = null;

export function startLocal(setup: LocalSetup) {
  saveSetup(setup);
  stopLocal();
  useStore.setState({ view: null, room: null, cover: null, mode: setup.mode, localSetup: setup, screen: 'table' });
  local = new LocalSession(setup);
  local.start();
  music.play('game');
}

function stopLocal() {
  local?.dispose();
  local = null;
}

export function revealHotseat() {
  sfx.select();
  local?.reveal();
}

// ─── Online ─────────────────────────────────────────────────────────────────
const SESSION_KEY = 'o21.session';
interface SavedSession {
  code: string;
  token: string;
}

function readSession(): SavedSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as SavedSession) : null;
  } catch {
    return null;
  }
}

function writeSession(s: SavedSession | null) {
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

let socket: Socket | null = null;

function ensureSocket(): Socket {
  if (socket) return socket;
  useStore.setState({ connection: 'connecting' });
  socket = io({ transports: ['websocket', 'polling'], reconnectionDelayMax: 4000 });

  socket.on('connect', () => {
    useStore.setState({ connection: 'online' });
    const saved = readSession();
    if (saved) void tryReconnect(saved);
  });
  socket.on('disconnect', () => {
    useStore.setState({ connection: 'offline' });
    if (st().mode === 'online') st().showToast('Koneksi terputus… mencoba menyambung lagi', 'error');
  });
  socket.on('connect_error', () => useStore.setState({ connection: 'offline' }));

  socket.on('room:state', (room: RoomView) => {
    if (st().mode !== 'online') return;
    const patch: Partial<ReturnType<typeof st>> = { room };
    if (room.status === 'LOBBY') {
      patch.view = null;
      patch.screen = 'lobby';
      music.play('menu');
    } else {
      patch.screen = 'table';
      music.play('game');
    }
    useStore.setState(patch);
  });

  socket.on('game:view', (view: MatchView) => {
    if (st().mode !== 'online') return;
    pushView(view);
  });

  socket.on('room:gone', ({ reason }: { reason: string }) => {
    writeSession(null);
    if (st().mode !== 'online') return;
    st().showToast(reason, 'error');
    useStore.setState({ room: null, view: null, screen: 'online', mode: null });
    music.play('menu');
  });

  return socket;
}

function emit<T = object>(event: C2SEvent, payload?: unknown): Promise<Ack<T>> {
  const s = ensureSocket();
  return new Promise((resolve) => {
    if (!s.connected) {
      resolve({ ok: false, error: 'Belum tersambung ke server.' });
      return;
    }
    s.timeout(8000).emit(event, payload ?? {}, (err: Error | null, res: Ack<T>) => {
      resolve(err ? { ok: false, error: 'Server tidak merespon.' } : res);
    });
  });
}

async function tryReconnect(saved: SavedSession) {
  // A local match in progress wins over an old online session.
  if (st().mode === 'bot' || st().mode === 'hotseat') return;
  // Set the mode first: the server pushes room:state before answering the ack.
  useStore.setState({ mode: 'online' });
  const res = await emit<JoinedAck>('room:reconnect', saved);
  if (!res.ok) {
    writeSession(null);
    const inRoom = st().screen === 'lobby' || st().screen === 'table';
    useStore.setState({ mode: null, room: null, view: null, ...(inRoom ? { screen: 'online' as const } : {}) });
    if (inRoom) st().showToast('Sesi online berakhir.', 'error');
  }
}

/** Called once at startup: connect only if there is a session to restore. */
export function bootOnline() {
  if (readSession()) ensureSocket();
}

export function connectOnline() {
  ensureSocket();
}

function afterJoin(res: Ack<JoinedAck>): string | null {
  if (!res.ok) return res.error;
  writeSession({ code: res.code, token: res.token });
  return null;
}

export async function createRoom(name: string, avatar: number): Promise<string | null> {
  useStore.setState({ mode: 'online' });
  const err = afterJoin(await emit<JoinedAck>('room:create', { name, avatar }));
  if (err) useStore.setState({ mode: null });
  return err;
}

export async function joinRoom(code: string, name: string, avatar: number): Promise<string | null> {
  useStore.setState({ mode: 'online' });
  const err = afterJoin(await emit<JoinedAck>('room:join', { code, name, avatar }));
  if (err) useStore.setState({ mode: null });
  return err;
}

const simple = async (event: C2SEvent, payload?: unknown): Promise<string | null> => {
  const res = await emit(event, payload);
  return res.ok ? null : res.error;
};

export const online = {
  ready: (ready: boolean) => simple('room:ready', { ready }),
  settings: (patch: Partial<MatchSettings>) => simple('room:settings', patch),
  addBot: () => simple('room:add_bot'),
  kick: (playerId: string) => simple('room:kick', { playerId }),
  start: () => simple('game:start'),
};

// ─── Shared actions used by the table ───────────────────────────────────────
export async function playCard(cardId: string): Promise<string | null> {
  const mode = st().mode;
  if (mode === 'online') return simple('game:play', { cardId });
  return local ? local.play(cardId) : 'Tidak ada match.';
}

export async function rematch(): Promise<string | null> {
  const mode = st().mode;
  if (mode === 'online') return simple('game:rematch');
  const setup = st().localSetup;
  if (setup) startLocal(setup);
  return null;
}

export function leaveMatch() {
  const mode = st().mode;
  if (mode === 'online') {
    void emit('room:leave');
    writeSession(null);
  }
  stopLocal();
  useStore.setState({ mode: null, view: null, room: null, cover: null, screen: 'menu' });
  music.play('menu');
}
