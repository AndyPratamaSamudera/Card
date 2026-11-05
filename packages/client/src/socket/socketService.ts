import { io, Socket } from 'socket.io-client';
import {
  AlienAvatarId,
  AIDifficulty,
  RoomState,
  GameState,
  PlayerPrivateView,
  Player
} from '@cosmic/shared';
import { useCosmicStore } from '../store/useCosmicStore';
import { soundEngine } from '../audio/SynthAudioEngine';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || (window.location.port === '3000' ? 'http://localhost:4000' : window.location.origin);

class SocketService {
  private socket: Socket | null = null;

  public init(): void {
    if (this.socket) return;

    this.socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    const store = useCosmicStore.getState();

    this.socket.on('connect', () => {
      console.log('Connected to Cosmic Chaos server, socket id:', this.socket?.id);
      useCosmicStore.getState().setConnectionStatus('CONNECTED');

      // Attempt reconnection if session token exists
      const sessionToken = useCosmicStore.getState().sessionToken;
      const roomCode = useCosmicStore.getState().room?.code;
      if (sessionToken && roomCode) {
        this.reconnect(roomCode, sessionToken);
      }
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      useCosmicStore.getState().setConnectionStatus('DISCONNECTED');
    });

    this.socket.on('room:updated', (room: RoomState) => {
      useCosmicStore.getState().setRoom(room);
    });

    this.socket.on('game:public_state', (gameState: GameState) => {
      useCosmicStore.getState().setPublicGameState(gameState);
    });

    this.socket.on('game:private_view', (privateView: PlayerPrivateView) => {
      useCosmicStore.getState().setPrivateView(privateView);
    });
  }

  public createRoom(
    username: string,
    avatarId: AlienAvatarId
  ): Promise<{ success: boolean; room?: RoomState; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) return resolve({ success: false, error: 'Socket not connected' });
      this.socket.emit('room:create', { username, avatarId }, (res: any) => {
        if (res.success) {
          useCosmicStore.getState().setUserProfile(username, avatarId);
          useCosmicStore.getState().setSession(res.player.id, res.sessionToken);
          useCosmicStore.getState().setRoom(res.room);
          useCosmicStore.getState().setCurrentView('LOBBY');
          soundEngine.playClick();
        }
        resolve(res);
      });
    });
  }

  public joinRoom(
    roomCode: string,
    username: string,
    avatarId: AlienAvatarId
  ): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) return resolve({ success: false, error: 'Socket not connected' });
      this.socket.emit('room:join', { roomCode, username, avatarId }, (res: any) => {
        if (res.success) {
          useCosmicStore.getState().setUserProfile(username, avatarId);
          useCosmicStore.getState().setSession(res.player.id, res.sessionToken);
          useCosmicStore.getState().setRoom(res.room);
          useCosmicStore.getState().setCurrentView('LOBBY');
          soundEngine.playClick();
        }
        resolve(res);
      });
    });
  }

  public toggleReady(): Promise<{ success: boolean }> {
    return new Promise((resolve) => {
      if (!this.socket) return resolve({ success: false });
      this.socket.emit('room:toggle_ready', (res: any) => {
        soundEngine.playClick();
        resolve(res);
      });
    });
  }

  public addAI(difficulty: AIDifficulty = 'NORMAL'): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) return resolve({ success: false, error: 'Socket not connected' });
      this.socket.emit('room:add_ai', { difficulty }, (res: any) => {
        soundEngine.playClick();
        resolve(res);
      });
    });
  }

  public kickPlayer(targetPlayerId: string): Promise<{ success: boolean }> {
    return new Promise((resolve) => {
      if (!this.socket) return resolve({ success: false });
      this.socket.emit('room:kick_player', { targetPlayerId }, (res: any) => {
        resolve(res);
      });
    });
  }

  public startGame(): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) return resolve({ success: false });
      this.socket.emit('game:start', (res: any) => {
        if (res.success) {
          soundEngine.playCardPlay();
        }
        resolve(res);
      });
    });
  }

  public playCard(cardId: string, targetPlayerId?: string): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) return resolve({ success: false });
      this.socket.emit('game:play_card', { cardId, targetPlayerId }, (res: any) => {
        if (res.success) {
          soundEngine.playCardPlay();
        }
        resolve(res);
      });
    });
  }

  public rematch(): Promise<{ success: boolean }> {
    return new Promise((resolve) => {
      if (!this.socket) return resolve({ success: false });
      this.socket.emit('game:rematch', (res: any) => {
        soundEngine.playClick();
        resolve(res);
      });
    });
  }

  public reconnect(roomCode: string, sessionToken: string): void {
    if (!this.socket) return;
    this.socket.emit('room:reconnect', { roomCode, sessionToken }, (res: any) => {
      if (res.success) {
        useCosmicStore.getState().setRoom(res.room);
        if (res.privateView) {
          useCosmicStore.getState().setPrivateView(res.privateView);
          useCosmicStore.getState().setCurrentView('GAME');
        }
      }
    });
  }
}

export const socketService = new SocketService();
