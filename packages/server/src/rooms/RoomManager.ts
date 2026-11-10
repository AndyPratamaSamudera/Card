import crypto from 'node:crypto';
import type { Ack, JoinedAck, MatchSettings, MatchView, RoomView } from '@overload21/shared';
import { GameRoom, type Member, type RoomOutput } from './GameRoom.js';

export interface Transport {
  emit(socketId: string, event: 'room:state', payload: RoomView): void;
  emit(socketId: string, event: 'game:view', payload: MatchView): void;
  emit(socketId: string, event: 'room:gone', payload: { reason: string }): void;
}

export interface ManagerOptions {
  /** Lobby: remove a disconnected member after this long */
  lobbyGraceMs?: number;
  /** Match: give a disconnected human's seat to the bot after this long */
  autopilotGraceMs?: number;
  /** Close a room when no human has been connected for this long */
  emptyRoomMs?: number;
  botDelayMs?: [number, number];
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

interface SocketBinding {
  code: string;
  playerId: string;
}

/**
 * Owns all rooms and the socket ↔ player mapping. Every public method takes
 * the caller's socket id and returns an Ack; it never throws on bad input.
 */
export class RoomManager {
  readonly rooms = new Map<string, GameRoom>();
  private readonly bindings = new Map<string, SocketBinding>();
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly opts: Required<ManagerOptions>;

  constructor(private readonly transport: Transport, opts: ManagerOptions = {}) {
    this.opts = {
      lobbyGraceMs: 20_000,
      autopilotGraceMs: 5_000,
      emptyRoomMs: 120_000,
      botDelayMs: [900, 1700],
      ...opts,
    };
  }

  // ─── lifecycle ────────────────────────────────────────────────────────────
  create(socketId: string, name: string, avatar: number): Ack<JoinedAck> {
    this.leave(socketId);
    const room = new GameRoom(this.newCode(), this.output(), { botDelayMs: this.opts.botDelayMs });
    this.rooms.set(room.code, room);
    const m = room.addHuman(name, avatar, socketId);
    this.bind(socketId, room, m);
    room.broadcastRoom();
    return { ok: true, code: room.code, playerId: m.id, token: m.token };
  }

  join(socketId: string, code: string, name: string, avatar: number): Ack<JoinedAck> {
    const room = this.rooms.get(code);
    if (!room) return { ok: false, error: `Room ${code} tidak ditemukan.` };
    if (room.status !== 'LOBBY') return { ok: false, error: 'Match di room ini sudah berjalan.' };
    if (room.isFull) return { ok: false, error: 'Room penuh.' };
    this.leave(socketId);
    const m = room.addHuman(name, avatar, socketId);
    this.bind(socketId, room, m);
    this.clearTimer(`room:${room.code}`);
    room.broadcastRoom();
    return { ok: true, code: room.code, playerId: m.id, token: m.token };
  }

  reconnect(socketId: string, code: string, token: string): Ack<JoinedAck> {
    const room = this.rooms.get(code);
    const m = room?.members.find((x) => !x.isBot && x.token === token);
    if (!room || !m) return { ok: false, error: 'Sesi sudah tidak berlaku.' };
    // Drop whatever this socket was bound to before, and the member's old socket.
    const prev = this.bindings.get(socketId);
    if (prev && (prev.code !== code || prev.playerId !== m.id)) this.leave(socketId);
    if (m.socketId && m.socketId !== socketId) {
      this.bindings.delete(m.socketId);
      this.transport.emit(m.socketId, 'room:gone', { reason: 'Akunmu tersambung dari tab lain.' });
    }
    this.bind(socketId, room, m);
    this.clearTimer(`member:${m.id}`);
    this.clearTimer(`room:${room.code}`);
    room.setAutopilot(m.id, false);
    room.broadcastRoom();
    room.broadcastGame();
    return { ok: true, code: room.code, playerId: m.id, token: m.token };
  }

  /** Voluntary leave (also used before create/join). */
  leave(socketId: string): Ack {
    const ctx = this.ctx(socketId);
    this.bindings.delete(socketId);
    if (!ctx) return { ok: true };
    this.dropMember(ctx.room, ctx.member.id);
    return { ok: true };
  }

  disconnect(socketId: string): void {
    const ctx = this.ctx(socketId);
    this.bindings.delete(socketId);
    if (!ctx) return;
    const { room, member } = ctx;
    room.setConnected(member.id, null);

    if (room.status === 'LOBBY') {
      this.setTimer(`member:${member.id}`, this.opts.lobbyGraceMs, () => {
        if (!member.socketId) this.dropMember(room, member.id);
      });
    } else {
      this.setTimer(`member:${member.id}`, this.opts.autopilotGraceMs, () => {
        if (!member.socketId) room.setAutopilot(member.id, true);
      });
    }

    if (!room.humans.some((h) => h.socketId)) {
      this.setTimer(`room:${room.code}`, this.opts.emptyRoomMs, () => {
        if (!room.humans.some((h) => h.socketId)) this.closeRoom(room);
      });
    }
    room.broadcastRoom();
    room.broadcastGame();
  }

  // ─── room actions ─────────────────────────────────────────────────────────
  setReady(socketId: string, ready: boolean): Ack {
    return this.withRoom(socketId, (room, m) => room.setReady(m.id, ready), 'room');
  }

  updateSettings(socketId: string, patch: Partial<MatchSettings>): Ack {
    return this.withRoom(socketId, (room, m) => room.updateSettings(m.id, patch), 'room');
  }

  addBot(socketId: string): Ack {
    return this.withRoom(
      socketId,
      (room, m) => (m.id === room.hostId ? room.addBot() : { ok: false, error: 'Hanya host yang bisa menambah bot.' }),
      'room',
    );
  }

  kick(socketId: string, targetId: string): Ack {
    return this.withRoom(
      socketId,
      (room, m) => {
        const res = room.kick(m.id, targetId);
        if (!res.ok) return res;
        this.clearTimer(`member:${targetId}`);
        const sid = res.member.socketId;
        if (sid) {
          this.bindings.delete(sid);
          this.transport.emit(sid, 'room:gone', { reason: 'Kamu dikeluarkan oleh host.' });
        }
        return { ok: true };
      },
      'room',
    );
  }

  start(socketId: string): Ack {
    return this.withRoom(socketId, (room, m) => room.start(m.id), 'room');
  }

  play(socketId: string, cardId: string): Ack {
    // The runner broadcasts game views on every successful action.
    return this.withRoom(socketId, (room, m) => room.play(m.id, cardId), 'none');
  }

  rematch(socketId: string): Ack {
    return this.withRoom(socketId, (room, m) => room.rematch(m.id), 'room');
  }

  shutdown(): void {
    for (const t of this.timers.values()) clearTimeout(t);
    this.timers.clear();
    for (const r of this.rooms.values()) r.dispose();
    this.rooms.clear();
    this.bindings.clear();
  }

  // ─── internals ────────────────────────────────────────────────────────────
  private withRoom(
    socketId: string,
    fn: (room: GameRoom, m: Member) => Ack,
    broadcast: 'room' | 'none',
  ): Ack {
    const ctx = this.ctx(socketId);
    if (!ctx) return { ok: false, error: 'Kamu belum masuk room.' };
    const res = fn(ctx.room, ctx.member);
    if (res.ok && broadcast === 'room') ctx.room.broadcastRoom();
    return res;
  }

  private dropMember(room: GameRoom, memberId: string) {
    this.clearTimer(`member:${memberId}`);
    const m = room.member(memberId);
    if (m?.socketId) this.bindings.delete(m.socketId);
    const anyHumans = room.removeMember(memberId);
    if (!anyHumans) {
      this.closeRoom(room);
      return;
    }
    room.broadcastRoom();
  }

  private closeRoom(room: GameRoom) {
    for (const m of room.members) {
      this.clearTimer(`member:${m.id}`);
      if (m.socketId) {
        this.bindings.delete(m.socketId);
        this.transport.emit(m.socketId, 'room:gone', { reason: 'Room ditutup.' });
      }
    }
    this.clearTimer(`room:${room.code}`);
    room.dispose();
    this.rooms.delete(room.code);
  }

  private ctx(socketId: string): { room: GameRoom; member: Member } | null {
    const b = this.bindings.get(socketId);
    if (!b) return null;
    const room = this.rooms.get(b.code);
    const member = room?.member(b.playerId);
    if (!room || !member) {
      this.bindings.delete(socketId);
      return null;
    }
    return { room, member };
  }

  private bind(socketId: string, room: GameRoom, m: Member) {
    m.socketId = socketId;
    this.bindings.set(socketId, { code: room.code, playerId: m.id });
  }

  private newCode(): string {
    for (;;) {
      let code = '';
      for (let i = 0; i < 4; i++) code += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
      if (!this.rooms.has(code)) return code;
    }
  }

  private setTimer(key: string, ms: number, fn: () => void) {
    this.clearTimer(key);
    this.timers.set(
      key,
      setTimeout(() => {
        this.timers.delete(key);
        fn();
      }, ms),
    );
  }

  private clearTimer(key: string) {
    const t = this.timers.get(key);
    if (t) clearTimeout(t);
    this.timers.delete(key);
  }

  private output(): RoomOutput {
    return {
      roomState: (sid, room) => this.transport.emit(sid, 'room:state', room),
      gameView: (sid, view) => this.transport.emit(sid, 'game:view', view),
    };
  }
}
