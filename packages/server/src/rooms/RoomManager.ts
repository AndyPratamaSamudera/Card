import {
  Player,
  RoomState,
  RoomSettings,
  AlienAvatarId,
  AIDifficulty,
  GAME_BALANCE,
  PlayerPrivateView
} from '@cosmic/shared';
import { MatchEngine, PlayCardResult } from '../engine/MatchEngine.js';

export interface RoomSession {
  socketId: string;
  sessionToken: string;
  playerId: string;
  roomCode: string;
}

export class RoomManager {
  private rooms: Map<string, RoomState> = new Map();
  private matchEngines: Map<string, MatchEngine> = new Map();
  private sessions: Map<string, RoomSession> = new Map(); // socketId -> Session
  private playerTokens: Map<string, RoomSession> = new Map(); // sessionToken -> Session
  private disconnectTimers: Map<string, NodeJS.Timeout> = new Map();
  private aiTurnTimers: Map<string, NodeJS.Timeout> = new Map();

  // Callbacks for broadcasting to sockets
  public onBroadcastRoomState?: (roomCode: string, state: RoomState) => void;
  public onBroadcastGameState?: (roomCode: string, engine: MatchEngine) => void;
  public onEmitToPlayer?: (playerId: string, event: string, data: unknown) => void;

  public createRoom(
    hostUsername: string,
    hostAvatarId: AlienAvatarId,
    socketId: string
  ): { room: RoomState; player: Player; sessionToken: string } {
    const roomCode = this.generateRoomCode();
    const playerId = `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const sessionToken = `tok_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;

    const hostPlayer: Player = {
      id: playerId,
      username: hostUsername,
      avatarId: hostAvatarId,
      seatIndex: 0,
      isReady: true,
      isHost: true,
      isAI: false,
      isConnected: true,
      overloadLevel: 0,
      hasShield: false,
      timeBombTurnsRemaining: null,
      isGlitchScrambled: false,
      isEliminated: false,
      cardsInHandCount: 0
    };

    const settings: RoomSettings = {
      maxPlayers: GAME_BALANCE.MAX_PLAYERS,
      turnDurationSeconds: GAME_BALANCE.TURN_DURATION_SECONDS,
      baseOverloadLimit: 30,
      maxPenalties: GAME_BALANCE.MAX_PENALTIES_BEFORE_ELIMINATION
    };

    const room: RoomState = {
      code: roomCode,
      hostId: playerId,
      status: 'LOBBY',
      players: [hostPlayer],
      settings,
      createdAt: Date.now()
    };

    this.rooms.set(roomCode, room);

    const session: RoomSession = {
      socketId,
      sessionToken,
      playerId,
      roomCode
    };
    this.sessions.set(socketId, session);
    this.playerTokens.set(sessionToken, session);

    return { room, player: hostPlayer, sessionToken };
  }

  public joinRoom(
    roomCode: string,
    username: string,
    avatarId: AlienAvatarId,
    socketId: string
  ): { success: boolean; error?: string; room?: RoomState; player?: Player; sessionToken?: string } {
    const normalizedCode = roomCode.trim().toUpperCase();
    const room = this.rooms.get(normalizedCode);

    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (room.status !== 'LOBBY') {
      return { success: false, error: 'Match is already in progress' };
    }

    if (room.players.length >= room.settings.maxPlayers) {
      return { success: false, error: 'Room is full' };
    }

    const playerId = `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const sessionToken = `tok_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;

    const player: Player = {
      id: playerId,
      username,
      avatarId,
      seatIndex: room.players.length,
      isReady: false,
      isHost: false,
      isAI: false,
      isConnected: true,
      overloadLevel: 0,
      hasShield: false,
      timeBombTurnsRemaining: null,
      isGlitchScrambled: false,
      isEliminated: false,
      cardsInHandCount: 0
    };

    room.players.push(player);

    const session: RoomSession = {
      socketId,
      sessionToken,
      playerId,
      roomCode: normalizedCode
    };
    this.sessions.set(socketId, session);
    this.playerTokens.set(sessionToken, session);

    return { success: true, room, player, sessionToken };
  }

  public addAIPlayer(
    roomCode: string,
    difficulty: AIDifficulty = 'NORMAL'
  ): { success: boolean; error?: string; aiPlayer?: Player } {
    const room = this.rooms.get(roomCode);
    if (!room) return { success: false, error: 'Room not found' };
    if (room.status !== 'LOBBY') return { success: false, error: 'Match already started' };
    if (room.players.length >= room.settings.maxPlayers) return { success: false, error: 'Room is full' };

    const aiIndex = room.players.filter(p => p.isAI).length + 1;
    const aiAvatars: AlienAvatarId[] = ['alien_zorblax', 'alien_vex', 'alien_blobbo', 'alien_nebula'];
    const aiAvatar = aiAvatars[aiIndex % aiAvatars.length];
    const aiNames = ['Gloop-9', 'Cyber-Zorg', 'Cosmo-Blip', 'Nebula-Bot', 'Hyper-X', 'Void-Crawler'];
    const aiName = aiNames[(aiIndex - 1) % aiNames.length];

    const aiPlayer: Player = {
      id: `ai_${Date.now()}_${aiIndex}`,
      username: `${aiName} (${difficulty})`,
      avatarId: aiAvatar,
      seatIndex: room.players.length,
      isReady: true,
      isHost: false,
      isAI: true,
      aiDifficulty: difficulty,
      isConnected: true,
      overloadLevel: 0,
      hasShield: false,
      timeBombTurnsRemaining: null,
      isGlitchScrambled: false,
      isEliminated: false,
      cardsInHandCount: 0
    };

    room.players.push(aiPlayer);
    return { success: true, aiPlayer };
  }

  public removePlayer(roomCode: string, playerId: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room) return false;

    const idx = room.players.findIndex(p => p.id === playerId);
    if (idx === -1) return false;

    const removed = room.players.splice(idx, 1)[0];

    // Re-index seats
    room.players.forEach((p, i) => {
      p.seatIndex = i;
    });

    // If host was removed, elect new host if players remain
    if (removed.isHost && room.players.length > 0) {
      const nonAI = room.players.find(p => !p.isAI) || room.players[0];
      nonAI.isHost = true;
      room.hostId = nonAI.id;
    }

    if (room.players.length === 0) {
      this.rooms.delete(roomCode);
      this.matchEngines.delete(roomCode);
    }

    return true;
  }

  public toggleReady(socketId: string): RoomState | null {
    const session = this.sessions.get(socketId);
    if (!session) return null;

    const room = this.rooms.get(session.roomCode);
    if (!room || room.status !== 'LOBBY') return null;

    const player = room.players.find(p => p.id === session.playerId);
    if (player && !player.isHost) {
      player.isReady = !player.isReady;
    }
    return room;
  }

  public startMatch(socketId: string): { success: boolean; error?: string; engine?: MatchEngine } {
    const session = this.sessions.get(socketId);
    if (!session) return { success: false, error: 'Session not found' };

    const room = this.rooms.get(session.roomCode);
    if (!room) return { success: false, error: 'Room not found' };

    if (room.hostId !== session.playerId) {
      return { success: false, error: 'Only the host can start the game' };
    }

    if (room.players.length < GAME_BALANCE.MIN_PLAYERS) {
      return { success: false, error: `At least ${GAME_BALANCE.MIN_PLAYERS} players are required to start` };
    }

    const unready = room.players.filter(p => !p.isHost && !p.isReady);
    if (unready.length > 0) {
      return { success: false, error: 'Not all players are ready' };
    }

    room.status = 'PLAYING';
    const matchEngine = new MatchEngine(`m_${room.code}_${Date.now()}`, room.players);
    this.matchEngines.set(room.code, matchEngine);

    // Check if initial turn is AI
    this.triggerAITurnIfNeeded(room.code);

    return { success: true, engine: matchEngine };
  }

  public playCard(socketId: string, cardId: string, targetPlayerId?: string): PlayCardResult {
    const session = this.sessions.get(socketId);
    if (!session) {
      return { success: false, error: 'Not in a session', events: [], isMatchOver: false, winnerPlayerId: null };
    }

    const engine = this.matchEngines.get(session.roomCode);
    if (!engine) {
      return { success: false, error: 'No active match in room', events: [], isMatchOver: false, winnerPlayerId: null };
    }

    const result = engine.playCard(session.playerId, cardId, targetPlayerId);

    if (result.success) {
      if (result.isMatchOver) {
        const room = this.rooms.get(session.roomCode);
        if (room) room.status = 'MATCH_OVER';
      } else {
        // Trigger next AI turn if applicable
        this.triggerAITurnIfNeeded(session.roomCode);
      }
    }

    return result;
  }

  public triggerAITurnIfNeeded(roomCode: string): void {
    const engine = this.matchEngines.get(roomCode);
    if (!engine) return;

    const publicState = engine.getPublicGameState();
    const activePlayer = publicState.players.find(p => p.id === publicState.turn.activePlayerId);

    if (!activePlayer || !activePlayer.isAI || activePlayer.isEliminated || publicState.winnerPlayerId) {
      return;
    }

    // Clear existing timer if any
    const existingTimer = this.aiTurnTimers.get(roomCode);
    if (existingTimer) clearTimeout(existingTimer);

    // Natural bot think delay: 1000ms - 2000ms
    const thinkDelay = 1200 + Math.floor(Math.random() * 800);

    const timer = setTimeout(() => {
      const currentEngine = this.matchEngines.get(roomCode);
      if (!currentEngine) return;

      const decision = currentEngine.getAIPlayerDecision();
      if (decision) {
        const res = currentEngine.playCard(activePlayer.id, decision.cardId, decision.targetPlayerId);

        // Broadcast game state update
        if (this.onBroadcastGameState) {
          this.onBroadcastGameState(roomCode, currentEngine);
        }

        if (res.isMatchOver) {
          const room = this.rooms.get(roomCode);
          if (room) room.status = 'MATCH_OVER';
        } else {
          // Check if next turn is also AI
          this.triggerAITurnIfNeeded(roomCode);
        }
      }
    }, thinkDelay);

    this.aiTurnTimers.set(roomCode, timer);
  }

  public handleDisconnect(socketId: string): void {
    const session = this.sessions.get(socketId);
    if (!session) return;

    const room = this.rooms.get(session.roomCode);
    if (!room) return;

    const player = room.players.find(p => p.id === session.playerId);
    if (!player) return;

    player.isConnected = false;

    // Broadcast room update
    if (this.onBroadcastRoomState) {
      this.onBroadcastRoomState(room.code, room);
    }

    // Set 30s grace timer for reconnect
    const timer = setTimeout(() => {
      // If still disconnected after grace period, remove player or replace with AI
      if (!player.isConnected) {
        if (room.status === 'LOBBY') {
          this.removePlayer(room.code, player.id);
          if (this.onBroadcastRoomState) {
            this.onBroadcastRoomState(room.code, room);
          }
        } else {
          // In active match, convert into AI bot so match is never blocked!
          player.isAI = true;
          player.username = `${player.username} (Bot)`;
          this.triggerAITurnIfNeeded(room.code);
        }
      }
    }, GAME_BALANCE.DISCONNECT_GRACE_SECONDS * 1000);

    this.disconnectTimers.set(session.playerId, timer);
  }

  public handleReconnect(
    sessionToken: string,
    newSocketId: string
  ): { success: boolean; room?: RoomState; privateView?: PlayerPrivateView } {
    const session = this.playerTokens.get(sessionToken);
    if (!session) return { success: false };

    const room = this.rooms.get(session.roomCode);
    if (!room) return { success: false };

    const player = room.players.find(p => p.id === session.playerId);
    if (!player) return { success: false };

    // Clear grace timer
    const timer = this.disconnectTimers.get(player.id);
    if (timer) {
      clearTimeout(timer);
      this.disconnectTimers.delete(player.id);
    }

    // Re-bind socket
    this.sessions.delete(session.socketId);
    session.socketId = newSocketId;
    this.sessions.set(newSocketId, session);
    player.isConnected = true;

    const engine = this.matchEngines.get(room.code);
    const privateView = engine ? engine.getPlayerPrivateView(player.id) : undefined;

    return { success: true, room, privateView };
  }

  public rematch(socketId: string): { success: boolean; room?: RoomState } {
    const session = this.sessions.get(socketId);
    if (!session) return { success: false };

    const room = this.rooms.get(session.roomCode);
    if (!room) return { success: false };

    if (room.hostId !== session.playerId) return { success: false };

    room.status = 'LOBBY';
    this.matchEngines.delete(room.code);

    // Reset player readiness
    for (const p of room.players) {
      p.isReady = p.isHost || p.isAI;
      p.isEliminated = false;
      p.overloadLevel = 0;
      p.cardsInHandCount = 0;
    }

    return { success: true, room };
  }

  public getRoomByCode(code: string): RoomState | undefined {
    return this.rooms.get(code.trim().toUpperCase());
  }

  public getSessionBySocketId(socketId: string): RoomSession | undefined {
    return this.sessions.get(socketId);
  }

  public getMatchEngine(roomCode: string): MatchEngine | undefined {
    return this.matchEngines.get(roomCode);
  }

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'CC-';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}
