import { z } from 'zod';

export const AlienAvatarSchema = z.enum([
  'alien_zorblax',
  'alien_vex',
  'alien_blobbo',
  'alien_nebula'
]);

export const AIDifficultySchema = z.enum(['EASY', 'NORMAL', 'HARD']);

// Player profile / join schema
export const CreateRoomSchema = z.object({
  username: z.string().trim().min(2).max(24),
  avatarId: AlienAvatarSchema
});

export const JoinRoomSchema = z.object({
  roomCode: z.string().trim().min(4).max(10),
  username: z.string().trim().min(2).max(24),
  avatarId: AlienAvatarSchema,
  sessionToken: z.string().optional()
});

export const PlayCardSchema = z.object({
  cardId: z.string().min(1),
  targetPlayerId: z.string().optional()
});

export const AddAISchema = z.object({
  difficulty: AIDifficultySchema.default('NORMAL')
});

export const KickPlayerSchema = z.object({
  targetPlayerId: z.string().min(1)
});

export const ReconnectSchema = z.object({
  roomCode: z.string().min(4),
  sessionToken: z.string().min(10)
});
