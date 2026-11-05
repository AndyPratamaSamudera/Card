import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { Server as SocketIOServer } from 'socket.io';
import { io as ClientIO, Socket as ClientSocket } from 'socket.io-client';
import { RoomManager } from '../src/rooms/RoomManager.js';
import { CreateRoomSchema, JoinRoomSchema, PlayCardSchema } from '@cosmic/shared';

describe('Realtime Multiplayer Socket Integration', () => {
  let fastify: FastifyInstance;
  let io: SocketIOServer;
  let port: number;
  let clientA: ClientSocket;
  let clientB: ClientSocket;

  beforeAll(async () => {
    fastify = Fastify();
    await fastify.register(cors, { origin: '*' });

    io = new SocketIOServer(fastify.server, {
      cors: { origin: '*' }
    });

    const roomManager = new RoomManager();

    const broadcastGameState = (roomCode: string) => {
      const engine = roomManager.getMatchEngine(roomCode);
      const room = roomManager.getRoomByCode(roomCode);
      if (!engine || !room) return;

      io.to(roomCode).emit('game:public_state', engine.getPublicGameState());

      for (const player of room.players) {
        if (!player.isAI) {
          const privateView = engine.getPlayerPrivateView(player.id);
          const s = Array.from(io.sockets.sockets.values()).find(
            sock => roomManager.getSessionBySocketId(sock.id)?.playerId === player.id
          );
          if (s) s.emit('game:private_view', privateView);
        }
      }
    };

    roomManager.onBroadcastRoomState = (code, room) => io.to(code).emit('room:updated', room);
    roomManager.onBroadcastGameState = (code) => broadcastGameState(code);

    io.on('connection', (socket) => {
      socket.on('room:create', (payload, cb) => {
        const parsed = CreateRoomSchema.safeParse(payload);
        if (!parsed.success) return cb?.({ success: false });
        const res = roomManager.createRoom(parsed.data.username, parsed.data.avatarId, socket.id);
        socket.join(res.room.code);
        cb?.({ success: true, ...res });
      });

      socket.on('room:join', (payload, cb) => {
        const parsed = JoinRoomSchema.safeParse(payload);
        if (!parsed.success) return cb?.({ success: false });
        const res = roomManager.joinRoom(parsed.data.roomCode, parsed.data.username, parsed.data.avatarId, socket.id);
        if (res.success && res.room) {
          socket.join(res.room.code);
          cb?.({ success: true, ...res });
          socket.to(res.room.code).emit('room:updated', res.room);
        } else {
          cb?.({ success: false, error: res.error });
        }
      });

      socket.on('room:toggle_ready', (cb) => {
        const room = roomManager.toggleReady(socket.id);
        if (room) {
          io.to(room.code).emit('room:updated', room);
          cb?.({ success: true });
        }
      });

      socket.on('game:start', (cb) => {
        const res = roomManager.startMatch(socket.id);
        if (res.success) {
          const session = roomManager.getSessionBySocketId(socket.id)!;
          broadcastGameState(session.roomCode);
          cb?.({ success: true });
        } else {
          cb?.({ success: false, error: res.error });
        }
      });

      socket.on('game:play_card', (payload, cb) => {
        const parsed = PlayCardSchema.safeParse(payload);
        if (!parsed.success) return cb?.({ success: false });
        const res = roomManager.playCard(socket.id, parsed.data.cardId, parsed.data.targetPlayerId);
        if (res.success) {
          const session = roomManager.getSessionBySocketId(socket.id)!;
          broadcastGameState(session.roomCode);
          cb?.({ success: true, events: res.events });
        } else {
          cb?.({ success: false, error: res.error });
        }
      });
    });

    await fastify.listen({ port: 0 });
    const addr = fastify.server.address() as { port: number };
    port = addr.port;
  });

  afterAll(async () => {
    clientA?.disconnect();
    clientB?.disconnect();
    io?.close();
    await fastify?.close();
  });

  it('Enables 2 players to create, join, start, and play cards in real-time', async () => {
    // 1. Connect Client A (Host)
    clientA = ClientIO(`http://localhost:${port}`);
    await new Promise<void>((resolve) => clientA.on('connect', resolve));

    // 2. Client A creates room
    let roomCode = '';
    let hostPlayerId = '';
    await new Promise<void>((resolve) => {
      clientA.emit('room:create', { username: 'ZorgHost', avatarId: 'alien_zorblax' }, (res: any) => {
        expect(res.success).toBe(true);
        roomCode = res.room.code;
        hostPlayerId = res.player.id;
        resolve();
      });
    });

    // 3. Connect Client B (Guest)
    clientB = ClientIO(`http://localhost:${port}`);
    await new Promise<void>((resolve) => clientB.on('connect', resolve));

    // 4. Client B joins room
    let guestPlayerId = '';
    await new Promise<void>((resolve) => {
      clientB.emit('room:join', { roomCode, username: 'VexGuest', avatarId: 'alien_vex' }, (res: any) => {
        expect(res.success).toBe(true);
        guestPlayerId = res.player.id;
        resolve();
      });
    });

    // 5. Client B toggles ready
    await new Promise<void>((resolve) => {
      clientB.emit('room:toggle_ready', (res: any) => {
        expect(res.success).toBe(true);
        resolve();
      });
    });

    // 6. Listen for private hands
    let handA: any[] = [];
    let handB: any[] = [];
    const receivedHandA = new Promise<void>((resolve) => {
      clientA.on('game:private_view', (view: any) => {
        handA = view.myHand;
        resolve();
      });
    });
    const receivedHandB = new Promise<void>((resolve) => {
      clientB.on('game:private_view', (view: any) => {
        handB = view.myHand;
        resolve();
      });
    });

    // 7. Host starts game
    await new Promise<void>((resolve) => {
      clientA.emit('game:start', (res: any) => {
        expect(res.success).toBe(true);
        resolve();
      });
    });

    await Promise.all([receivedHandA, receivedHandB]);

    expect(handA.length).toBe(5);
    expect(handB.length).toBe(5);

    // Verify hands are disjoint / private (Zero knowledge!)
    const handAIds = handA.map(c => c.id);
    const handBIds = handB.map(c => c.id);
    for (const id of handAIds) {
      expect(handBIds).not.toContain(id);
    }

    // 8. Host plays first card
    const cardToPlay = handA[0];
    const stateUpdated = new Promise<void>((resolve) => {
      clientB.on('game:public_state', (state: any) => {
        if (state.coreTotal > 0 || state.lastEvents.length > 1) {
          resolve();
        }
      });
    });

    await new Promise<void>((resolve) => {
      clientA.emit('game:play_card', { cardId: cardToPlay.id }, (res: any) => {
        expect(res.success).toBe(true);
        resolve();
      });
    });

    await stateUpdated;
  });
});
