import { GAME_BALANCE } from '@cosmic/shared';

export interface OverloadCheckResult {
  isOverloaded: boolean;
  coreTotal: number;
  overloadLimit: number;
  excess: number;
}

export class OverloadManager {
  private coreTotal: number = 0;
  private overloadLimit: number = 30;

  constructor() {
    this.resetRound();
  }

  public resetRound(baseLimit?: number): void {
    this.coreTotal = 0;
    if (baseLimit !== undefined) {
      this.overloadLimit = baseLimit;
    } else {
      // Generate randomized limit between MIN and MAX
      const min = GAME_BALANCE.BASE_OVERLOAD_LIMIT_MIN;
      const max = GAME_BALANCE.BASE_OVERLOAD_LIMIT_MAX;
      this.overloadLimit = Math.floor(Math.random() * (max - min + 1)) + min;
    }
  }

  public getCoreTotal(): number {
    return this.coreTotal;
  }

  public getOverloadLimit(): number {
    return this.overloadLimit;
  }

  public addValue(amount: number): OverloadCheckResult {
    this.coreTotal += amount;
    return this.checkOverload();
  }

  public reduceValue(amount: number): void {
    this.coreTotal = Math.max(0, this.coreTotal - amount);
  }

  public setCoreTotal(val: number): void {
    this.coreTotal = Math.max(0, val);
  }

  public reduceOverloadLimit(amount: number): void {
    this.overloadLimit = Math.max(10, this.overloadLimit - amount);
  }

  public checkOverload(): OverloadCheckResult {
    const isOverloaded = this.coreTotal > this.overloadLimit;
    const excess = Math.max(0, this.coreTotal - this.overloadLimit);
    return {
      isOverloaded,
      coreTotal: this.coreTotal,
      overloadLimit: this.overloadLimit,
      excess
    };
  }
}
