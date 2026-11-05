import { TurnDirection, TurnState, Player, GAME_BALANCE } from '@cosmic/shared';

export class TurnManager {
  private direction: TurnDirection = 'CLOCKWISE';
  private activePlayerIndex: number = 0;
  private multiplier: number = 1;
  private turnStartedAt: number = Date.now();
  private extraTurnPlayerId: string | null = null;

  public initialize(players: Player[], startPlayerIndex = 0): void {
    this.direction = 'CLOCKWISE';
    this.multiplier = 1;
    this.activePlayerIndex = startPlayerIndex;
    this.extraTurnPlayerId = null;
    this.turnStartedAt = Date.now();

    // Ensure start player is not eliminated
    if (players[this.activePlayerIndex]?.isEliminated) {
      this.advanceTurn(players);
    }
  }

  public getTurnState(players: Player[]): TurnState {
    const activePlayer = players[this.activePlayerIndex];
    const elapsedSeconds = Math.floor((Date.now() - this.turnStartedAt) / 1000);
    const timeRemaining = Math.max(0, GAME_BALANCE.TURN_DURATION_SECONDS - elapsedSeconds);

    return {
      activePlayerId: activePlayer ? activePlayer.id : '',
      turnStartedAt: this.turnStartedAt,
      timeRemaining,
      direction: this.direction,
      multiplier: this.multiplier
    };
  }

  public reverseDirection(): TurnDirection {
    this.direction = this.direction === 'CLOCKWISE' ? 'COUNTER_CLOCKWISE' : 'CLOCKWISE';
    return this.direction;
  }

  public setMultiplier(mult: number): void {
    this.multiplier = mult;
  }

  public consumeMultiplier(): number {
    const current = this.multiplier;
    this.multiplier = 1;
    return current;
  }

  public grantExtraTurn(playerId: string): void {
    this.extraTurnPlayerId = playerId;
  }

  public advanceTurn(players: Player[], skipCount = 0): string {
    this.turnStartedAt = Date.now();

    // Check if player has extra turn granted
    if (this.extraTurnPlayerId) {
      const extraId = this.extraTurnPlayerId;
      this.extraTurnPlayerId = null;
      const targetIdx = players.findIndex(p => p.id === extraId && !p.isEliminated);
      if (targetIdx !== -1) {
        this.activePlayerIndex = targetIdx;
        return players[this.activePlayerIndex].id;
      }
    }

    const activePlayers = players.filter(p => !p.isEliminated);
    if (activePlayers.length === 0) {
      return '';
    }

    // Number of steps to advance: 1 + skipCount
    const steps = 1 + skipCount;
    const stepDelta = this.direction === 'CLOCKWISE' ? 1 : -1;

    let currentIndex = this.activePlayerIndex;
    let successfulSteps = 0;

    // Loop until we've stepped past required non-eliminated players
    while (successfulSteps < steps) {
      currentIndex = (currentIndex + stepDelta + players.length) % players.length;
      if (!players[currentIndex].isEliminated) {
        successfulSteps++;
      }
    }

    this.activePlayerIndex = currentIndex;
    return players[this.activePlayerIndex].id;
  }

  public getActivePlayer(players: Player[]): Player | undefined {
    return players[this.activePlayerIndex];
  }

  public getNextPlayer(players: Player[], offset = 1): Player | undefined {
    const stepDelta = this.direction === 'CLOCKWISE' ? 1 : -1;
    let idx = this.activePlayerIndex;
    let counted = 0;
    while (counted < offset) {
      idx = (idx + stepDelta + players.length) % players.length;
      if (!players[idx].isEliminated) {
        counted++;
      }
    }
    return players[idx];
  }
}
