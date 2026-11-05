import {
  Card,
  NumberCard,
  SpecialCard,
  SpecialCardId,
  NUMBER_CARD_DISTRIBUTION,
  SPECIAL_CARDS_BLUEPRINTS,
  GAME_BALANCE
} from '@cosmic/shared';

export class DeckManager {
  private drawPile: Card[] = [];
  private discardPile: Card[] = [];
  private cardIdCounter = 1;

  constructor() {
    this.resetDeck();
  }

  public resetDeck(): void {
    this.drawPile = [];
    this.discardPile = [];
    this.cardIdCounter = 1;

    // 1. Add Number cards (40 cards total)
    for (const [valStr, count] of Object.entries(NUMBER_CARD_DISTRIBUTION)) {
      const value = parseInt(valStr, 10);
      for (let i = 0; i < count; i++) {
        const id = `num_${value}_${this.cardIdCounter++}`;
        const numberCard: NumberCard = {
          id,
          type: 'NUMBER',
          value,
          name: `Plasma +${value}`,
          description: `Adds +${value} to the central Core Total.`,
          glowColor: value <= 4 ? '#38bdf8' : value <= 7 ? '#f59e0b' : '#ef4444',
          flavorText: `Stable thermonuclear charge packet level ${value}.`
        };
        this.drawPile.push(numberCard);
      }
    }

    // 2. Add Special cards (14 cards total)
    for (const specialId of Object.keys(SPECIAL_CARDS_BLUEPRINTS) as SpecialCardId[]) {
      const blueprint = SPECIAL_CARDS_BLUEPRINTS[specialId];
      const id = `spc_${specialId.toLowerCase()}_${this.cardIdCounter++}`;
      const specialCard: SpecialCard = {
        ...blueprint,
        id
      };
      this.drawPile.push(specialCard);
    }

    this.shuffle();
  }

  public shuffle(): void {
    for (let i = this.drawPile.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.drawPile[i], this.drawPile[j]] = [this.drawPile[j], this.drawPile[i]];
    }
  }

  public dealInitialHands(playerIds: string[], handSize = GAME_BALANCE.INITIAL_HAND_SIZE): Map<string, Card[]> {
    const hands = new Map<string, Card[]>();
    for (const pid of playerIds) {
      hands.set(pid, []);
    }

    for (let round = 0; round < handSize; round++) {
      for (const pid of playerIds) {
        const card = this.drawCard();
        if (card) {
          hands.get(pid)!.push(card);
        }
      }
    }

    return hands;
  }

  public drawCard(): Card | null {
    if (this.drawPile.length === 0) {
      if (this.discardPile.length === 0) {
        return null; // deck exhausted
      }
      // Reshuffle discard pile into draw pile
      this.drawPile = [...this.discardPile];
      this.discardPile = [];
      this.shuffle();
    }

    return this.drawPile.pop() || null;
  }

  public discard(card: Card): void {
    this.discardPile.push(card);
  }

  public getDrawPileCount(): number {
    return this.drawPile.length;
  }

  public getDiscardPileCount(): number {
    return this.discardPile.length;
  }
}
