import { useEffect, useState } from 'react';
import { NameSchema } from '@overload21/shared';
import { audio, music, sfx } from '../audio/audio';
import { useStore, loadSetup, type LocalSetup } from '../store/store';
import { Btn, Field, Logo, Panel, Stepper } from '../ui/kit';
import { Avatar } from '../ui/sprites';
import { MatchSettingsForm } from '../ui/SettingsForm';
import { connectOnline, createRoom, joinRoom, startLocal } from '../game/session';

// ─── Title ──────────────────────────────────────────────────────────────────
export function TitleScreen() {
  const go = useStore((s) => s.go);
  useEffect(() => {
    const start = () => {
      audio.unlock();
      sfx.select();
      music.play('menu');
      go('menu');
    };
    const onKey = (e: KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && start();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  return (
    <button
      className="flex h-full w-full flex-col items-center justify-center gap-10 px-4 font-term"
      onClick={() => {
        audio.unlock();
        sfx.select();
        music.play('menu');
        go('menu');
      }}
    >
      <div className="flex gap-3">
        {[0, 1, 2, 3].map((i) => (
          <Avatar key={i} avatar={i * 2 + 1} size={36} className={i % 2 ? 'animate-flicker' : ''} />
        ))}
      </div>
      <Logo />
      <p className="max-w-md text-center text-xl text-dim">Mainkan kartu, jaga total tetap di bawah batas — atau pertaruhkan nyawamu!</p>
      <div className="animate-blink font-pixel text-xs text-cyan sm:text-sm">TEKAN START</div>
      <div className="absolute bottom-[calc(env(safe-area-inset-bottom,0px)+12px)] font-pixel text-[8px] text-line">© ARCADE CARD CO-OP</div>
    </button>
  );
}

// ─── Profile (name + avatar) ────────────────────────────────────────────────
function ProfileEditor() {
  const prefs = useStore((s) => s.prefs);
  const setPrefs = useStore((s) => s.setPrefs);
  return (
    <div className="flex items-center gap-4">
      <button
        className="shrink-0 p-1 hover:animate-shake"
        aria-label="Ganti avatar"
        onClick={() => {
          audio.unlock();
          sfx.select();
          setPrefs({ avatar: (prefs.avatar + 1) % 8 });
        }}
      >
        <Avatar avatar={prefs.avatar} size={56} />
      </button>
      <div className="flex-1">
        <label className="mb-2 block font-pixel text-[10px] text-cyan" htmlFor="name">
          NAMA PEMAIN
        </label>
        <input
          id="name"
          className="px-input"
          maxLength={12}
          value={prefs.name}
          placeholder="ketik nama…"
          onChange={(e) => setPrefs({ name: e.target.value.replace(/[^\p{L}\p{N} _-]/gu, '') })}
        />
      </div>
    </div>
  );
}

function validName(name: string): string | null {
  const r = NameSchema.safeParse(name);
  return r.success ? null : r.error.issues[0]?.message ?? 'Nama tidak valid';
}

// ─── Main menu ──────────────────────────────────────────────────────────────
export function MenuScreen() {
  const { go, setModal, prefs, showToast } = useStore();

  const openSetup = (mode: 'bot' | 'hotseat') => {
    useStore.setState({ localSetup: loadSetup(mode, prefs) });
    go('setup');
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-lg flex-col justify-center gap-8 px-4 py-6">
      <Logo small />
      <Panel className="p-5">
        <ProfileEditor />
      </Panel>
      <nav className="flex flex-col gap-4" aria-label="Menu utama">
        <Btn variant="primary" className="!min-h-[56px] !text-sm" onClick={() => openSetup('bot')}>
          ▶ Lawan Bot
        </Btn>
        <Btn variant="pink" className="!min-h-[56px] !text-sm" onClick={() => openSetup('hotseat')}>
          ▶ Hot-Seat (1 Layar)
        </Btn>
        <Btn
          variant="lime"
          className="!min-h-[56px] !text-sm"
          onClick={() => {
            const err = validName(prefs.name);
            if (err) {
              sfx.error();
              showToast(`Isi nama dulu: ${err}`, 'error');
              return;
            }
            connectOnline();
            go('online');
          }}
        >
          ▶ Online Multiplayer
        </Btn>
        <div className="grid grid-cols-2 gap-4">
          <Btn onClick={() => setModal('howto')}>? Cara Main</Btn>
          <Btn onClick={() => setModal('settings')}>⚙ Pengaturan</Btn>
        </div>
      </nav>
    </div>
  );
}

// ─── Local setup (bot / hot-seat) ───────────────────────────────────────────
export function SetupScreen() {
  const { go, localSetup, showToast } = useStore();
  const [setup, setSetup] = useState<LocalSetup | null>(localSetup);
  if (!setup) return null;
  const hot = setup.mode === 'hotseat';
  const total = setup.humans.length + setup.bots;
  const patch = (p: Partial<LocalSetup>) => setSetup({ ...setup, ...p });

  const start = () => {
    for (const h of setup.humans) {
      const err = validName(h.name);
      if (err) {
        sfx.error();
        showToast(`${h.name || 'Nama kosong'}: ${err}`, 'error');
        return;
      }
    }
    const names = setup.humans.map((h) => h.name.trim().toLowerCase());
    if (new Set(names).size !== names.length) {
      sfx.error();
      showToast('Nama pemain tidak boleh sama.', 'error');
      return;
    }
    if (total < 2) {
      sfx.error();
      showToast('Minimal 2 pemain.', 'error');
      return;
    }
    sfx.select();
    startLocal({ ...setup, humans: setup.humans.map((h) => ({ ...h, name: h.name.trim() })) });
  };

  return (
    <div className="scroll-y h-full">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
        <div className="flex items-center justify-between gap-4">
          <Btn onClick={() => go('menu')}>◀ Kembali</Btn>
          <h1 className="font-pixel text-xs text-sun glow-sun sm:text-sm">{hot ? 'HOT-SEAT' : 'LAWAN BOT'}</h1>
        </div>

        <Panel className="flex flex-col gap-5 p-5">
          {hot ? (
            <Field label={`Pemain (${setup.humans.length})`} hint="bergantian di 1 perangkat">
              <div className="flex flex-col gap-3">
                {setup.humans.map((h, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <button
                      aria-label={`Ganti avatar pemain ${i + 1}`}
                      onClick={() => {
                        sfx.click();
                        const humans = setup.humans.slice();
                        humans[i] = { ...h, avatar: (h.avatar + 1) % 8 };
                        patch({ humans });
                      }}
                    >
                      <Avatar avatar={h.avatar} size={36} />
                    </button>
                    <input
                      className="px-input"
                      value={h.name}
                      maxLength={12}
                      aria-label={`Nama pemain ${i + 1}`}
                      onChange={(e) => {
                        const humans = setup.humans.slice();
                        humans[i] = { ...h, name: e.target.value.replace(/[^\p{L}\p{N} _-]/gu, '') };
                        patch({ humans });
                      }}
                    />
                    <Btn
                      variant="danger"
                      className="!px-3"
                      disabled={setup.humans.length <= 2}
                      aria-label={`Hapus pemain ${i + 1}`}
                      onClick={() => patch({ humans: setup.humans.filter((_, j) => j !== i) })}
                    >
                      X
                    </Btn>
                  </div>
                ))}
                <Btn
                  disabled={total >= 8}
                  onClick={() =>
                    patch({
                      humans: [...setup.humans, { name: `P${setup.humans.length + 1}`, avatar: (setup.humans.length * 3) % 8 }],
                    })
                  }
                >
                  + Tambah Pemain
                </Btn>
              </div>
            </Field>
          ) : null}

          <Field label="Jumlah Bot" hint={`total ${total}/8 pemain`}>
            <Stepper
              label="jumlah bot"
              value={setup.bots}
              min={hot ? 0 : 1}
              max={8 - setup.humans.length}
              onChange={(v) => patch({ bots: v })}
            />
          </Field>
        </Panel>

        <Panel className="p-5">
          <MatchSettingsForm
            value={setup.settings}
            showBots={setup.bots > 0}
            onChange={(p) => patch({ settings: { ...setup.settings, ...p } })}
          />
        </Panel>

        <Btn variant="primary" className="!min-h-[60px] !text-sm" onClick={start}>
          ▶ Mulai Match
        </Btn>
      </div>
    </div>
  );
}

// ─── Online: create / join ──────────────────────────────────────────────────
export function OnlineScreen() {
  const { go, prefs, connection, showToast } = useStore();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<string | null>) => {
    const err = validName(prefs.name);
    if (err) {
      sfx.error();
      showToast(err, 'error');
      return;
    }
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (res) {
      sfx.error();
      showToast(res, 'error');
    } else sfx.select();
  };

  const statusText = { idle: 'MENYAMBUNG…', connecting: 'MENYAMBUNG…', online: 'ONLINE', offline: 'OFFLINE' }[connection];
  const statusColor = connection === 'online' ? 'text-lime' : connection === 'offline' ? 'text-blood' : 'text-sun animate-blink';
  const offline = connection !== 'online';

  return (
    <div className="mx-auto flex h-full w-full max-w-lg flex-col justify-center gap-6 px-4 py-6">
      <div className="flex items-center justify-between gap-4">
        <Btn onClick={() => go('menu')}>◀ Kembali</Btn>
        <span className={`font-pixel text-[10px] ${statusColor}`}>● {statusText}</span>
      </div>
      <Panel className="p-5">
        <ProfileEditor />
      </Panel>
      <Panel className="flex flex-col gap-4 p-5" color="#ffe23d">
        <h2 className="font-pixel text-xs text-sun">BUAT ROOM BARU</h2>
        <p className="text-lg text-dim">Kamu jadi host. Bagikan kode room ke teman.</p>
        <Btn variant="primary" disabled={busy || offline} onClick={() => run(() => createRoom(prefs.name.trim(), prefs.avatar))}>
          ★ Buat Room
        </Btn>
      </Panel>
      <Panel className="flex flex-col gap-4 p-5" color="#3dff7a">
        <h2 className="font-pixel text-xs text-lime">GABUNG ROOM</h2>
        <form
          className="flex gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => joinRoom(code, prefs.name.trim(), prefs.avatar));
          }}
        >
          <input
            className="px-input text-center font-pixel !text-lg uppercase tracking-[0.3em]"
            placeholder="KODE"
            aria-label="Kode room"
            maxLength={4}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
          />
          <button type="submit" className="px-btn px-btn-lime shrink-0" disabled={busy || offline || code.length !== 4}>
            Gabung
          </button>
        </form>
      </Panel>
    </div>
  );
}
