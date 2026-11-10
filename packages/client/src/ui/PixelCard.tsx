import { cardInfo, type Card } from '@overload21/shared';
import { CardIcon, cardColor } from './sprites';

export type CardSize = 'xs' | 'sm' | 'md' | 'lg';

const SIZES: Record<CardSize, { box: string; num: string; icon: number; title: string }> = {
  xs: { box: 'w-[14px] h-[20px]', num: 'text-[6px]', icon: 8, title: 'text-[4px]' },
  sm: { box: 'w-[44px] h-[62px]', num: 'text-sm', icon: 18, title: 'text-[6px]' },
  md: { box: 'w-[64px] h-[90px] sm:w-[78px] sm:h-[110px]', num: 'text-xl sm:text-2xl', icon: 26, title: 'text-[7px] sm:text-[8px]' },
  lg: { box: 'w-[96px] h-[134px]', num: 'text-3xl', icon: 40, title: 'text-[9px]' },
};

/** Face-up card drawn entirely with CSS + pixel sprite icons. */
export function PixelCard({ card, size = 'md', limit = 21, dim = false }: { card: Card; size?: CardSize; limit?: number; dim?: boolean }) {
  const s = SIZES[size];
  const color = cardColor(card);
  const info = cardInfo(card, limit);
  const isNum = card.kind === 'NUMBER';
  return (
    <div
      className={`relative flex flex-col items-center justify-between bg-panel p-1 ${s.box} ${dim ? 'opacity-40 grayscale' : ''}`}
      style={{
        boxShadow: `0 -3px 0 0 ${color}, 0 3px 0 0 ${color}, -3px 0 0 0 ${color}, 3px 0 0 0 ${color}, 0 6px 0 0 rgba(0,0,0,.5)`,
        background: isNum
          ? `linear-gradient(180deg, #21184a 0%, #160f2e 100%)`
          : `repeating-linear-gradient(45deg, #160f2e 0 6px, #1d1440 6px 12px)`,
      }}
      title={`${info.title}: ${info.description}`}
    >
      <div className="flex w-full justify-between font-pixel text-[7px] leading-none" style={{ color }}>
        <span>{isNum ? card.value : info.short}</span>
        <span>{isNum ? '+' : '★'}</span>
      </div>
      {isNum ? (
        <div className={`font-pixel ${s.num}`} style={{ color, textShadow: `0 0 6px ${color}, 2px 2px 0 #0a0618` }}>
          +{card.value}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1">
          <CardIcon special={card.special} size={s.icon} />
          <div className={`font-pixel ${s.title} text-center leading-tight`} style={{ color }}>
            {info.title}
          </div>
        </div>
      )}
      <div className="h-[3px] w-full" style={{ background: color, opacity: 0.6 }} />
    </div>
  );
}

export function CardBack({ size = 'sm' }: { size?: CardSize }) {
  return (
    <div
      className={`${SIZES[size].box}`}
      style={{
        background: 'repeating-linear-gradient(45deg, #ff3df2 0 3px, #3a0b36 3px 8px)',
        boxShadow: '0 -2px 0 0 #f4f1ff, 0 2px 0 0 #f4f1ff, -2px 0 0 0 #f4f1ff, 2px 0 0 0 #f4f1ff',
      }}
    />
  );
}
