/**
 * Small seeded PRNG (mulberry32). The state lives inside MatchState so the
 * reducer stays pure and every match is reproducible from its seed.
 */
export interface Rng {
  /** float in [0, 1) */
  next(): number;
  /** integer in [min, max] (inclusive) */
  int(min: number, max: number): number;
  readonly state: number;
}

export function createRng(seed: number): Rng {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    get state() {
      return s;
    },
  };
}

export function shuffle<T>(items: T[], rng: Rng): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Random 32-bit seed using whatever secure source is available. */
export function randomSeed(): number {
  const c = (globalThis as { crypto?: { getRandomValues?: (a: Uint32Array) => Uint32Array } }).crypto;
  if (c?.getRandomValues) {
    return c.getRandomValues(new Uint32Array(1))[0];
  }
  return Math.floor(Math.random() * 4294967296);
}
