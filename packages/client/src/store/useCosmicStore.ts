import { create } from 'zustand';
import {
  Player,
  RoomState,
  GameState,
  Card,
  AlienAvatarId,
  MatchEvent,
  PlayerPrivateView
} from '@cosmic/shared';
import { soundEngine } from '../audio/SynthAudioEngine';

export type AppView = 'MAIN_MENU' | 'LOBBY' | 'GAME';

interface CosmicState {
  connectionStatus: 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED';
  currentView: AppView;
  username: string;
  avatarId: AlienAvatarId;
  myPlayerId: string | null;
  sessionToken: string | null;
  room: RoomState | null;
  gameState: GameState | null;
  myHand: Card[];
  selectedCard: Card | null;
  targetPickerOpen: boolean;
  audioMuted: boolean;
  activeAnnouncement: string | null;

  // Actions
  setConnectionStatus: (status: 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED') => void;
  setCurrentView: (view: AppView) => void;
  setUserProfile: (username: string, avatarId: AlienAvatarId) => void;
  setSession: (playerId: string, token: string) => void;
  setRoom: (room: RoomState | null) => void;
  setPublicGameState: (gameState: GameState) => void;
  setPrivateView: (view: PlayerPrivateView) => void;
  selectCard: (card: Card | null) => void;
  setTargetPickerOpen: (open: boolean) => void;
  toggleAudio: () => void;
  setAnnouncement: (text: string | null) => void;
  resetGameSession: () => void;
}

export const useCosmicStore = create<CosmicState>((set, get) => ({
  connectionStatus: 'CONNECTING',
  currentView: 'MAIN_MENU',
  username: localStorage.getItem('cosmic_username') || `Alien_${Math.floor(Math.random() * 900 + 100)}`,
  avatarId: (localStorage.getItem('cosmic_avatar') as AlienAvatarId) || 'alien_zorblax',
  myPlayerId: null,
  sessionToken: localStorage.getItem('cosmic_token') || null,
  room: null,
  gameState: null,
  myHand: [],
  selectedCard: null,
  targetPickerOpen: false,
  audioMuted: false,
  activeAnnouncement: null,

  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setCurrentView: (view) => set({ currentView: view }),
  setUserProfile: (username, avatarId) => {
    localStorage.setItem('cosmic_username', username);
    localStorage.setItem('cosmic_avatar', avatarId);
    set({ username, avatarId });
  },
  setSession: (playerId, token) => {
    localStorage.setItem('cosmic_token', token);
    set({ myPlayerId: playerId, sessionToken: token });
  },
  setRoom: (room) => {
    set({ room });
    if (room?.status === 'PLAYING' && get().currentView !== 'GAME') {
      set({ currentView: 'GAME' });
    } else if (room?.status === 'LOBBY' && get().currentView !== 'LOBBY') {
      set({ currentView: 'LOBBY' });
    }
  },
  setPublicGameState: (gameState) => {
    const prevOverload = get().gameState?.coreTotal || 0;
    const isOverloadRise = gameState.coreTotal > prevOverload;
    const ratio = gameState.coreTotal / gameState.overloadLimit;

    if (isOverloadRise && ratio > 0.8) {
      soundEngine.playOverloadWarning();
    }

    // Check recent events for audio triggers
    const latestEvent = gameState.lastEvents[gameState.lastEvents.length - 1];
    if (latestEvent) {
      if (latestEvent.type === 'OVERLOAD_TRIGGERED' || latestEvent.type === 'PLAYER_ELIMINATED') {
        soundEngine.playOverloadExplosion();
      } else if (latestEvent.type === 'MATCH_WON') {
        soundEngine.playVictory();
      } else if (latestEvent.type === 'SHIELD_ABSORBED') {
        soundEngine.playShield();
      }
    }

    set({ gameState });
  },
  setPrivateView: (view) => {
    get().setPublicGameState(view.gameState);
    set({ myHand: view.myHand, myPlayerId: view.myPlayerId });
  },
  selectCard: (card) => {
    if (card) soundEngine.playCardHover();
    set({ selectedCard: card });
  },
  setTargetPickerOpen: (open) => set({ targetPickerOpen: open }),
  toggleAudio: () => {
    const muted = soundEngine.toggleMuted();
    set({ audioMuted: muted });
  },
  setAnnouncement: (text) => set({ activeAnnouncement: text }),
  resetGameSession: () => {
    localStorage.removeItem('cosmic_token');
    set({
      currentView: 'MAIN_MENU',
      room: null,
      gameState: null,
      myHand: [],
      selectedCard: null,
      myPlayerId: null,
      sessionToken: null
    });
  }
}));
