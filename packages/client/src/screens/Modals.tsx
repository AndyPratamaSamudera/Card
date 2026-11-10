import { buildDeck, cardInfo, DEFAULT_SETTINGS, type Card } from '@overload21/shared';
import { useStore } from '../store/store';
import { Choice, Field, Modal, Stepper } from '../ui/kit';
import { PixelCard } from '../ui/PixelCard';

/** One sample of every distinct card. */
const SAMPLES: Card[] = (() => {
  const seen = new Set<string>();
  const out: Card[] = [];
  for (const c of buildDeck()) {
    const key = c.kind === 'NUMBER' ? `n${c.value}` : `${c.special}${c.threshold ?? ''}`;
    if (c.kind === 'NUMBER' && ![1, 5, 10].includes(c.value)) continue;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(c);
    }
  }
  return out;
})();

export function HowToPlay() {
  const setModal = useStore((s) => s.setModal);
  const view = useStore((s) => s.view);
  const settings = view?.settings ?? DEFAULT_SETTINGS;
  const limit = settings.overloadLimit;
  return (
    <Modal title="CARA MAIN" wide onClose={() => setModal(null)}>
      <div className="flex flex-col gap-5 text-xl leading-snug">
        <section>
          <h3 className="mb-2 font-pixel text-[10px] text-sun">TUJUAN</h3>
          <p>Jadi pemain terakhir yang masih hidup.</p>
        </section>
        <section>
          <h3 className="mb-2 font-pixel text-[10px] text-sun">GILIRAN</h3>
          <ol className="list-inside list-decimal space-y-1">
            <li>Mainkan 1 kartu ke mesin. Kartu angka menambah total meja.</li>
            <li>Kamu otomatis mengambil 1 kartu baru.</li>
            <li>
              Kalau total <b className="text-blood">lebih dari {limit}</b> → <b className="text-blood">OVERLOAD</b>! Kamu roll 1-100: angka ≤{' '}
              {settings.surviveChance} selamat, selain itu <b className="text-blood">gugur</b>. Total kembali ke 0.
            </li>
            <li>Tepat {limit} masih aman.</li>
          </ol>
        </section>
        <section>
          <h3 className="mb-2 font-pixel text-[10px] text-sun">TERJEBAK</h3>
          <p>
            Kalau aturan (mis. <b className="text-violet">&gt;3</b>) membuat kamu tidak punya kartu yang sah, kamu boleh membuang kartu apa saja — efeknya
            hangus dan kamu wajib roll nasib.
          </p>
        </section>
        <section>
          <h3 className="mb-3 font-pixel text-[10px] text-sun">KARTU</h3>
          <ul className="grid gap-4 sm:grid-cols-2">
            {SAMPLES.map((c) => (
              <li key={c.id} className="flex items-center gap-3">
                <PixelCard card={c} size="sm" limit={limit} />
                <div>
                  <div className="font-pixel text-[9px] text-cyan">{cardInfo(c, limit).title}</div>
                  <div className="text-lg text-dim">
                    {c.kind === 'NUMBER' ? `Kartu angka +1 sampai +10. ${cardInfo(c, limit).description}` : cardInfo(c, limit).description}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h3 className="mb-2 font-pixel text-[10px] text-sun">KONTROL</h3>
          <p>Ketuk kartu untuk memilih, ketuk lagi atau tekan MAINKAN. Di desktop kartu juga bisa diseret ke mesin. Label BOOM! = kartu itu akan membuat overload.</p>
        </section>
      </div>
    </Modal>
  );
}

export function SettingsModal() {
  const { prefs, setPrefs, setModal } = useStore();
  return (
    <Modal title="PENGATURAN" onClose={() => setModal(null)}>
      <div className="flex flex-col gap-5">
        <Field label="Musik Chiptune">
          <Choice label="musik" value={prefs.music ? 1 : 0} onChange={(v) => setPrefs({ music: v === 1 })} options={[{ value: 1, label: 'ON' }, { value: 0, label: 'OFF' }]} />
        </Field>
        <Field label="Efek Suara">
          <Choice label="efek suara" value={prefs.sfx ? 1 : 0} onChange={(v) => setPrefs({ sfx: v === 1 })} options={[{ value: 1, label: 'ON' }, { value: 0, label: 'OFF' }]} />
        </Field>
        <Field label="Volume">
          <Stepper
            label="volume"
            value={Math.round(prefs.volume * 10)}
            min={0}
            max={10}
            format={(v) => `${v * 10}%`}
            onChange={(v) => setPrefs({ volume: v / 10 })}
          />
        </Field>
        <Field label="Efek Layar CRT" hint="garis scanline">
          <Choice label="efek CRT" value={prefs.crt ? 1 : 0} onChange={(v) => setPrefs({ crt: v === 1 })} options={[{ value: 1, label: 'ON' }, { value: 0, label: 'OFF' }]} />
        </Field>
      </div>
    </Modal>
  );
}
