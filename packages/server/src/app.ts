import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { Server as SocketIOServer, type Socket } from 'socket.io';
import { C2S, type Ack, type C2SEvent, type C2SPayload } from '@overload21/shared';
import { RoomManager, type ManagerOptions } from './rooms/RoomManager.js';

export interface AppOptions extends ManagerOptions {
  logger?: boolean;
  serveClient?: boolean;
}

export interface App {
  fastify: FastifyInstance;
  io: SocketIOServer;
  rooms: RoomManager;
  close(): Promise<void>;
}

const here = path.dirname(fileURLToPath(import.meta.url));

export async function buildApp(opts: AppOptions = {}): Promise<App> {
  const fastify = Fastify({ logger: opts.logger ?? false });
  await fastify.register(cors, { origin: true });

  fastify.get('/health', async () => ({ ok: true, rooms: rooms.rooms.size }));

  if (opts.serveClient !== false) {
    const clientDist = [path.resolve(here, '../../client/dist'), path.resolve(process.cwd(), 'packages/client/dist')].find(
      (p) => fs.existsSync(path.join(p, 'index.html')),
    );
    if (clientDist) {
      await fastify.register(fastifyStatic, { root: clientDist });
      fastify.setNotFoundHandler((_req, reply) => reply.sendFile('index.html'));
    }
  }

  const io = new SocketIOServer(fastify.server, { cors: { origin: true } });

  const rooms = new RoomManager(
    { emit: (socketId: string, event: string, payload: unknown) => void io.to(socketId).emit(event, payload) },
    opts,
  );

  io.on('connection', (socket) => {
    const on = <E extends C2SEvent>(event: E, handler: (payload: C2SPayload<E>) => Ack<object>) =>
      handle(socket, event, handler, fastify);

    on('room:create', (p) => rooms.create(socket.id, p.name, p.avatar));
    on('room:join', (p) => rooms.join(socket.id, p.code, p.name, p.avatar));
    on('room:reconnect', (p) => rooms.reconnect(socket.id, p.code, p.token));
    on('room:leave', () => rooms.leave(socket.id));
    on('room:ready', (p) => rooms.setReady(socket.id, p.ready));
    on('room:settings', (p) => rooms.updateSettings(socket.id, p));
    on('room:add_bot', () => rooms.addBot(socket.id));
    on('room:kick', (p) => rooms.kick(socket.id, p.playerId));
    on('game:start', () => rooms.start(socket.id));
    on('game:play', (p) => rooms.play(socket.id, p.cardId));
    on('game:rematch', () => rooms.rematch(socket.id));

    socket.on('disconnect', () => rooms.disconnect(socket.id));
  });

  return {
    fastify,
    io,
    rooms,
    async close() {
      rooms.shutdown();
      io.close();
      await fastify.close();
    },
  };
}

/**
 * Validate the payload, call the handler and always answer through the ack
 * (if the client sent one). Bad input or a thrown error never crashes the server.
 */
function handle<E extends C2SEvent>(
  socket: Socket,
  event: E,
  handler: (payload: C2SPayload<E>) => Ack<object>,
  fastify: FastifyInstance,
) {
  socket.on(event as string, (...args: unknown[]) => {
    const last = args[args.length - 1];
    const ack = typeof last === 'function' ? (last as (r: Ack<object>) => void) : () => {};
    const raw = typeof args[0] === 'function' ? undefined : args[0];
    const parsed = C2S[event].safeParse(raw ?? {});
    if (!parsed.success) {
      ack({ ok: false, error: parsed.error.issues[0]?.message ?? 'Data tidak valid.' });
      return;
    }
    try {
      ack(handler(parsed.data as C2SPayload<E>));
    } catch (err) {
      fastify.log.error({ err, event }, 'handler failed');
      ack({ ok: false, error: 'Terjadi kesalahan di server.' });
    }
  });
}
