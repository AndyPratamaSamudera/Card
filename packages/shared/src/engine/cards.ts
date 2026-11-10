import type { Card, SpecialCard, SpecialId } from './types.js';

/** Number cards: value → copies. 48 total. */
export const NUMBER_DISTRIBUTION: Record<number, number> = {
  1: 5, 2: 5, 3: 5, 4: 5, 5: 5, 6: 5, 7: 5, 8: 5, 9: 4, 10: 4,
};

/** Special cards: 10 total. */
export const SPECIAL_DISTRIBUTION: Array<{ special: SpecialId; threshold?: number; count: number }> = [
  { special: 'DEATH', count: 1 },
  { special: 'ROLEBACK', count: 2 },
  { special: 'GREATER_THAN', threshold: 1, count: 1 },
  { special: 'GREATER_THAN', threshold: 2, count: 1 },
  { special: 'GREATER_THAN', threshold: 3, count: 1 },
  { special: 'SKIP', count: 1 },
  { special: 'RESET_ZERO', count: 1 },
  { special: 'SET_LIMIT', count: 1 },
  { special: 'MINUS_5', count: 1 },
];

export const MINUS_AMOUNT = 5;

export function buildDeck(): Card[] {
  const deck: Card[] = [];
  for (const [value, count] of Object.entries(NUMBER_DISTRIBUTION)) {
    for (let i = 0; i < count; i++) {
      deck.push({ id: `n${value}_${i}`, kind: 'NUMBER', value: Number(value) });
    }
  }
  for (const s of SPECIAL_DISTRIBUTION) {
    for (let i = 0; i < s.count; i++) {
      const card: SpecialCard = { id: `s_${s.special.toLowerCase()}${s.threshold ?? ''}_${i}`, kind: 'SPECIAL', special: s.special };
      if (s.threshold !== undefined) card.threshold = s.threshold;
      deck.push(card);
    }
  }
  return deck;
}

export const DECK_SIZE = buildDeck().length;

export interface CardInfo {
  title: string;
  short: string;
  description: string;
}

/** Human-readable text (Indonesian) for each card. */
export function cardInfo(card: Card, limit = 21): CardInfo {
  if (card.kind === 'NUMBER') {
    return {
      title: `+${card.value}`,
      short: `+${card.value}`,
      description: `Tambah ${card.value} ke total meja.`,
    };
  }
  switch (card.special) {
    case 'DEATH':
      return {
        title: 'DEATH',
        short: 'MAUT',
        description: 'Semua pemain yang masih hidup harus roll nasib!',
      };
    case 'ROLEBACK':
      return {
        title: 'ROLEBACK',
        short: 'BALIK',
        description: 'Balik arah giliran. Pemain berikutnya tidak boleh membalas dengan Roleback.',
      };
    case 'GREATER_THAN':
      return {
        title: `>${card.threshold}`,
        short: `>${card.threshold}`,
        description: `Pemain berikutnya wajib main kartu angka lebih dari ${card.threshold}. Kartu spesial dilarang.`,
      };
    case 'SKIP':
      return {
        title: 'SKIP',
        short: 'LEWATI',
        description: 'Lewati giliran pemain berikutnya.',
      };
    case 'RESET_ZERO':
      return {
        title: 'RESET',
        short: '= 0',
        description: 'Total meja kembali ke 0.',
      };
    case 'SET_LIMIT':
      return {
        title: `= ${limit}`,
        short: 'MAX',
        description: `Total meja langsung jadi ${limit}. Pemain berikutnya di ujung tanduk!`,
      };
    case 'MINUS_5':
      return {
        title: `-${MINUS_AMOUNT}`,
        short: `-${MINUS_AMOUNT}`,
        description: `Kurangi total meja ${MINUS_AMOUNT} (minimal 0).`,
      };
  }
}
