import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { audio, sfx } from '../audio/audio';
import { useStore } from '../store/store';

type Variant = 'default' | 'primary' | 'danger' | 'pink' | 'lime';

// Full class names so Tailwind's content scan keeps them.
const VARIANT_CLASS: Record<Variant, string> = {
  default: '',
  primary: 'px-btn-primary',
  danger: 'px-btn-danger',
  pink: 'px-btn-pink',
  lime: 'px-btn-lime',
};

export function Btn({
  variant = 'default',
  className = '',
  onClick,
  silent,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; silent?: boolean }) {
  const v = VARIANT_CLASS[variant];
  return (
    <button
      type="button"
      className={`px-btn ${v} ${className}`}
      onClick={(e) => {
        audio.unlock();
        if (!silent) sfx.click();
        onClick?.(e);
      }}
      {...rest}
    />
  );
}

export function Panel({
  children,
  className = '',
  color,
}: {
  children: ReactNode;
  className?: string;
  color?: string;
}) {
  return (
    <div className={`px-box ${className}`} style={color ? ({ '--px': color } as React.CSSProperties) : undefined}>
      {children}
    </div>
  );
}

export function Logo({ small = false }: { small?: boolean }) {
  return (
    <div className="select-none text-center leading-none">
      <div className={`font-pixel text-pink glow-pink ${small ? 'text-sm' : 'text-3xl sm:text-5xl'}`}>OVERLOAD</div>
      <div className={`font-pixel text-sun glow-sun ${small ? 'text-lg' : 'text-5xl sm:text-7xl'} mt-2`}>21</div>
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/85 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`px-box flex max-h-[90dvh] w-full flex-col animate-pop ${wide ? 'max-w-3xl' : 'max-w-md'}`}
        style={{ '--px': '#29f0ff' } as React.CSSProperties}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b-4 border-line px-4 py-3">
          <h2 className="font-pixel text-xs text-cyan sm:text-sm">{title}</h2>
          <button className="font-pixel text-xs text-dim hover:text-snow" onClick={onClose} aria-label="Tutup">
            [X]
          </button>
        </div>
        <div className="scroll-y flex-1 p-4">{children}</div>
      </div>
    </div>
  );
}

export function ToastHost() {
  const toast = useStore((s) => s.toast);
  if (!toast) return null;
  const color = toast.tone === 'error' ? '#ff3d5a' : toast.tone === 'good' ? '#3dff7a' : '#29f0ff';
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top,0px)+12px)] z-[60] flex justify-center px-4">
      <div key={toast.id} className="px-box animate-rise px-4 py-2 text-center text-lg" style={{ '--px': color } as React.CSSProperties}>
        {toast.text}
      </div>
    </div>
  );
}

/** Segmented choice control */
export function Choice<T extends string | number>({
  value,
  options,
  onChange,
  disabled,
  label,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (v: T) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={String(o.value)}
            role="radio"
            aria-checked={on}
            disabled={disabled}
            onClick={() => {
              audio.unlock();
              sfx.click();
              onChange(o.value);
            }}
            className={`min-h-[36px] min-w-[44px] px-2 font-pixel text-[10px] ${
              on ? 'bg-cyan text-ink' : 'bg-ink text-dim hover:text-snow'
            } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
            style={{ boxShadow: `0 0 0 3px ${on ? '#29f0ff' : '#3b2f73'}` }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Stepper({
  value,
  min,
  max,
  step = 1,
  onChange,
  disabled,
  label,
  format = (v) => String(v),
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  label: string;
  format?: (v: number) => string;
}) {
  const set = (v: number) => {
    audio.unlock();
    sfx.click();
    onChange(Math.min(max, Math.max(min, v)));
  };
  return (
    <div className="flex items-center gap-3" aria-label={label}>
      <button
        className="px-btn !min-h-[36px] !px-3"
        disabled={disabled || value <= min}
        onClick={() => set(value - step)}
        aria-label={`Kurangi ${label}`}
      >
        -
      </button>
      <span className="min-w-[56px] text-center font-pixel text-sm text-sun" aria-live="polite">
        {format(value)}
      </span>
      <button
        className="px-btn !min-h-[36px] !px-3"
        disabled={disabled || value >= max}
        onClick={() => set(value + step)}
        aria-label={`Tambah ${label}`}
      >
        +
      </button>
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-pixel text-[10px] uppercase text-cyan">{label}</span>
        {hint && <span className="text-base text-dim">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
