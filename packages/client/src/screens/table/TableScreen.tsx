import { useEffect, useMemo, useRef, useState } from 'react';
import { cardInfo, type Card, type MatchView, type PlayerView } from '@overload21/shared';
import { sfx } from '../../audio/audio';
import { useStore } from '../../store/store';
import { Btn } from '../../ui/kit';
import { CardBack, PixelCard } from '../../ui/PixelCard';
import { ARROW_RIGHT, Avatar, Sprite, cardColor } from '../../ui/sprites';
import { leaveMatch, playCard, rematch, revealHotseat } from '../../game/session';
import { ConfirmExit, HotseatCover, ResolutionOverlay, ResultOverlay } from './Overlays';

// ─── helpers ────────────────────────────────────────────────────────────────
function useTurnMsLeft(view: MatchView | null, viewAt: number): number | null {
  const [now, setNow] = useState(() => performance.now());
  const msLeft = view?.turnMsLeft ?? null;
  useEffect(() => {
    if (msLeft === null) return;
    const id = setInterval(() => setNow(performance.now()), 100);
    return () => clearInterval(id);
  }, [msLeft, viewAt]);
  if (!view || msLeft === null || view.phase !== 'TURN') return null;
  return Math.max(0, msLeft - (now - viewAt));
}

/** Opponents in turn order starting after me (or after seat 0 for spectators). */
function opponentsInOrder(view: MatchView): PlayerView[] {
  const n = view.players.length;
  const meIdx = Math.max(0, view.players.findIndex((p) => p.id === view.me));
  const out: PlayerView[] = [];
  for (let k = 1; k <= n; k++) {
    const p = view.players[(meIdx + k * view.direction + n * k) % n];
    if (p.id !== view.me && !out.includes(p)) out.push(p);
  }
  return out;
}

// ─── Top bar ────────────────────────────────────────────────────────────────
function TopBar({ view, onExit, onLog }: { view: MatchView; onExit: () => void; onLog: () => void }) {
  const { mode, room, setModal } = useStore();
  const label = mode === 'online' ? `ROOM ${room?.code ?? ''}` : mode === 'hotseat' ? 'HOT-SEAT' : 'VS BOT';
  return (
    <header className="flex items-center justify-between gap-2 px-3 pt-[calc(env(safe-area-inset-top,0px)+8px)] pb-2">
      <div className="flex items-center gap-3">
        <span className="font-pixel text-[10px] text-pink glow-pink">O21</span>
        <span className="font-pixel text-[8px] text-dim sm:text-[10px]">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden font-pixel text-[8px] text-dim sm:inline">DECK {view.deckCount}</span>
        <Btn className="!min-h-[36px] !px-3 !text-[9px] xl:hidden" onClick={onLog} aria-label="Log permainan">
          LOG
        </Btn>
        <Btn className="!min-h-[36px] !px-3 !text-[9px]" onClick={() => setModal('howto')} aria-label="Cara main">
          ?
        </Btn>
        <Btn className="!min-h-[36px] !px-3 !text-[9px]" onClick={() => setModal('settings')} aria-label="Pengaturan">
          ⚙
        </Btn>
        <Btn variant="danger" className="!min-h-[36px] !px-3 !text-[9px]" onClick={onExit} aria-label="Keluar">
          ✕
        </Btn>
      </div>
    </header>
  );
}

// ─── Opponents ──────────────────────────────────────────────────────────────
function Seat({ p, active }: { p: PlayerView; active: boolean }) {
  const out = p.eliminated;
  const color = active ? '#ffe23d' : '#3b2f73';
  return (
    <div
      className={`px-box flex w-[92px] shrink-0 flex-col items-center gap-1 px-1 py-2 sm:w-[112px] ${active ? 'animate-pulse' : ''}`}
      style={{ '--px': color, '--bg': active ? '#2a2108' : '#160f2e' } as React.CSSProperties}
      aria-label={`${p.name}${active ? ', sedang giliran' : ''}${out ? ', gugur' : ''}`}
    >
      <Avatar avatar={p.avatar} size={32} dead={out || !p.connected} />
      <div className={`w-full truncate text-center text-lg leading-none ${out ? 'text-dim line-through' : active ? 'text-sun' : ''}`}>{p.name}</div>
      {out ? (
        <span className="font-pixel text-[8px] text-blood">{p.left ? 'KELUAR' : 'GUGUR'}</span>
      ) : (
        <div className="flex items-center gap-1">
          <div className="flex -space-x-1">
            {Array.from({ length: Math.min(p.handCount, 5) }, (_, i) => (
              <CardBack key={i} size="xs" />
            ))}
          </div>
          <span className="font-pixel text-[9px] text-dim">x{p.handCount}</span>
        </div>
      )}
      <span className="h-3 font-pixel text-[7px]">
        {active ? (
          <span className="text-sun">GILIRAN</span>
        ) : p.autopilot && !out ? (
          <span className="text-violet">AUTO</span>
        ) : p.isBot ? (
          <span className="text-dim">BOT</span>
        ) : !p.connected ? (
          <span className="text-blood">OFFLINE</span>
        ) : null}
      </span>
    </div>
  );
}

function Opponents({ view }: { view: MatchView }) {
  const opp = opponentsInOrder(view);
  return (
    <section aria-label="Lawan" className="flex items-center gap-2 px-3">
      <div className="flex shrink-0 flex-col items-center gap-1" title="Urutan giliran berikutnya (kiri ke kanan)">
        <Sprite grid={ARROW_RIGHT} palette={{ X: view.direction === 1 ? '#29f0ff' : '#ff3df2' }} size={16} />
        <span className="font-pixel text-[6px] text-dim">{view.direction === 1 ? 'MAJU' : 'BALIK'}</span>
      </div>
      <div className="scroll-x flex flex-1 gap-3 px-1 pt-1 pb-3 md:flex-wrap md:justify-center">
        {opp.map((p) => (
          <Seat key={p.id} p={p} active={p.id === view.activePlayerId} />
        ))}
      </div>
    </section>
  );
}

// ─── Machine (total meter + last card) ──────────────────────────────────────
function Machine({ view, onDropCard, dropReady }: { view: MatchView; onDropCard: (id: string) => void; dropReady: boolean }) {
  const limit = view.settings.overloadLimit;
  const shownTotal = view.resolution ? view.resolution.total : view.total;
  const ratio = shownTotal / limit;
  const over = shownTotal > limit;
  const color = over ? '#ff3d5a' : ratio >= 0.85 ? '#ff3d5a' : ratio >= 0.6 ? '#ffe23d' : '#3dff7a';
  const [hover, setHover] = useState(false);
  const segs = limit;
  const lp = view.lastPlay;
  const lastBy = lp ? view.players.find((p) => p.id === lp.playerId) : null;

  return (
    <div
      className={`px-box mx-auto flex w-full max-w-xl flex-col gap-3 p-4 ${over ? 'animate-shake' : ''}`}
      style={{ '--px': hover ? '#ffe23d' : color } as React.CSSProperties}
      onDragOver={(e) => {
        if (!dropReady) return;
        e.preventDefault();
        setHover(true);
      }}
      onDragLeave={() => setHover(false)}
      onDrop={(e) => {
        setHover(false);
        const id = e.dataTransfer.getData('text/plain');
        if (id) onDropCard(id);
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-pixel text-[8px] text-dim sm:text-[10px]">TEKANAN MESIN</span>
        <span className="font-pixel text-[8px] text-dim sm:text-[10px]">{hover ? 'LEPAS UNTUK MAIN!' : `SELAMAT ${view.settings.surviveChance}%`}</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center">
          <div className="font-pixel text-4xl tabular-nums sm:text-5xl" style={{ color, textShadow: `0 0 10px ${color}, 3px 3px 0 #0a0618` }}>
            {String(shownTotal).padStart(2, '0')}
          </div>
          <div className="font-pixel text-[10px] text-dim">/ {limit}</div>
        </div>

        <div className="flex-1">
          {/* segmented meter: one block per point */}
          <div className="flex h-8 items-stretch gap-[2px] bg-ink p-1" role="meter" aria-valuemin={0} aria-valuemax={limit} aria-valuenow={shownTotal} aria-label="Total meja">
            {Array.from({ length: segs }, (_, i) => {
              const on = i < Math.min(shownTotal, segs);
              const segColor = i >= segs * 0.85 ? '#ff3d5a' : i >= segs * 0.6 ? '#ffe23d' : '#3dff7a';
              return <div key={i} className="flex-1" style={{ background: on ? segColor : '#21184a', opacity: on ? 1 : 0.6 }} />;
            })}
          </div>
          <div className="mt-2 flex justify-between font-pixel text-[8px] text-dim">
            <span>0</span>
            <span>{over ? 'OVERLOAD!' : `SISA ${Math.max(0, limit - shownTotal)}`}</span>
            <span>{limit}</span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-1">
          {lp ? (
            <div key={lp.seq} className="animate-pop">
              <PixelCard card={lp.card} size="sm" limit={limit} dim={lp.trapped} />
            </div>
          ) : (
            <div className="flex h-[62px] w-[44px] items-center justify-center border-2 border-dashed border-line font-pixel text-[8px] text-line">—</div>
          )}
          <span className="max-w-[64px] truncate text-sm text-dim">{lastBy ? lastBy.name : 'kosong'}</span>
        </div>
      </div>

      {view.restriction && view.phase === 'TURN' && (
        <div className="bg-violet/20 px-3 py-1 text-center font-pixel text-[9px] text-violet sm:text-[10px]">
          {view.restriction.kind === 'GREATER_THAN'
            ? `ATURAN: WAJIB ANGKA > ${view.restriction.min} — SPESIAL DILARANG`
            : 'ATURAN: ROLEBACK TIDAK BISA DIBALAS'}
        </div>
      )}
    </div>
  );
}

// ─── Turn status + timer ────────────────────────────────────────────────────
function TurnStatus({ view, msLeft, isCovered }: { view: MatchView; msLeft: number | null; isCovered: boolean }) {
  const active = view.players.find((p) => p.id === view.activePlayerId);
  const mine = !!view.me && view.activePlayerId === view.me;
  const lastSecond = useRef<number | null>(null);
  const secs = msLeft === null ? null : Math.ceil(msLeft / 1000);

  useEffect(() => {
    if (!mine || secs === null || isCovered) return;
    if (secs <= 5 && secs > 0 && lastSecond.current !== secs) sfx.tick();
    lastSecond.current = secs;
  }, [secs, mine, isCovered]);

  let text: string;
  if (view.phase === 'RESOLVING') text = 'MENENTUKAN NASIB…';
  else if (view.phase === 'OVER') text = 'MATCH SELESAI';
  else if (mine) text = view.trapped ? 'TERJEBAK! PILIH KARTU UNTUK DIBUANG + ROLL' : 'GILIRANMU! PILIH KARTU';
  else text = `GILIRAN ${active?.name ?? '?'}${active?.isBot || active?.autopilot ? ' (BOT)' : ''}…`;

  const total = view.settings.turnSeconds * 1000;
  const pct = msLeft !== null && total > 0 ? (msLeft / total) * 100 : null;

  return (
    <div className="mx-auto w-full max-w-xl px-1">
      <div className="flex items-center justify-between gap-3">
        <span className={`font-pixel text-[9px] sm:text-[11px] ${mine ? (view.trapped ? 'text-blood' : 'text-sun animate-pulse') : 'text-dim'}`} aria-live="polite">
          {text}
        </span>
        {secs !== null && <span className={`font-pixel text-[10px] tabular-nums ${secs <= 5 ? 'text-blood' : 'text-snow'}`}>{secs}s</span>}
      </div>
      {pct !== null && (
        <div className="mt-2 h-2 bg-ink">
          <div className="h-full transition-[width] duration-100" style={{ width: `${pct}%`, background: pct < 34 ? '#ff3d5a' : '#29f0ff' }} />
        </div>
      )}
    </div>
  );
}

// ─── Hand ───────────────────────────────────────────────────────────────────
function Hand({
  view,
  selected,
  onSelect,
  onPlay,
  busy,
}: {
  view: MatchView;
  selected: string | null;
  onSelect: (id: string | null) => void;
  onPlay: (id: string) => void;
  busy: boolean;
}) {
  const me = view.players.find((p) => p.id === view.me);
  const mine = view.phase === 'TURN' && !!view.me && view.activePlayerId === view.me;
  const limit = view.settings.overloadLimit;
  const [shake, setShake] = useState<string | null>(null);
  const sel = view.myHand.find((c) => c.id === selected) ?? null;

  if (!view.me || !me) {
    return <div className="py-6 text-center text-xl text-dim">Kamu menonton match ini.</div>;
  }
  if (me.eliminated) {
    return (
      <div className="py-6 text-center">
        <div className="font-pixel text-sm text-blood glow-blood">KAMU GUGUR</div>
        <p className="mt-2 text-xl text-dim">Tonton sampai ada pemenang…</p>
      </div>
    );
  }

  const tap = (c: Card) => {
    if (!mine || busy) return;
    if (!view.legalCardIds.includes(c.id)) {
      sfx.error();
      setShake(c.id);
      setTimeout(() => setShake(null), 300);
      useStore.getState().showToast(
        view.restriction?.kind === 'GREATER_THAN'
          ? `Wajib kartu angka > ${view.restriction.min}!`
          : 'Roleback tidak bisa dibalas Roleback!',
        'error',
      );
      return;
    }
    if (selected === c.id) onPlay(c.id);
    else {
      sfx.hover();
      onSelect(c.id);
    }
  };

  return (
    <section aria-label="Kartu di tanganmu" className="flex flex-col gap-2">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-3">
        <div className="flex min-w-0 items-center gap-2">
          <Avatar avatar={me.avatar} size={28} />
          <span className="truncate text-xl text-sun">{me.name}</span>
        </div>
        <div className="min-w-0 flex-1 truncate text-right text-lg text-dim">
          {sel ? cardInfo(sel, limit).description : mine ? 'Ketuk kartu, lalu MAINKAN (atau seret ke mesin)' : ''}
        </div>
        <Btn
          variant={sel && sel.kind === 'NUMBER' && view.total + sel.value > limit && !view.trapped ? 'danger' : 'primary'}
          className="shrink-0 !min-h-[48px]"
          disabled={!mine || !sel || busy}
          silent
          onClick={() => sel && onPlay(sel.id)}
        >
          Mainkan
        </Btn>
      </div>
      <div className="scroll-x px-3 pt-5 pb-[calc(env(safe-area-inset-bottom,0px)+12px)]">
        <ul className="mx-auto flex w-max gap-3 px-2">
          {view.myHand.map((c) => {
            const legal = view.legalCardIds.includes(c.id);
            const isSel = selected === c.id;
            const danger = mine && legal && !view.trapped && c.kind === 'NUMBER' && view.total + c.value > limit;
            return (
              <li key={c.id} className="relative">
                <button
                  className={`relative block transition-transform duration-75 ${isSel ? '-translate-y-4' : mine && legal ? 'hover:-translate-y-2' : ''} ${
                    shake === c.id ? 'animate-shake' : ''
                  } ${!mine ? 'cursor-default' : legal ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                  draggable={mine && legal && !busy}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', c.id);
                    onSelect(c.id);
                  }}
                  onClick={() => tap(c)}
                  onDoubleClick={() => mine && legal && onPlay(c.id)}
                  aria-pressed={isSel}
                  aria-label={`${cardInfo(c, limit).title}${legal ? '' : ' (tidak bisa dimainkan)'}${danger ? ' — akan overload' : ''}`}
                >
                  <PixelCard card={c} size="md" limit={limit} dim={mine && !legal} />
                  {isSel && <div className="pointer-events-none absolute -inset-[6px]" style={{ boxShadow: `0 0 0 3px ${cardColor(c)}, 0 0 16px ${cardColor(c)}` }} />}
                </button>
                {danger && (
                  <span className="pointer-events-none absolute -top-3 right-0 bg-blood px-1 font-pixel text-[7px] text-snow" title="Akan overload">
                    BOOM!
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

// ─── Log ────────────────────────────────────────────────────────────────────
const TONE: Record<string, string> = {
  info: 'text-dim',
  play: 'text-snow',
  special: 'text-cyan',
  danger: 'text-blood',
  good: 'text-lime',
  win: 'text-sun',
};

function Log({ view }: { view: MatchView }) {
  const ref = useRef<HTMLOListElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight });
  }, [view.log.length, view.log[view.log.length - 1]?.id]);
  return (
    <ol ref={ref} className="scroll-y flex h-full flex-col gap-1 p-3 text-lg leading-tight" aria-live="polite">
      {view.log.map((l) => (
        <li key={l.id} className={TONE[l.tone]}>
          › {l.text}
        </li>
      ))}
    </ol>
  );
}

// ─── Screen ─────────────────────────────────────────────────────────────────
export function TableScreen() {
  const view = useStore((s) => s.view);
  const viewAt = useStore((s) => s.viewAt);
  const mode = useStore((s) => s.mode);
  const room = useStore((s) => s.room);
  const cover = useStore((s) => s.cover);
  const showToast = useStore((s) => s.showToast);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);

  // Clear selection whenever the turn changes or the card left the hand.
  const turnKey = `${view?.turnSeq}-${view?.me}`;
  useEffect(() => setSelected(null), [turnKey]);

  const msLeft = useTurnMsLeft(view, viewAt);

  const coverPlayer = useMemo(() => (view && cover ? view.players.find((p) => p.id === cover) ?? null : null), [view, cover]);

  if (!view) {
    return <div className="flex h-full items-center justify-center font-pixel text-xs text-dim animate-blink">MEMUAT…</div>;
  }

  const play = async (cardId: string) => {
    if (busy) return;
    setBusy(true);
    const err = await playCard(cardId);
    setBusy(false);
    if (err) {
      sfx.error();
      showToast(err, 'error');
    } else setSelected(null);
  };

  const isHost = mode !== 'online' || room?.hostId === room?.you;
  const mine = view.phase === 'TURN' && view.activePlayerId === view.me;

  return (
    <div className="flex h-full">
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar view={view} onExit={() => (view.phase === 'OVER' ? leaveMatch() : setConfirmExit(true))} onLog={() => setLogOpen((v) => !v)} />
        <Opponents view={view} />
        <main className="flex flex-1 flex-col justify-center gap-4 px-3">
          <Machine view={view} dropReady={mine && !busy} onDropCard={(id) => view.legalCardIds.includes(id) && play(id)} />
          <TurnStatus view={view} msLeft={msLeft} isCovered={!!cover} />
        </main>
        <Hand view={view} selected={selected} onSelect={setSelected} onPlay={play} busy={busy} />
      </div>

      {/* Log: sidebar on wide screens, drawer on small */}
      <aside className="hidden w-80 shrink-0 border-l-4 border-line bg-panel/70 xl:flex xl:flex-col">
        <div className="border-b-4 border-line px-3 py-2 font-pixel text-[10px] text-cyan">LOG</div>
        <Log view={view} />
      </aside>
      {logOpen && (
        <div className="fixed inset-0 z-20 flex justify-end bg-ink/70 xl:hidden" onClick={() => setLogOpen(false)}>
          <div className="flex h-full w-[85%] max-w-sm flex-col border-l-4 border-line bg-panel animate-rise" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b-4 border-line px-3 py-2 pt-[calc(env(safe-area-inset-top,0px)+8px)]">
              <span className="font-pixel text-[10px] text-cyan">LOG</span>
              <button className="font-pixel text-[10px] text-dim" onClick={() => setLogOpen(false)} aria-label="Tutup log">
                [X]
              </button>
            </div>
            <Log view={view} />
          </div>
        </div>
      )}

      {view.phase === 'RESOLVING' && view.resolution && <ResolutionOverlay key={view.resolution.id} view={view} res={view.resolution} />}

      {view.phase === 'OVER' && (
        <ResultOverlay
          view={view}
          canRematch={isHost}
          rematchLabel={mode === 'online' ? (isHost ? 'Kembali ke Lobby' : 'Menunggu host…') : 'Main Lagi'}
          onRematch={async () => {
            const err = await rematch();
            if (err) showToast(err, 'error');
          }}
          onExit={leaveMatch}
        />
      )}

      {coverPlayer && view.phase === 'TURN' && <HotseatCover player={coverPlayer} onReady={revealHotseat} />}

      {confirmExit && (
        <ConfirmExit
          online={mode === 'online'}
          onNo={() => setConfirmExit(false)}
          onYes={() => {
            setConfirmExit(false);
            leaveMatch();
          }}
        />
      )}
    </div>
  );
}
