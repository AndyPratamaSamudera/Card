import { useState } from 'react';
import { MIN_PLAYERS } from '@overload21/shared';
import { sfx } from '../audio/audio';
import { useStore } from '../store/store';
import { Btn, Panel } from '../ui/kit';
import { Avatar, CROWN, Sprite } from '../ui/sprites';
import { MatchSettingsForm } from '../ui/SettingsForm';
import { leaveMatch, online } from '../game/session';

export function LobbyScreen() {
  const room = useStore((s) => s.room);
  const showToast = useStore((s) => s.showToast);
  const connection = useStore((s) => s.connection);
  const [copied, setCopied] = useState(false);
  if (!room) return null;

  const isHost = room.you === room.hostId;
  const me = room.members.find((m) => m.id === room.you);
  const waiting = room.members.filter((m) => !m.isBot && m.id !== room.hostId && !m.ready);
  const canStart = room.members.length >= MIN_PLAYERS && waiting.length === 0;

  const act = async (p: Promise<string | null>) => {
    const err = await p;
    if (err) {
      sfx.error();
      showToast(err, 'error');
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      showToast(`Kode room: ${room.code}`);
    }
  };

  return (
    <div className="scroll-y h-full">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Btn variant="danger" onClick={leaveMatch}>
            ◀ Keluar
          </Btn>
          {connection !== 'online' && <span className="animate-blink font-pixel text-[10px] text-blood">● OFFLINE</span>}
        </div>

        <Panel className="flex flex-col items-center gap-3 p-5 text-center" color="#ffe23d">
          <span className="font-pixel text-[10px] text-dim">KODE ROOM</span>
          <button onClick={copy} className="font-pixel text-4xl tracking-[0.3em] text-sun glow-sun sm:text-5xl" aria-label="Salin kode room">
            {room.code}
          </button>
          <span className="text-lg text-dim">{copied ? 'Tersalin!' : 'Ketuk untuk menyalin — bagikan ke teman'}</span>
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel className="flex flex-col gap-3 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-pixel text-xs text-cyan">
                PEMAIN {room.members.length}/{room.settings.maxPlayers}
              </h2>
              {isHost && (
                <Btn className="!min-h-[36px] !text-[9px]" disabled={room.members.length >= room.settings.maxPlayers} onClick={() => act(online.addBot())}>
                  + Bot
                </Btn>
              )}
            </div>
            <ul className="flex flex-col gap-2">
              {room.members.map((m) => {
                const host = m.id === room.hostId;
                return (
                  <li key={m.id} className="flex items-center gap-3 bg-ink/60 px-2 py-2">
                    <Avatar avatar={m.avatar} size={32} dead={!m.connected} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 truncate text-xl">
                        {host && <Sprite grid={CROWN} palette={{ X: '#ffe23d' }} size={14} title="Host" />}
                        <span className={m.id === room.you ? 'text-sun' : ''}>{m.name}</span>
                        {m.isBot && <span className="font-pixel text-[8px] text-violet">BOT</span>}
                      </div>
                      <div className="text-base text-dim">
                        {!m.connected ? 'terputus…' : host ? 'host' : m.isBot ? 'siap' : m.ready ? 'SIAP' : 'belum siap'}
                      </div>
                    </div>
                    {!host && (m.ready || m.isBot) && <span className="font-pixel text-[10px] text-lime">OK</span>}
                    {isHost && !host && (
                      <button
                        className="font-pixel text-[10px] text-blood hover:underline"
                        aria-label={`Keluarkan ${m.name}`}
                        onClick={() => act(online.kick(m.id))}
                      >
                        [X]
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </Panel>

          <Panel className="flex flex-col gap-4 p-5">
            <h2 className="font-pixel text-xs text-cyan">ATURAN ROOM {isHost ? '' : '(diatur host)'}</h2>
            <MatchSettingsForm
              value={room.settings}
              disabled={!isHost}
              showMaxPlayers
              onChange={(p) => act(online.settings(p))}
            />
          </Panel>
        </div>

        {isHost ? (
          <div className="flex flex-col gap-2">
            <Btn variant="primary" className="!min-h-[60px] !text-sm" disabled={!canStart} onClick={() => act(online.start())}>
              ▶ Mulai Match
            </Btn>
            <p className="text-center text-lg text-dim">
              {room.members.length < MIN_PLAYERS
                ? 'Butuh minimal 2 pemain — ajak teman atau tambah bot.'
                : waiting.length
                  ? `Menunggu: ${waiting.map((w) => w.name).join(', ')}`
                  : 'Semua siap!'}
            </p>
          </div>
        ) : (
          <Btn
            variant={me?.ready ? 'lime' : 'primary'}
            className="!min-h-[60px] !text-sm"
            onClick={() => act(online.ready(!me?.ready))}
          >
            {me?.ready ? '✔ Siap! (batal)' : 'Saya Siap'}
          </Btn>
        )}
      </div>
    </div>
  );
}
