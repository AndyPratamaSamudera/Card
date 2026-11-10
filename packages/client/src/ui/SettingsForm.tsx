import type { BotLevel, MatchSettings } from '@overload21/shared';
import { Choice, Field, Stepper } from './kit';

export function MatchSettingsForm({
  value,
  onChange,
  disabled,
  showBots = true,
  showMaxPlayers = false,
}: {
  value: MatchSettings;
  onChange: (patch: Partial<MatchSettings>) => void;
  disabled?: boolean;
  showBots?: boolean;
  showMaxPlayers?: boolean;
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="Batas Overload" hint="total > batas = roll">
        <Stepper label="batas" value={value.overloadLimit} min={15} max={31} disabled={disabled} onChange={(v) => onChange({ overloadLimit: v })} />
      </Field>
      <Field label="Peluang Selamat" hint="saat overload">
        <Stepper
          label="peluang selamat"
          value={value.surviveChance}
          min={50}
          max={90}
          step={5}
          format={(v) => `${v}%`}
          disabled={disabled}
          onChange={(v) => onChange({ surviveChance: v })}
        />
      </Field>
      <Field label="Kartu Awal">
        <Stepper label="kartu awal" value={value.handSize} min={3} max={7} disabled={disabled} onChange={(v) => onChange({ handSize: v })} />
      </Field>
      <Field label="Waktu Giliran">
        <Choice
          label="waktu giliran"
          value={value.turnSeconds}
          disabled={disabled}
          onChange={(v) => onChange({ turnSeconds: v })}
          options={[
            { value: 0, label: 'OFF' },
            { value: 10, label: '10s' },
            { value: 15, label: '15s' },
            { value: 20, label: '20s' },
            { value: 30, label: '30s' },
          ]}
        />
      </Field>
      {showBots && (
        <Field label="Level Bot">
          <Choice<BotLevel>
            label="level bot"
            value={value.botLevel}
            disabled={disabled}
            onChange={(v) => onChange({ botLevel: v })}
            options={[
              { value: 'EASY', label: 'MUDAH' },
              { value: 'NORMAL', label: 'NORMAL' },
              { value: 'HARD', label: 'SULIT' },
            ]}
          />
        </Field>
      )}
      {showMaxPlayers && (
        <Field label="Maks Pemain">
          <Stepper label="maks pemain" value={value.maxPlayers} min={2} max={8} disabled={disabled} onChange={(v) => onChange({ maxPlayers: v })} />
        </Field>
      )}
    </div>
  );
}
