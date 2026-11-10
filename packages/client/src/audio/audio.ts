/**
 * Chiptune audio, synthesized with the Web Audio API (no asset files).
 * - sfx.*: short square/triangle/noise effects
 * - music: tiny step sequencer with two loops (menu / game)
 */

type Wave = OscillatorType;

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;

  sfxOn = true;
  musicOn = true;
  volume = 0.7;

  /** Must be called from a user gesture at least once (autoplay policy). */
  unlock() {
    if (!this.ctx) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.sfxBus = this.ctx.createGain();
      this.musicBus = this.ctx.createGain();
      this.sfxBus.connect(this.master);
      this.musicBus.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.applyLevels();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    music.resume();
  }

  setPrefs(p: { sfx: boolean; music: boolean; volume: number }) {
    this.sfxOn = p.sfx;
    this.musicOn = p.music;
    this.volume = p.volume;
    this.applyLevels();
    if (this.musicOn) music.resume();
    else music.pauseOutput();
  }

  private applyLevels() {
    if (!this.ctx || !this.master || !this.sfxBus || !this.musicBus) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.volume * 0.5, t, 0.02);
    this.sfxBus.gain.setTargetAtTime(this.sfxOn ? 1 : 0, t, 0.02);
    this.musicBus.gain.setTargetAtTime(this.musicOn ? 0.45 : 0, t, 0.05);
  }

  get context() {
    return this.ctx;
  }
  get musicOut() {
    return this.musicBus;
  }

  tone(freq: number, dur: number, opts: { wave?: Wave; vol?: number; at?: number; slideTo?: number; bus?: 'sfx' | 'music' } = {}) {
    const ctx = this.ctx;
    const bus = opts.bus === 'music' ? this.musicBus : this.sfxBus;
    if (!ctx || !bus) return;
    if (opts.bus !== 'music' && !this.sfxOn) return;
    const t = opts.at ?? ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = opts.wave ?? 'square';
    osc.frequency.setValueAtTime(freq, t);
    if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, t + dur);
    const v = opts.vol ?? 0.18;
    g.gain.setValueAtTime(v, t);
    g.gain.setValueAtTime(v, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(bus);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  noise(dur: number, opts: { vol?: number; at?: number; bus?: 'sfx' | 'music'; hp?: number } = {}) {
    const ctx = this.ctx;
    const bus = opts.bus === 'music' ? this.musicBus : this.sfxBus;
    if (!ctx || !bus) return;
    if (opts.bus !== 'music' && !this.sfxOn) return;
    if (!this.noiseBuf) {
      this.noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t = opts.at ?? ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = opts.hp ?? 1000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(opts.vol ?? 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(g).connect(bus);
    src.start(t);
    src.stop(t + dur + 0.02);
  }
}

export const audio = new AudioEngine();

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

export const sfx = {
  click() {
    audio.tone(880, 0.05, { vol: 0.1 });
  },
  hover() {
    audio.tone(1320, 0.025, { vol: 0.05 });
  },
  select() {
    audio.tone(660, 0.05, { vol: 0.12 });
    audio.tone(990, 0.06, { vol: 0.12, at: (audio.context?.currentTime ?? 0) + 0.05 });
  },
  error() {
    audio.tone(160, 0.18, { wave: 'square', vol: 0.15, slideTo: 90 });
  },
  playNumber(value: number) {
    const t = audio.context?.currentTime ?? 0;
    audio.noise(0.05, { vol: 0.12, hp: 3000 });
    audio.tone(midi(60 + value), 0.09, { vol: 0.14, at: t + 0.02 });
  },
  playSpecial() {
    const t = audio.context?.currentTime ?? 0;
    [72, 76, 79, 84].forEach((n, i) => audio.tone(midi(n), 0.07, { vol: 0.12, at: t + i * 0.05 }));
  },
  myTurn() {
    const t = audio.context?.currentTime ?? 0;
    audio.tone(midi(79), 0.07, { vol: 0.12, wave: 'triangle', at: t });
    audio.tone(midi(84), 0.12, { vol: 0.12, wave: 'triangle', at: t + 0.08 });
  },
  tick() {
    audio.tone(1760, 0.03, { vol: 0.06 });
  },
  warning() {
    const t = audio.context?.currentTime ?? 0;
    for (let i = 0; i < 3; i++) audio.tone(i % 2 ? 440 : 660, 0.1, { vol: 0.12, at: t + i * 0.12 });
  },
  /** Drum-roll + rising tone while the roll is spinning */
  suspense(seconds: number) {
    const ctx = audio.context;
    if (!ctx) return;
    const t = ctx.currentTime;
    const steps = Math.floor(seconds / 0.08);
    for (let i = 0; i < steps; i++) audio.noise(0.04, { vol: 0.08 + (i / steps) * 0.1, at: t + i * 0.08, hp: 1800 });
    audio.tone(110, seconds, { wave: 'triangle', vol: 0.12, slideTo: 440 });
  },
  survive() {
    const t = audio.context?.currentTime ?? 0;
    [72, 76, 79, 84, 88].forEach((n, i) => audio.tone(midi(n), 0.1, { vol: 0.13, at: t + i * 0.07 }));
  },
  explode() {
    audio.noise(0.7, { vol: 0.35, hp: 80 });
    audio.tone(220, 0.6, { vol: 0.2, slideTo: 30 });
  },
  win() {
    const t = audio.context?.currentTime ?? 0;
    const tune = [72, 72, 79, 79, 84, 0, 83, 84];
    tune.forEach((n, i) => n && audio.tone(midi(n), 0.14, { vol: 0.13, at: t + i * 0.12 }));
    [48, 55, 60].forEach((n, i) => audio.tone(midi(n), 0.4, { wave: 'triangle', vol: 0.15, at: t + i * 0.32 }));
  },
  lose() {
    const t = audio.context?.currentTime ?? 0;
    [67, 66, 65, 64].forEach((n, i) => audio.tone(midi(n), 0.25, { vol: 0.12, at: t + i * 0.25 }));
  },
};

// ─── Music ──────────────────────────────────────────────────────────────────
interface Track {
  bpm: number;
  /** 16th-note steps; 0 = rest. MIDI note numbers. */
  lead: number[];
  bass: number[];
  /** 1 = hat, 2 = kick */
  drums: number[];
}

const bar = (notes: number[]) => notes;
// Original loops written for this game.
const TRACKS: Record<'menu' | 'game', Track> = {
  menu: {
    bpm: 108,
    lead: [
      ...bar([69, 0, 72, 0, 76, 0, 72, 0, 69, 0, 72, 0, 76, 0, 79, 0]),
      ...bar([77, 0, 76, 0, 72, 0, 69, 0, 65, 0, 69, 0, 72, 0, 0, 0]),
      ...bar([67, 0, 71, 0, 74, 0, 71, 0, 67, 0, 71, 0, 74, 0, 79, 0]),
      ...bar([76, 0, 74, 0, 72, 0, 71, 0, 69, 0, 0, 0, 0, 0, 0, 0]),
    ],
    bass: [
      ...bar([45, 0, 0, 0, 45, 0, 0, 0, 45, 0, 0, 0, 45, 0, 0, 0]),
      ...bar([41, 0, 0, 0, 41, 0, 0, 0, 41, 0, 0, 0, 41, 0, 0, 0]),
      ...bar([43, 0, 0, 0, 43, 0, 0, 0, 43, 0, 0, 0, 43, 0, 0, 0]),
      ...bar([40, 0, 0, 0, 40, 0, 0, 0, 45, 0, 0, 0, 45, 0, 0, 0]),
    ],
    drums: Array.from({ length: 64 }, (_, i) => (i % 8 === 0 ? 2 : i % 4 === 2 ? 1 : 0)),
  },
  game: {
    bpm: 132,
    lead: [
      ...bar([81, 0, 76, 81, 0, 76, 79, 0, 81, 0, 84, 0, 83, 0, 79, 0]),
      ...bar([77, 0, 72, 77, 0, 72, 76, 0, 77, 0, 79, 0, 77, 0, 76, 0]),
      ...bar([79, 0, 74, 79, 0, 74, 77, 0, 79, 0, 83, 0, 81, 0, 79, 0]),
      ...bar([76, 0, 0, 79, 0, 0, 83, 0, 81, 0, 79, 0, 76, 0, 0, 0]),
    ],
    bass: [
      ...bar([45, 0, 57, 0, 45, 0, 57, 0, 45, 0, 57, 0, 45, 0, 57, 0]),
      ...bar([41, 0, 53, 0, 41, 0, 53, 0, 41, 0, 53, 0, 41, 0, 53, 0]),
      ...bar([43, 0, 55, 0, 43, 0, 55, 0, 43, 0, 55, 0, 43, 0, 55, 0]),
      ...bar([40, 0, 52, 0, 40, 0, 52, 0, 44, 0, 56, 0, 44, 0, 56, 0]),
    ],
    drums: Array.from({ length: 64 }, (_, i) => (i % 4 === 0 ? 2 : i % 2 === 1 ? 1 : 0)),
  },
};

class Music {
  private track: keyof typeof TRACKS | null = null;
  private step = 0;
  private nextTime = 0;
  private timer: ReturnType<typeof setInterval> | null = null;

  play(name: keyof typeof TRACKS) {
    if (this.track === name && this.timer) return;
    this.track = name;
    this.step = 0;
    this.start();
  }

  stop() {
    this.track = null;
    this.halt();
  }

  /** Stop producing notes but remember the track (music toggled off). */
  pauseOutput() {
    this.halt();
  }

  resume() {
    if (this.track && !this.timer) this.start();
  }

  private halt() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private start() {
    this.halt();
    const ctx = audio.context;
    if (!ctx || !audio.musicOn || !this.track) return;
    this.nextTime = ctx.currentTime + 0.05;
    this.timer = setInterval(() => this.pump(), 25);
  }

  private pump() {
    const ctx = audio.context;
    if (!ctx || !this.track) return;
    const tr = TRACKS[this.track];
    const stepDur = 60 / tr.bpm / 4;
    while (this.nextTime < ctx.currentTime + 0.12) {
      const i = this.step % tr.lead.length;
      const at = this.nextTime;
      if (tr.lead[i]) audio.tone(midi(tr.lead[i]), stepDur * 0.9, { vol: 0.07, at, bus: 'music' });
      if (tr.bass[i]) audio.tone(midi(tr.bass[i]), stepDur * 1.8, { wave: 'triangle', vol: 0.2, at, bus: 'music' });
      if (tr.drums[i] === 1) audio.noise(0.03, { vol: 0.05, at, bus: 'music', hp: 6000 });
      if (tr.drums[i] === 2) audio.tone(120, 0.08, { wave: 'sine', vol: 0.3, at, slideTo: 40, bus: 'music' });
      this.nextTime += stepDur;
      this.step++;
    }
  }
}

export const music = new Music();
