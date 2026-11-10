import { useEffect, useState } from 'react';
import type { MatchView, PlayerView, Resolution } from '@overload21/shared';
import { sfx } from '../../audio/audio';
import { Btn } from '../../ui/kit';
import { Avatar, CROWN, Sprite } from '../../ui/sprites';

/** When each roll of a resolution is revealed (ms after it starts). */
export function revealTimes(res: Resolution, resolveMs: number): number[] {
  if (res.kind === 'DEATH') return res.rolls.map((_, i) => 1200 + 900 * i);
  return [Math.round(resolveMs * 0.55)];
}

function useElapsed(active: boolean) {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!active) return;
    const start = performance.now();
    const id = setInterval(() => setT(performance.now() - start), 50);
    return () => clearInterval(id);
  }, [active]);
  return t;
}

function Spinner({ roll, revealed, threshold, survived, spared }: { roll: number; revealed: boolean; threshold: number; survived: boolean; spared?: boolean }) {
  const [n, setN] = useState(() => 1 + Math.floor(Math.random() * 100));
  useEffect(() => {
    if (revealed) return;
    const id = setInterval(() => setN(1 + Math.floor(Math.random() * 100)), 60);
    return () => clearInterval(id);
  }, [revealed]);
  const color = !revealed ? 'text-snow' : survived || spared ? 'text-lime glow-lime' : 'text-blood glow-blood';
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`font-pixel text-3xl tabular-nums sm:text-4xl ${color} ${revealed ? 'animate-pop' : ''}`}>
        {String(revealed ? roll : n).padStart(2, '0')}
      </div>
      <div className="font-pixel text-[8px] text-dim">≤{threshold} = SELAMAT</div>
    </div>
  );
}

/**
 * Roll animation. Keyed by resolution id by the parent, so every new
 * resolution gets a fresh component with its own timers (no stale state).
 */
export function ResolutionOverlay({ view, res }: { view: MatchView; res: Resolution }) {
  const elapsed = useElapsed(true);
  const times = revealTimes(res, view.resolveMs);
  const byId = (id: string) => view.players.find((p) => p.id === id);
  const actor = byId(res.actorId);
  const chance = view.settings.surviveChance;

  // Drum-roll at start, sting at each reveal.
  useEffect(() => {
    sfx.suspense(Math.max(0.6, times[0] / 1000 - 0.1));
    const ids = res.rolls.map((r, i) =>
      setTimeout(() => (r.survived || r.spared ? sfx.survive() : sfx.explode()), times[i]),
    );
    return () => ids.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lastRevealed = elapsed >= times[times.length - 1];
  const anyDeath = res.rolls.some((r, i) => elapsed >= times[i] && !r.survived && !r.spared);

  const title = res.kind === 'DEATH' ? 'DEATH CARD!' : res.kind === 'TRAPPED' ? 'TERJEBAK!' : 'OVERLOAD!';
  const subtitle =
    res.kind === 'DEATH'
      ? `${actor?.name} memaksa semua pemain roll nasib`
      : res.kind === 'TRAPPED'
        ? `${actor?.name} tidak punya kartu yang sah`
        : `${actor?.name} menembus batas: ${res.total}/${view.settings.overloadLimit}`;

  return (
    <div className={`fixed inset-0 z-40 flex items-center justify-center bg-ink/90 p-4 ${anyDeath && !lastRevealed ? 'animate-shake' : ''}`}>
      <div className="px-box w-full max-w-lg animate-pop p-5 text-center" style={{ '--px': '#ff3d5a' } as React.CSSProperties}>
        <div className="animate-flicker font-pixel text-xl text-blood glow-blood sm:text-2xl">{title}</div>
        <p className="mt-2 text-xl text-dim">{subtitle}</p>

        {res.kind === 'DEATH' ? (
          <ul className="mt-5 flex flex-col gap-3">
            {res.rolls.map((r, i) => {
              const p = byId(r.playerId);
              const shown = elapsed >= times[i];
              return (
                <li key={r.playerId} className="flex items-center gap-3 bg-ink/70 px-3 py-2">
                  <Avatar avatar={p?.avatar ?? 0} size={32} dead={shown && !r.survived && !r.spared} />
                  <span className="flex-1 truncate text-left text-xl">{p?.name}</span>
                  <span className={`font-pixel text-lg tabular-nums ${shown ? (r.survived || r.spared ? 'text-lime' : 'text-blood') : 'text-snow'}`}>
                    {shown ? String(r.roll).padStart(2, '0') : '??'}
                  </span>
                  <span className="w-20 text-right font-pixel text-[9px]">
                    {shown ? (r.spared ? <span className="text-sun">DIAMPUNI</span> : r.survived ? <span className="text-lime">SELAMAT</span> : <span className="text-blood">GUGUR</span>) : <span className="animate-blink text-dim">…</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-5 flex flex-col items-center gap-4">
            <Avatar avatar={actor?.avatar ?? 0} size={64} dead={lastRevealed && !res.rolls[0].survived} />
            <Spinner roll={res.rolls[0].roll} revealed={lastRevealed} threshold={chance} survived={res.rolls[0].survived} />
            <div className="h-6 font-pixel text-sm">
              {lastRevealed &&
                (res.rolls[0].survived ? (
                  <span className="animate-pop text-lime glow-lime">SELAMAT!</span>
                ) : (
                  <span className="animate-pop text-blood glow-blood">GUGUR!</span>
                ))}
            </div>
          </div>
        )}
        {lastRevealed && res.kind === 'DEATH' && res.rolls.some((r) => r.spared) && (
          <p className="mt-3 text-lg text-sun">Semua gagal — pemilik kartu DEATH diampuni!</p>
        )}
      </div>
    </div>
  );
}

export function ResultOverlay({
  view,
  canRematch,
  rematchLabel,
  onRematch,
  onExit,
}: {
  view: MatchView;
  canRematch: boolean;
  rematchLabel: string;
  onRematch: () => void;
  onExit: () => void;
}) {
  const winner = view.players.find((p) => p.id === view.winnerId);
  const iWon = !!view.me && view.me === view.winnerId;
  const others = view.players.filter((p) => p.id !== view.winnerId);
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/90 p-4">
      <div className="px-box w-full max-w-md animate-pop p-6 text-center" style={{ '--px': '#ffe23d' } as React.CSSProperties}>
        <div className="font-pixel text-[10px] text-dim">MATCH SELESAI</div>
        <div className={`mt-3 font-pixel text-2xl ${iWon || !view.me ? 'text-sun glow-sun' : 'text-blood glow-blood'}`}>
          {iWon ? 'KAMU MENANG!' : view.me ? 'KAMU KALAH' : 'PEMENANG'}
        </div>
        {winner && (
          <div className="mt-5 flex flex-col items-center gap-2">
            <Sprite grid={CROWN} palette={{ X: '#ffe23d' }} size={28} />
            <Avatar avatar={winner.avatar} size={72} />
            <div className="text-2xl text-sun">{winner.name}</div>
          </div>
        )}
        <ul className="mt-5 flex flex-wrap justify-center gap-3">
          {others.map((p: PlayerView) => (
            <li key={p.id} className="flex flex-col items-center gap-1">
              <Avatar avatar={p.avatar} size={28} dead />
              <span className="max-w-[72px] truncate text-base text-dim">{p.name}</span>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-col gap-3">
          <Btn variant="primary" disabled={!canRematch} onClick={onRematch}>
            {rematchLabel}
          </Btn>
          <Btn onClick={onExit}>Keluar ke Menu</Btn>
        </div>
      </div>
    </div>
  );
}

export function HotseatCover({ player, onReady }: { player: PlayerView; onReady: () => void }) {
  return (
    <div className="fixed inset-0 z-30 flex flex-col items-center justify-center gap-6 bg-ink p-6 text-center arcade-bg">
      <div className="font-pixel text-[10px] text-dim">OPER PERANGKAT KE</div>
      <Avatar avatar={player.avatar} size={96} />
      <div className="font-pixel text-2xl text-sun glow-sun">{player.name}</div>
      <p className="max-w-sm text-xl text-dim">Pemain lain jangan mengintip kartu!</p>
      <Btn variant="primary" className="!min-h-[60px] !px-8 !text-sm" silent onClick={onReady}>
        Saya Siap ▶
      </Btn>
    </div>
  );
}

export function ConfirmExit({ onYes, onNo, online }: { onYes: () => void; onNo: () => void; online: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/85 p-4" onClick={onNo}>
      <div className="px-box w-full max-w-sm animate-pop p-5 text-center" style={{ '--px': '#ff3d5a' } as React.CSSProperties} onClick={(e) => e.stopPropagation()}>
        <div className="font-pixel text-sm text-blood">KELUAR MATCH?</div>
        <p className="mt-3 text-xl text-dim">{online ? 'Kamu akan dianggap kalah (gugur) di match ini.' : 'Progres match ini akan hilang.'}</p>
        <div className="mt-5 grid grid-cols-2 gap-4">
          <Btn onClick={onNo}>Batal</Btn>
          <Btn variant="danger" onClick={onYes}>
            Keluar
          </Btn>
        </div>
      </div>
    </div>
  );
}
