import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import {
  CreateRoomSchema,
  JoinRoomSchema,
  PlayCardSchema,
  AddAISchema,
  KickPlayerSchema,
  ReconnectSchema
} from '@cosmic/shared';
import { RoomManager } from './rooms/RoomManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '4000', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function bootstrap() {
  const fastify = Fastify({
    logger: true
  });

  await fastify.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
  });

  // Client static build support
  const possiblePaths = [
    path.resolve(__dirname, '../../client/dist'),
    path.resolve(__dirname, '../../../packages/client/dist'),
    path.resolve(process.cwd(), 'packages/client/dist'),
    path.resolve(process.cwd(), '../client/dist')
  ];
  const clientDist = possiblePaths.find(p => fs.existsSync(p));

  if (clientDist) {
    fastify.log.info(`Serving static client from: ${clientDist}`);
    await fastify.register(fastifyStatic, {
      root: clientDist,
      prefix: '/'
    });

    fastify.setNotFoundHandler((_request, reply) => {
      reply.sendFile('index.html', clientDist);
    });
  }

  const roomManager = new RoomManager();

  // Socket.IO Server attached to Fastify server
  const io = new SocketIOServer(fastify.server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    },
    pingInterval: 10000,
    pingTimeout: 5000
  });

  // Broadcast helpers with Zero-Knowledge Hand distribution
  const broadcastGameState = (roomCode: string) => {
    const engine = roomManager.getMatchEngine(roomCode);
    const room = roomManager.getRoomByCode(roomCode);
    if (!engine || !room) return;

    const publicState = engine.getPublicGameState();

    // 1. Broadcast sanitized public state to room channel
    io.to(roomCode).emit('game:public_state', publicState);

    // 2. Dispatch individualized private hand to each connected player
    for (const player of room.players) {
      if (!player.isAI) {
        const privateView = engine.getPlayerPrivateView(player.id);
        const session = Array.from(io.sockets.sockets.values()).find(
          s => roomManager.getSessionBySocketId(s.id)?.playerId === player.id
        );
        if (session) {
          session.emit('game:private_view', privateView);
        }
      }
    }
  };

  roomManager.onBroadcastRoomState = (roomCode, state) => {
    io.to(roomCode).emit('room:updated', state);
  };

  roomManager.onBroadcastGameState = (roomCode) => {
    broadcastGameState(roomCode);
  };

  // REST endpoints
  fastify.get('/health', async () => {
    return { status: 'healthy', uptime: process.uptime(), timestamp: Date.now() };
  });

  fastify.get('/api/room/:code', async (request, reply) => {
    const { code } = request.params as { code: string };
    const room = roomManager.getRoomByCode(code);
    if (!room) {
      return reply.status(404).send({ error: 'Room not found' });
    }
    return {
      code: room.code,
      status: room.status,
      playerCount: room.players.length,
      maxPlayers: room.settings.maxPlayers
    };
  });

  // Socket.IO Event Handlers
  io.on('connection', (socket) => {
    fastify.log.info(`Socket connected: ${socket.id}`);

    // Create Room
    socket.on('room:create', (payload, callback) => {
      try {
        const parsed = CreateRoomSchema.safeParse(payload);
        if (!parsed.success) {
          return callback?.({ success: false, error: parsed.error.issues[0]?.message || 'Invalid parameters' });
        }

        const { room, player, sessionToken } = roomManager.createRoom(
          parsed.data.username,
          parsed.data.avatarId,
          socket.id
        );

        socket.join(room.code);
        callback?.({ success: true, room, player, sessionToken });
        fastify.log.info(`Room created: ${room.code} by ${player.username}`);
      } catch (err: any) {
        callback?.({ success: false, error: err.message });
      }
    });

    // Join Room
    socket.on('room:join', (payload, callback) => {
      try {
        const parsed = JoinRoomSchema.safeParse(payload);
        if (!parsed.success) {
          return callback?.({ success: false, error: parsed.error.issues[0]?.message || 'Invalid parameters' });
        }

        const res = roomManager.joinRoom(
          parsed.data.roomCode,
          parsed.data.username,
          parsed.data.avatarId,
          socket.id
        );

        if (!res.success || !res.room || !res.player) {
          return callback?.({ success: false, error: res.error });
        }

        socket.join(res.room.code);
        callback?.({
          success: true,
          room: res.room,
          player: res.player,
          sessionToken: res.sessionToken
        });

        // Notify room
        socket.to(res.room.code).emit('room:updated', res.room);
        fastify.log.info(`Player ${res.player.username} joined room ${res.room.code}`);
      } catch (err: any) {
        callback?.({ success: false, error: err.message });
      }
    });

    // Toggle Ready
    socket.on('room:toggle_ready', (callback) => {
      const room = roomManager.toggleReady(socket.id);
      if (room) {
        io.to(room.code).emit('room:updated', room);
        callback?.({ success: true });
      } else {
        callback?.({ success: false, error: 'Could not toggle ready status' });
      }
    });

    // Add AI Player
    socket.on('room:add_ai', (payload, callback) => {
      const session = roomManager.getSessionBySocketId(socket.id);
      if (!session) return callback?.({ success: false, error: 'Session not found' });

      const parsed = AddAISchema.safeParse(payload || {});
      const res = roomManager.addAIPlayer(session.roomCode, parsed.success ? parsed.data.difficulty : 'NORMAL');
      if (res.success) {
        const room = roomManager.getRoomByCode(session.roomCode);
        if (room) {
          io.to(room.code).emit('room:updated', room);
        }
        callback?.({ success: true, aiPlayer: res.aiPlayer });
      } else {
        callback?.({ success: false, error: res.error });
      }
    });

    // Kick Player
    socket.on('room:kick_player', (payload, callback) => {
      const session = roomManager.getSessionBySocketId(socket.id);
      if (!session) return callback?.({ success: false, error: 'Session not found' });

      const parsed = KickPlayerSchema.safeParse(payload);
      if (!parsed.success) return callback?.({ success: false, error: 'Invalid kick payload' });

      const room = roomManager.getRoomByCode(session.roomCode);
      if (!room || room.hostId !== session.playerId) {
        return callback?.({ success: false, error: 'Only the host can kick players' });
      }

      roomManager.removePlayer(session.roomCode, parsed.data.targetPlayerId);
      io.to(room.code).emit('room:updated', room);
      callback?.({ success: true });
    });

    // Start Match
    socket.on('game:start', (callback) => {
      const session = roomManager.getSessionBySocketId(socket.id);
      if (!session) return callback?.({ success: false, error: 'Session not found' });

      const res = roomManager.startMatch(socket.id);
      if (res.success) {
        const room = roomManager.getRoomByCode(session.roomCode);
        if (room) {
          io.to(room.code).emit('room:updated', room);
        }
        broadcastGameState(session.roomCode);
        callback?.({ success: true });
      } else {
        callback?.({ success: false, error: res.error });
      }
    });

    // Play Card
    socket.on('game:play_card', (payload, callback) => {
      const session = roomManager.getSessionBySocketId(socket.id);
      if (!session) return callback?.({ success: false, error: 'Session not found' });

      const parsed = PlayCardSchema.safeParse(payload);
      if (!parsed.success) {
        return callback?.({ success: false, error: parsed.error.issues[0]?.message || 'Invalid card play data' });
      }

      const res = roomManager.playCard(socket.id, parsed.data.cardId, parsed.data.targetPlayerId);

      if (res.success) {
        broadcastGameState(session.roomCode);
        callback?.({ success: true, events: res.events });
      } else {
        callback?.({ success: false, error: res.error });
      }
    });

    // Rematch
    socket.on('game:rematch', (callback) => {
      const res = roomManager.rematch(socket.id);
      if (res.success && res.room) {
        io.to(res.room.code).emit('room:updated', res.room);
        callback?.({ success: true });
      } else {
        callback?.({ success: false, error: 'Cannot initiate rematch' });
      }
    });

    // Reconnect
    socket.on('room:reconnect', (payload, callback) => {
      const parsed = ReconnectSchema.safeParse(payload);
      if (!parsed.success) return callback?.({ success: false, error: 'Invalid reconnect payload' });

      const res = roomManager.handleReconnect(parsed.data.sessionToken, socket.id);
      if (res.success && res.room) {
        socket.join(res.room.code);
        callback?.({ success: true, room: res.room, privateView: res.privateView });
        io.to(res.room.code).emit('room:updated', res.room);
        if (res.privateView) {
          broadcastGameState(res.room.code);
        }
      } else {
        callback?.({ success: false, error: 'Session expired or not found' });
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      fastify.log.info(`Socket disconnected: ${socket.id}`);
      roomManager.handleDisconnect(socket.id);
    });
  });

  try {
    await fastify.listen({ port: PORT, host: HOST });
    console.log(`🚀 Cosmic Chaos Game Server listening on http://${HOST}:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

bootstrap();
