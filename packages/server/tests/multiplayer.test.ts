import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { io as connect, type Socket } from 'socket.io-client';
import type { AddressInfo } from 'node:net';
import type { Ack, JoinedAck, MatchView, RoomView } from '@overload21/shared';
import { buildApp, type App } from '../src/app.js';

let app: App;
let url: string;
const sockets: Socket[] = [];

beforeEach(async () => {
  app = await buildApp({
    serveClient: false,
    botDelayMs: [5, 10],
    autopilotGraceMs: 50,
    lobbyGraceMs: 80,
    emptyRoomMs: 200,
  });
  await app.fastify.listen({ port: 0, host: '127.0.0.1' });
  url = `http://127.0.0.1:${(app.fastify.server.address() as AddressInfo).port}`;
});

afterEach(async () => {
  for (const s of sockets.splice(0)) s.disconnect();
  await app.close();
});

interface Client {
  socket: Socket;
  room: RoomView | null;
  view: MatchView | null;
  gone: string | null;
  call<T = object>(event: string, payload?: unknown): Promise<Ack<T>>;
}

async function client(): Promise<Client> {
  const socket = connect(url, { transports: ['websocket'], forceNew: true });
  sockets.push(socket);
  const c: Client = {
    socket,
    room: null,
    view: null,
    gone: null,
    call: (event, payload) => new Promise((resolve) => socket.emit(event, payload ?? {}, resolve)),
  };
  socket.on('room:state', (r: RoomView) => (c.room = r));
  socket.on('game:view', (v: MatchView) => {
    if (!c.view || v.version >= c.view.version) c.view = v;
  });
  socket.on('room:gone', (g: { reason: string }) => (c.gone = g.reason));
  await new Promise<void>((r) => socket.on('connect', () => r()));
  return c;
}

const until = async (cond: () => boolean, ms = 3000) => {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > ms) throw new Error('timeout waiting for condition');
    await new Promise((r) => setTimeout(r, 10));
  }
};

describe('rooms', () => {
  it('create → join → ready → start → play', async () => {
    const a = await client();
    const b = await client();
    const created = await a.call<JoinedAck>('room:create', { name: 'Andi', avatar: 0 });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.code).toMatch(/^[A-Z0-9]{4}$/);

    const joined = await b.call<JoinedAck>('room:join', { code: created.code.toLowerCase(), name: 'Andi', avatar: 1 });
    expect(joined.ok).toBe(true);
    await until(() => a.room?.members.length === 2);
    expect(a.room!.members.map((m) => m.name)).toEqual(['Andi', 'Andi2']);

    expect((await a.call('game:start')).ok).toBe(false); // b not ready
    expect((await b.call('game:start')).ok).toBe(false); // not host
    expect((await b.call('room:ready', { ready: true })).ok).toBe(true);
    expect((await a.call('game:start')).ok).toBe(true);
    await until(() => !!a.view && !!b.view);
    expect(a.room!.status).toBe('PLAYING');

    const turn = a.view!.activePlayerId === a.view!.me ? a : b;
    const other = turn === a ? b : a;
    const card = turn.view!.legalCardIds[0];
    expect((await other.call('game:play', { cardId: other.view!.myHand[0].id })).ok).toBe(false);
    expect((await turn.call('game:play', { cardId: card })).ok).toBe(true);
    await until(() => other.view!.lastPlay?.card.id === card);
  });

  it('never leaks other players hands', async () => {
    const a = await client();
    const b = await client();
    const created = await a.call<JoinedAck>('room:create', { name: 'Ana', avatar: 0 });
    if (!created.ok) throw new Error();
    await b.call('room:join', { code: created.code, name: 'Budi', avatar: 1 });
    await b.call('room:ready', { ready: true });
    await a.call('game:start');
    await until(() => !!a.view && !!b.view);
    const raw = JSON.stringify(b.view);
    for (const c of a.view!.myHand) expect(raw).not.toContain(`"${c.id}"`);
    expect(raw).not.toContain('rngState');
    expect(raw).not.toContain('token');
  });

  it('host-only actions and lobby-only kick', async () => {
    const a = await client();
    const b = await client();
    const created = await a.call<JoinedAck>('room:create', { name: 'Host', avatar: 0 });
    if (!created.ok) throw new Error();
    const joined = await b.call<JoinedAck>('room:join', { code: created.code, name: 'Guest', avatar: 1 });
    if (!joined.ok) throw new Error();
    expect((await b.call('room:add_bot')).ok).toBe(false);
    expect((await b.call('room:settings', { overloadLimit: 30 })).ok).toBe(false);
    expect((await a.call('room:settings', { overloadLimit: 99 })).ok).toBe(false);
    expect((await a.call('room:settings', { overloadLimit: 25 })).ok).toBe(true);
    expect((await a.call('room:add_bot')).ok).toBe(true);
    expect((await a.call('room:kick', { playerId: joined.playerId })).ok).toBe(true);
    await until(() => b.gone !== null);
    await until(() => a.room?.members.length === 2);
    expect(a.room!.settings.overloadLimit).toBe(25);
    // kicked socket is no longer bound
    expect((await b.call('room:ready', { ready: true })).ok).toBe(false);
  });

  it('garbage payloads never crash the server', async () => {
    const a = await client();
    const bad: Array<[string, unknown]> = [
      ['room:create', 'x'],
      ['room:create', { name: '', avatar: 99 }],
      ['room:join', null],
      ['room:join', { code: 123 }],
      ['room:reconnect', { code: 'ABCD', token: 'nope' }],
      ['game:play', { cardId: 'x'.repeat(500) }],
      ['room:settings', { turnSeconds: 7 }],
      ['room:kick', {}],
    ];
    for (const [event, payload] of bad) {
      const res = await a.call(event, payload);
      expect(res.ok).toBe(false);
    }
    // events without an ack callback
    a.socket.emit('game:start', 'x');
    a.socket.emit('game:play');
    const ok = await a.call('room:create', { name: 'Still', avatar: 2 });
    expect(ok.ok).toBe(true);
  });

  it('a full match against bots finishes', async () => {
    const a = await client();
    const created = await a.call<JoinedAck>('room:create', { name: 'Solo', avatar: 0 });
    if (!created.ok) throw new Error();
    await a.call('room:settings', { turnSeconds: 0 });
    await a.call('room:add_bot');
    await a.call('room:add_bot');
    await a.call('game:start');
    await until(() => !!a.view);
    // play whenever it's our turn
    a.socket.on('game:view', (v: MatchView) => {
      if (v.phase === 'TURN' && v.activePlayerId === v.me && v.legalCardIds.length) {
        a.socket.emit('game:play', { cardId: v.legalCardIds[0] }, () => {});
      }
    });
    if (a.view!.activePlayerId === a.view!.me) await a.call('game:play', { cardId: a.view!.legalCardIds[0] });
    // resolutions take ~3s each, allow plenty of time
    await until(() => a.view?.phase === 'OVER', 120_000);
    expect(a.view!.winnerId).not.toBeNull();
    expect((await a.call('game:rematch')).ok).toBe(true);
    await until(() => a.room?.status === 'LOBBY');
  }, 130_000);
});

describe('connection handling', () => {
  it('reconnect with token restores the seat; disconnect hands the seat to the bot', async () => {
    const a = await client();
    const b = await client();
    const created = await a.call<JoinedAck>('room:create', { name: 'Ana', avatar: 0 });
    if (!created.ok) throw new Error();
    const joined = await b.call<JoinedAck>('room:join', { code: created.code, name: 'Budi', avatar: 1 });
    if (!joined.ok) throw new Error();
    await a.call('room:settings', { turnSeconds: 0 });
    await b.call('room:ready', { ready: true });
    await a.call('game:start');
    await until(() => !!b.view);

    b.socket.disconnect();
    await until(() => a.view!.players.find((p) => p.id === joined.playerId)?.autopilot === true);

    const b2 = await client();
    const back = await b2.call<JoinedAck>('room:reconnect', { code: created.code, token: joined.token });
    expect(back.ok).toBe(true);
    await until(() => !!b2.view);
    expect(b2.view!.me).toBe(joined.playerId);
    await until(() => a.view!.players.find((p) => p.id === joined.playerId)?.autopilot === false);
  });

  it('leaving mid-match forfeits and the other player wins', async () => {
    const a = await client();
    const b = await client();
    const created = await a.call<JoinedAck>('room:create', { name: 'Ana', avatar: 0 });
    if (!created.ok) throw new Error();
    await b.call('room:join', { code: created.code, name: 'Budi', avatar: 1 });
    await b.call('room:ready', { ready: true });
    await a.call('game:start');
    await until(() => !!a.view);
    expect((await b.call('room:leave')).ok).toBe(true);
    await until(() => a.view!.phase === 'OVER');
    expect(a.view!.winnerId).toBe(a.view!.me);
  });

  it('lobby member is removed after the grace period; empty rooms close', async () => {
    const a = await client();
    const b = await client();
    const created = await a.call<JoinedAck>('room:create', { name: 'Ana', avatar: 0 });
    if (!created.ok) throw new Error();
    await b.call('room:join', { code: created.code, name: 'Budi', avatar: 1 });
    await until(() => a.room?.members.length === 2);
    b.socket.disconnect();
    await until(() => a.room?.members.length === 1, 2000);
    a.socket.disconnect();
    await until(() => app.rooms.rooms.size === 0, 2000);
  });
});
