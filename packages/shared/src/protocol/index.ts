import { z } from 'zod';
import type { MatchSettings, MatchView } from '../engine/types.js';
import { SettingsPatchSchema } from '../engine/settings.js';

// ─── Room view ──────────────────────────────────────────────────────────────
export type RoomStatus = 'LOBBY' | 'PLAYING';

export interface RoomMember {
  id: string;
  name: string;
  avatar: number;
  isBot: boolean;
  ready: boolean;
  connected: boolean;
}

export interface RoomView {
  code: string;
  hostId: string;
  status: RoomStatus;
  settings: MatchSettings;
  members: RoomMember[];
  you: string;
}

// ─── Payload schemas ────────────────────────────────────────────────────────
export const NameSchema = z
  .string()
  .trim()
  .min(2, 'Nama minimal 2 karakter')
  .max(12, 'Nama maksimal 12 karakter')
  .regex(/^[\p{L}\p{N} _-]+$/u, 'Nama hanya boleh huruf, angka, spasi, _ dan -');

export const RoomCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{4}$/, 'Kode room harus 4 karakter');

export const AvatarSchema = z.number().int().min(0).max(7);

export const C2S = {
  'room:create': z.object({ name: NameSchema, avatar: AvatarSchema }),
  'room:join': z.object({ code: RoomCodeSchema, name: NameSchema, avatar: AvatarSchema }),
  'room:reconnect': z.object({ code: RoomCodeSchema, token: z.string().uuid() }),
  'room:leave': z.object({}).optional(),
  'room:ready': z.object({ ready: z.boolean() }),
  'room:settings': SettingsPatchSchema,
  'room:add_bot': z.object({}).optional(),
  'room:kick': z.object({ playerId: z.string().min(1).max(64) }),
  'game:start': z.object({}).optional(),
  'game:play': z.object({ cardId: z.string().min(1).max(32) }),
  'game:rematch': z.object({}).optional(),
} as const;

export type C2SEvent = keyof typeof C2S;
export type C2SPayload<E extends C2SEvent> = z.infer<(typeof C2S)[E]>;

export interface JoinedAck {
  code: string;
  playerId: string;
  token: string;
}

export type Ack<T = unknown> = ({ ok: true } & T) | { ok: false; error: string };

export interface S2CEvents {
  'room:state': (room: RoomView) => void;
  'game:view': (view: MatchView) => void;
  /** You were removed from the room (kicked or room closed) */
  'room:gone': (info: { reason: string }) => void;
}

export const DISCONNECT_GRACE_MS = 20_000;
