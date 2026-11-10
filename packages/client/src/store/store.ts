import { create } from 'zustand';
import { DEFAULT_SETTINGS, type MatchSettings, type MatchView, type RoomView } from '@overload21/shared';
import { audio } from '../audio/audio';

export type Screen = 'title' | 'menu' | 'setup' | 'online' | 'lobby' | 'table';
export type Mode = 'bot' | 'hotseat' | 'online';
export type Modal = 'howto' | 'settings' | null;

export interface Prefs {
  name: string;
  avatar: number;
  sfx: boolean;
  music: boolean;
  volume: number;
  crt: boolean;
}

export interface LocalSetup {
  mode: 'bot' | 'hotseat';
  humans: Array<{ name: string; avatar: number }>;
  bots: number;
  settings: MatchSettings;
}

export interface Toast {
  id: number;
  text: string;
  tone: 'info' | 'error' | 'good';
}

interface Store {
  screen: Screen;
  mode: Mode | null;
  modal: Modal;
  prefs: Prefs;
  view: MatchView | null;
  /** performance.now() when `view` arrived (for the turn timer) */
  viewAt: number;
  room: RoomView | null;
  connection: 'idle' | 'connecting' | 'online' | 'offline';
  toast: Toast | null;
  /** Hot-seat: id of the player who must take the device */
  cover: string | null;
  localSetup: LocalSetup | null;

  go(screen: Screen): void;
  setModal(m: Modal): void;
  setPrefs(p: Partial<Prefs>): void;
  showToast(text: string, tone?: Toast['tone']): void;
}

const PREFS_KEY = 'o21.prefs';
const SETUP_KEY = 'o21.setup';

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}

const defaultPrefs: Prefs = {
  name: '',
  avatar: Math.floor(Math.random() * 8),
  sfx: true,
  music: true,
  volume: 0.7,
  crt: true,
};

export const defaultSetup = (mode: 'bot' | 'hotseat', prefs: Prefs): LocalSetup => ({
  mode,
  humans:
    mode === 'bot'
      ? [{ name: prefs.name || 'PLAYER', avatar: prefs.avatar }]
      : [
          { name: prefs.name || 'P1', avatar: prefs.avatar },
          { name: 'P2', avatar: (prefs.avatar + 1) % 8 },
        ],
  bots: mode === 'bot' ? 3 : 0,
  settings: { ...DEFAULT_SETTINGS, turnSeconds: mode === 'hotseat' ? 0 : DEFAULT_SETTINGS.turnSeconds },
});

export const loadSetup = (mode: 'bot' | 'hotseat', prefs: Prefs): LocalSetup => {
  const all = load<Record<string, LocalSetup | undefined>>(SETUP_KEY, {});
  const s = all[mode];
  return s ? { ...defaultSetup(mode, prefs), ...s, settings: { ...DEFAULT_SETTINGS, ...s.settings } } : defaultSetup(mode, prefs);
};

export const saveSetup = (setup: LocalSetup) => {
  const all = load<Record<string, LocalSetup | undefined>>(SETUP_KEY, {});
  save(SETUP_KEY, { ...all, [setup.mode]: setup });
};

let toastSeq = 0;
let toastTimer: ReturnType<typeof setTimeout> | null = null;

export const useStore = create<Store>((set, get) => ({
  screen: 'title',
  mode: null,
  modal: null,
  prefs: load(PREFS_KEY, defaultPrefs),
  view: null,
  viewAt: 0,
  room: null,
  connection: 'idle',
  toast: null,
  cover: null,
  localSetup: null,

  go: (screen) => set({ screen }),
  setModal: (modal) => set({ modal }),
  setPrefs: (p) => {
    const prefs = { ...get().prefs, ...p };
    save(PREFS_KEY, prefs);
    audio.setPrefs({ sfx: prefs.sfx, music: prefs.music, volume: prefs.volume });
    set({ prefs });
  },
  showToast: (text, tone = 'info') => {
    if (toastTimer) clearTimeout(toastTimer);
    set({ toast: { id: ++toastSeq, text, tone } });
    toastTimer = setTimeout(() => set({ toast: null }), 3200);
  },
}));

// Apply saved audio prefs at startup.
{
  const p = useStore.getState().prefs;
  audio.setPrefs({ sfx: p.sfx, music: p.music, volume: p.volume });
}
