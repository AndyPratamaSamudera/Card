import crypto from 'node:crypto';
import {
  applySettingsPatch,
  createMatch,
  DEFAULT_SETTINGS,
  MatchRunner,
  MIN_PLAYERS,
  randomSeed,
  type MatchSettings,
  type MatchView,
  type RoomStatus,
  type RoomView,
} from '@overload21/shared';

export interface Member {
  id: string;
  name: string;
  avatar: number;
  isBot: boolean;
  ready: boolean;
  token: string;
  socketId: string | null;
}

/** Transport the room uses to talk to sockets (implemented by RoomManager). */
export interface RoomOutput {
  roomState(socketId: string, room: RoomView): void;
  gameView(socketId: string, view: MatchView): void;
}

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const BOT_NAMES = ['BYTE', 'PIXEL', 'GLITCH', 'TURBO', 'NEON', 'CHIP', 'LASER', 'BLIP', 'VOLT', 'RETRO'];

/**
 * One room: lobby membership + (while playing) the match runner. The runner's
 * MatchState is the single source of truth for everything in-game; members
 * only hold connection info.
 */
export class GameRoom {
  status: RoomStatus = 'LOBBY';
  settings: MatchSettings = { ...DEFAULT_SETTINGS };
  members: Member[] = [];
  hostId = '';
  runner: MatchRunner | null = null;

  constructor(
    readonly code: string,
    private readonly out: RoomOutput,
    private readonly runnerOpts: { botDelayMs?: [number, number] } = {},
  ) {}

  // ─── membership ───────────────────────────────────────────────────────────
  get humans(): Member[] {
    return this.members.filter((m) => !m.isBot);
  }

  get isFull(): boolean {
    return this.members.length >= this.settings.maxPlayers;
  }

  addHuman(name: string, avatar: number, socketId: string): Member {
    const m: Member = {
      id: `p_${crypto.randomUUID().slice(0, 8)}`,
      name: this.uniqueName(name),
      avatar,
      isBot: false,
      ready: false,
      token: crypto.randomUUID(),
      socketId,
    };
    this.members.push(m);
    if (!this.hostId) this.hostId = m.id;
    return m;
  }

  addBot(): Result {
    if (this.status !== 'LOBBY') return { ok: false, error: 'Match sedang berjalan.' };
    if (this.isFull) return { ok: false, error: 'Room penuh.' };
    const used = new Set(this.members.map((m) => m.name));
    const name = BOT_NAMES.find((n) => !used.has(n)) ?? this.uniqueName('BOT');
    this.members.push({
      id: `b_${crypto.randomUUID().slice(0, 8)}`,
      name,
      avatar: this.members.length % 8,
      isBot: true,
      ready: true,
      token: '',
      socketId: null,
    });
    return { ok: true };
  }

  member(id: string): Member | undefined {
    return this.members.find((m) => m.id === id);
  }

  /** Remove a member (leave / kick / lobby timeout). Returns false when the room is now empty of humans. */
  removeMember(id: string): boolean {
    const m = this.member(id);
    if (!m) return this.humans.length > 0;
    this.members = this.members.filter((x) => x.id !== id);
    if (this.runner) this.runner.dispatch({ type: 'REMOVE_PLAYER', playerId: id });
    if (this.hostId === id) {
      this.hostId = this.humans.find((h) => h.socketId)?.id ?? this.humans[0]?.id ?? '';
    }
    return this.humans.length > 0;
  }

  setConnected(id: string, socketId: string | null) {
    const m = this.member(id);
    if (!m) return;
    m.socketId = socketId;
  }

  setAutopilot(id: string, on: boolean) {
    this.runner?.dispatch({ type: 'SET_AUTOPILOT', playerId: id, on });
  }

  // ─── host actions ─────────────────────────────────────────────────────────
  updateSettings(byId: string, patch: Partial<MatchSettings>): Result {
    if (byId !== this.hostId) return { ok: false, error: 'Hanya host yang bisa mengubah pengaturan.' };
    if (this.status !== 'LOBBY') return { ok: false, error: 'Match sedang berjalan.' };
    const next = applySettingsPatch(this.settings, patch);
    if (next.maxPlayers < this.members.length) return { ok: false, error: 'Pemain di room lebih banyak dari batas itu.' };
    this.settings = next;
    return { ok: true };
  }

  setReady(id: string, ready: boolean): Result {
    if (this.status !== 'LOBBY') return { ok: false, error: 'Match sedang berjalan.' };
    const m = this.member(id);
    if (!m) return { ok: false, error: 'Kamu tidak ada di room ini.' };
    m.ready = ready;
    return { ok: true };
  }

  start(byId: string): Result {
    if (byId !== this.hostId) return { ok: false, error: 'Hanya host yang bisa memulai.' };
    if (this.status !== 'LOBBY') return { ok: false, error: 'Match sudah berjalan.' };
    if (this.members.length < MIN_PLAYERS) return { ok: false, error: `Butuh minimal ${MIN_PLAYERS} pemain (tambah bot?).` };
    const notReady = this.humans.filter((h) => h.id !== this.hostId && !h.ready);
    if (notReady.length) return { ok: false, error: `Menunggu siap: ${notReady.map((n) => n.name).join(', ')}` };

    const state = createMatch(
      this.members.map((m) => ({ id: m.id, name: m.name, avatar: m.avatar, isBot: m.isBot })),
      this.settings,
      randomSeed(),
    );
    this.status = 'PLAYING';
    this.runner = new MatchRunner(state, {
      onChange: () => this.broadcastGame(),
      botDelayMs: this.runnerOpts.botDelayMs,
    });
    // Humans already offline at start are handled by the bot right away.
    for (const h of this.humans) if (!h.socketId) state.players.find((p) => p.id === h.id)!.autopilot = true;
    this.runner.start();
    return { ok: true };
  }

  play(byId: string, cardId: string): Result {
    if (!this.runner) return { ok: false, error: 'Match belum dimulai.' };
    const res = this.runner.dispatch({ type: 'PLAY', playerId: byId, cardId });
    return res.ok ? { ok: true } : res;
  }

  rematch(byId: string): Result {
    if (byId !== this.hostId) return { ok: false, error: 'Hanya host yang bisa memulai ulang.' };
    if (!this.runner || this.runner.state.phase !== 'OVER') return { ok: false, error: 'Match belum selesai.' };
    this.backToLobby();
    return { ok: true };
  }

  backToLobby() {
    this.runner?.dispose();
    this.runner = null;
    this.status = 'LOBBY';
    for (const m of this.members) m.ready = m.isBot;
  }

  kick(byId: string, targetId: string): Result<{ member: Member }> {
    if (byId !== this.hostId) return { ok: false, error: 'Hanya host yang bisa mengeluarkan pemain.' };
    if (targetId === this.hostId) return { ok: false, error: 'Host tidak bisa mengeluarkan dirinya sendiri.' };
    if (this.status !== 'LOBBY') return { ok: false, error: 'Tidak bisa kick saat match berjalan.' };
    const m = this.member(targetId);
    if (!m) return { ok: false, error: 'Pemain tidak ditemukan.' };
    this.removeMember(targetId);
    return { ok: true, member: m };
  }

  dispose() {
    this.runner?.dispose();
    this.runner = null;
  }

  // ─── output ───────────────────────────────────────────────────────────────
  roomView(you: string): RoomView {
    return {
      code: this.code,
      hostId: this.hostId,
      status: this.status,
      settings: { ...this.settings },
      members: this.members.map((m) => ({
        id: m.id,
        name: m.name,
        avatar: m.avatar,
        isBot: m.isBot,
        ready: m.ready,
        connected: m.isBot || m.socketId !== null,
      })),
      you,
    };
  }

  broadcastRoom() {
    for (const m of this.humans) if (m.socketId) this.out.roomState(m.socketId, this.roomView(m.id));
  }

  broadcastGame() {
    if (!this.runner) return;
    const connected: Record<string, boolean> = {};
    for (const m of this.members) connected[m.id] = m.isBot || m.socketId !== null;
    for (const m of this.humans) if (m.socketId) this.out.gameView(m.socketId, this.runner.view(m.id, connected));
  }

  private uniqueName(base: string): string {
    const names = new Set(this.members.map((m) => m.name.toLowerCase()));
    if (!names.has(base.toLowerCase())) return base;
    for (let i = 2; ; i++) {
      const n = `${base.slice(0, 10)}${i}`;
      if (!names.has(n.toLowerCase())) return n;
    }
  }
}
