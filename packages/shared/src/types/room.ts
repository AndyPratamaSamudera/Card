import { Player } from './player.js';

export type RoomStatus = 'LOBBY' | 'PLAYING' | 'MATCH_OVER';

export interface RoomSettings {
  maxPlayers: number;
  turnDurationSeconds: number;
  baseOverloadLimit: number;
  maxPenalties: number; // usually 3
}

export interface RoomState {
  code: string;
  hostId: string;
  status: RoomStatus;
  players: Player[];
  settings: RoomSettings;
  createdAt: number;
}
