import { z } from 'zod';
import type { MatchSettings } from './types.js';

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;
export const TURN_SECONDS_OPTIONS = [0, 10, 15, 20, 30] as const;

export const DEFAULT_SETTINGS: MatchSettings = {
  overloadLimit: 21,
  surviveChance: 70,
  handSize: 5,
  turnSeconds: 15,
  botLevel: 'NORMAL',
  maxPlayers: 8,
};

export const SettingsSchema = z.object({
  overloadLimit: z.number().int().min(15).max(31),
  surviveChance: z.number().int().min(50).max(90),
  handSize: z.number().int().min(3).max(7),
  turnSeconds: z.number().int().refine((n) => (TURN_SECONDS_OPTIONS as readonly number[]).includes(n), 'Waktu giliran tidak valid'),
  botLevel: z.enum(['EASY', 'NORMAL', 'HARD']),
  maxPlayers: z.number().int().min(MIN_PLAYERS).max(MAX_PLAYERS),
});

export const SettingsPatchSchema = SettingsSchema.partial();

/** Merge a (validated) patch into settings. */
export function applySettingsPatch(base: MatchSettings, patch: Partial<MatchSettings>): MatchSettings {
  return SettingsSchema.parse({ ...base, ...patch });
}
