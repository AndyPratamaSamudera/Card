import { memo } from 'react';
import type { Card, SpecialId } from '@overload21/shared';

/**
 * Pixel sprites drawn from text grids. Each character maps to a palette color;
 * '.' is transparent. Horizontal runs are merged into one <rect>.
 */
type Grid = readonly string[];
type Palette = Record<string, string>;

export const Sprite = memo(function Sprite({
  grid,
  palette,
  size,
  className,
  title,
}: {
  grid: Grid;
  palette: Palette;
  /** Rendered width in px (height keeps aspect) */
  size: number;
  className?: string;
  title?: string;
}) {
  const h = grid.length;
  const w = Math.max(...grid.map((r) => r.length));
  const rects: JSX.Element[] = [];
  grid.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (ch === '.' || !palette[ch]) {
        x++;
        continue;
      }
      let end = x + 1;
      while (end < row.length && row[end] === ch) end++;
      rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={end - x} height={1} fill={palette[ch]} />);
      x = end;
    }
  });
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={size}
      height={(size * h) / w}
      className={`pixelated ${className ?? ''}`}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {rects}
    </svg>
  );
});

// ─── Card icons ─────────────────────────────────────────────────────────────
export const ICONS: Record<SpecialId, Grid> = {
  DEATH: [
    '..XXXXXX..',
    '.XXXXXXXX.',
    'XXXXXXXXXX',
    'XX..XX..XX',
    'XX..XX..XX',
    'XXXXXXXXXX',
    '.XXX..XXX.',
    '..XXXXXX..',
    '..X.XX.X..',
    '..XXXXXX..',
  ],
  ROLEBACK: [
    '...X......',
    '..XX......',
    '.XXXXXXXX.',
    '..XX......',
    '...X......',
    '......X...',
    '......XX..',
    '.XXXXXXXX.',
    '......XX..',
    '......X...',
  ],
  GREATER_THAN: [
    'XX........',
    '.XX.......',
    '..XX......',
    '...XX.....',
    '....XX....',
    '...XX.....',
    '..XX......',
    '.XX.......',
    'XX........',
  ],
  SKIP: [
    'X...X...XX',
    'XX..XX..XX',
    'XXX.XXX.XX',
    'XXXXXXXXXX',
    'XXX.XXX.XX',
    'XX..XX..XX',
    'X...X...XX',
  ],
  RESET_ZERO: [
    '..XXXXXX..',
    '.XX....XX.',
    '.XX...XXX.',
    '.XX..X.XX.',
    '.XX.X..XX.',
    '.XXX...XX.',
    '.XX....XX.',
    '..XXXXXX..',
  ],
  SET_LIMIT: [
    '.....XXX..',
    '....XXX...',
    '...XXX....',
    '..XXXXXXX.',
    '.....XXX..',
    '....XXX...',
    '...XX.....',
    '..X.......',
  ],
  MINUS_5: [
    '....X....',
    '.X..X..X.',
    '..X.X.X..',
    '...XXX...',
    'XXXXXXXXX',
    '...XXX...',
    '..X.X.X..',
    '.X..X..X.',
    '....X....',
  ],
};

export const SPECIAL_COLORS: Record<SpecialId, string> = {
  DEATH: '#ff3d5a',
  ROLEBACK: '#29f0ff',
  GREATER_THAN: '#a66bff',
  SKIP: '#ff8a3d',
  RESET_ZERO: '#3dff7a',
  SET_LIMIT: '#ffe23d',
  MINUS_5: '#7ab8ff',
};

export function cardColor(card: Card): string {
  if (card.kind === 'SPECIAL') return SPECIAL_COLORS[card.special];
  if (card.value <= 3) return '#3dff7a';
  if (card.value <= 6) return '#29f0ff';
  if (card.value <= 8) return '#ffe23d';
  return '#ff3df2';
}

export function CardIcon({ special, size, color }: { special: SpecialId; size: number; color?: string }) {
  return <Sprite grid={ICONS[special]} palette={{ X: color ?? SPECIAL_COLORS[special] }} size={size} />;
}

// ─── Robot avatars ──────────────────────────────────────────────────────────
export const AVATAR_COLORS = ['#29f0ff', '#ff3df2', '#ffe23d', '#3dff7a', '#a66bff', '#ff8a3d', '#ff3d5a', '#7ab8ff'];
const AVATAR_SHADES = ['#128a95', '#99208f', '#9a8616', '#1e9446', '#5d34a3', '#9c4d1a', '#9c1c33', '#3d6aa8'];

const ROBOT_TOP: Grid = ['.....kk.....', '.....oo.....', '..kkkkkkkk..', '.kXXXXXXXXk.'];
const ROBOT_EYES: Grid[] = [
  ['.kXwwXXwwXk.', '.kXwkXXwkXk.'],
  ['.kXwwwwwwXk.', '.kXkkkkkkXk.'],
  ['.kXkwXXkwXk.', '.kXwwXXwwXk.'],
  ['.kXXwXXwXXk.', '.kXwkXXkwXk.'],
];
const ROBOT_MOUTH: Grid[] = [
  ['.kXXXXXXXXk.', '.kXXkkkkXXk.'],
  ['.kXXXXXXXXk.', '.kXkXkXkXXk.'],
  ['.kXXXXXXXXk.', '.kXXXkkXXXk.'],
  ['.kXXXXXXXXk.', '.kXkkkkkkXk.'],
];
const ROBOT_BOTTOM: Grid = ['.kXXXXXXXXk.', '..kkkkkkkk..', '...kXooXk...', '..kXXXXXXk..'];

export function robotGrid(avatar: number): Grid {
  const v = Math.abs(avatar) % 4;
  const m = Math.floor(Math.abs(avatar) / 2) % 4;
  return [...ROBOT_TOP, ...ROBOT_EYES[v], ...ROBOT_MOUTH[m], ...ROBOT_BOTTOM];
}

export function Avatar({
  avatar,
  size = 40,
  dead = false,
  className,
}: {
  avatar: number;
  size?: number;
  dead?: boolean;
  className?: string;
}) {
  const i = Math.abs(avatar) % AVATAR_COLORS.length;
  const palette = dead
    ? { X: '#4a4366', o: '#2e2947', w: '#ff3d5a', k: '#140f26' }
    : { X: AVATAR_COLORS[i], o: AVATAR_SHADES[i], w: '#f4f1ff', k: '#0a0618' };
  return <Sprite grid={robotGrid(avatar)} palette={palette} size={size} className={className} />;
}

// ─── Misc ───────────────────────────────────────────────────────────────────
export const ARROW_RIGHT: Grid = ['..X...', '..XX..', 'XXXXX.', 'XXXXXX', 'XXXXX.', '..XX..', '..X...'];
export const ARROW_LEFT: Grid = ARROW_RIGHT.map((r) => r.split('').reverse().join(''));
export const HEART: Grid = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
export const CROWN: Grid = ['X..X..X', 'XX.X.XX', 'XXXXXXX', 'XXXXXXX', 'XXXXXXX'];
