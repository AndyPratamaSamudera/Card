import {
  Player,
  Card,
  GameState,
  PlayerPrivateView,
  MatchEvent,
  GAME_BALANCE
} from '@cosmic/shared';
import { DeckManager } from './DeckManager.js';
import { TurnManager } from './TurnManager.js';
import { OverloadManager } from './OverloadManager.js';
import { CardEffectEngine } from './CardEffectEngine.js';
import { AIEngine, AIPersonality } from './AIEngine.js';

export interface PlayCardResult {
  success: boolean;
  error?: string;
  events: MatchEvent[];
  isMatchOver: boolean;
  winnerPlayerId: string | null;
}

export class MatchEngine {
  public readonly id: string;
  private players: Player[] = [];
  private hands: Map<string, Card[]> = new Map();
  private deckManager: DeckManager;
  private turnManager: TurnManager;
  private overloadManager: OverloadManager;
  private cardEffectEngine: CardEffectEngine;
  private roundNumber = 1;
  private activeCardInPlay: Card | null = null;
  private recentEvents: MatchEvent[] = [];
  private winnerPlayerId: string | null = null;

  constructor(id: string, initialPlayers: Player[]) {
    this.id = id;
    this.players = initialPlayers.map((p, idx) => ({
      ...p,
      seatIndex: idx,
      isEliminated: false,
      overloadLevel: 0,
      hasShield: false,
      timeBombTurnsRemaining: null,
      isGlitchScrambled: false,
      cardsInHandCount: 0
    }));

    this.deckManager = new DeckManager();
    this.turnManager = new TurnManager();
    this.overloadManager = new OverloadManager();
    this.cardEffectEngine = new CardEffectEngine();

    this.startNewRound(true);
  }

  public startNewRound(isFirstRound = false): void {
    if (!isFirstRound) {
      this.roundNumber++;
    }

    this.deckManager.resetDeck();
    this.overloadManager.resetRound();

    // Reset temporary round statuses
    for (const player of this.players) {
      player.hasShield = false;
      player.timeBombTurnsRemaining = null;
      player.isGlitchScrambled = false;
    }

    // Deal hands to active players
    const activePlayerIds = this.getActivePlayers().map(p => p.id);
    this.hands = this.deckManager.dealInitialHands(activePlayerIds, GAME_BALANCE.INITIAL_HAND_SIZE);

    for (const player of this.players) {
      player.cardsInHandCount = this.hands.get(player.id)?.length || 0;
    }

    // Initialize turns
    this.turnManager.initialize(this.players, 0);

    const startEvent: MatchEvent = {
      id: `evt_round_${this.roundNumber}_${Date.now()}`,
      timestamp: Date.now(),
      type: 'ROUND_STARTED',
      message: `Round ${this.roundNumber} has begun! Overload Limit set to ${this.overloadManager.getOverloadLimit()}.`
    };
    this.recordEvent(startEvent);
  }

  public playCard(playerId: string, cardId: string, targetPlayerId?: string): PlayCardResult {
    if (this.winnerPlayerId) {
      return { success: false, error: 'Match is already over', events: [], isMatchOver: true, winnerPlayerId: this.winnerPlayerId };
    }

    const activePlayer = this.turnManager.getActivePlayer(this.players);
    if (!activePlayer || activePlayer.id !== playerId) {
      return { success: false, error: 'Not your turn', events: [], isMatchOver: false, winnerPlayerId: null };
    }

    const playerHand = this.hands.get(playerId);
    if (!playerHand) {
      return { success: false, error: 'Player hand not found', events: [], isMatchOver: false, winnerPlayerId: null };
    }

    const cardIndex = playerHand.findIndex(c => c.id === cardId);
    if (cardIndex === -1) {
      return { success: false, error: 'Card not in player hand', events: [], isMatchOver: false, winnerPlayerId: null };
    }

    const card = playerHand.splice(cardIndex, 1)[0];
    this.activeCardInPlay = card;
    this.deckManager.discard(card);
    activePlayer.cardsInHandCount = playerHand.length;

    // Reset glitch scrambled state if they had it
    activePlayer.isGlitchScrambled = false;

    const roundEvents: MatchEvent[] = [];

    // Record card played event
    const playEvt: MatchEvent = {
      id: `evt_play_${Date.now()}_${card.id}`,
      timestamp: Date.now(),
      type: 'CARD_PLAYED',
      actorPlayerId: activePlayer.id,
      targetPlayerId,
      cardName: card.name,
      cardValue: card.type === 'NUMBER' ? card.value : undefined,
      specialId: card.type === 'SPECIAL' ? card.specialId : undefined,
      message: `${activePlayer.username} played ${card.name}!`
    };
    this.recordEvent(playEvt);
    roundEvents.push(playEvt);

    let isRoundOverloaded = false;

    // Execute Card Logic
    if (card.type === 'NUMBER') {
      const multiplier = this.turnManager.consumeMultiplier();
      const addedValue = card.value * multiplier;
      const overloadRes = this.overloadManager.addValue(addedValue);

      if (multiplier > 1) {
        const multEvt: MatchEvent = {
          id: `evt_mult_${Date.now()}`,
          timestamp: Date.now(),
          type: 'SPECIAL_EFFECT_TRIGGERED',
          actorPlayerId: activePlayer.id,
          message: `Overclock Surge boosted +${card.value} into +${addedValue}! Core is now ${overloadRes.coreTotal}/${overloadRes.overloadLimit}.`
        };
        this.recordEvent(multEvt);
        roundEvents.push(multEvt);
      }

      if (overloadRes.isOverloaded) {
        isRoundOverloaded = true;
        this.handleOverload(activePlayer, roundEvents);
      }
    } else {
      // Special Card
      const targetPlayer = targetPlayerId ? this.players.find(p => p.id === targetPlayerId) : undefined;
      const effectRes = this.cardEffectEngine.executeSpecialCard(
        card,
        activePlayer,
        targetPlayer,
        this.players,
        this.hands,
        this.turnManager,
        this.overloadManager,
        this.deckManager
      );

      for (const evt of effectRes.events) {
        this.recordEvent(evt);
        roundEvents.push(evt);
      }

      if (effectRes.overloadResult.isOverloaded) {
        isRoundOverloaded = true;
        this.handleOverload(activePlayer, roundEvents);
      } else if (effectRes.skipTurns > 0) {
        this.turnManager.advanceTurn(this.players, effectRes.skipTurns);
      }
    }

    // Draw replacement card if round is still active
    if (!isRoundOverloaded && !this.winnerPlayerId) {
      const newCard = this.deckManager.drawCard();
      if (newCard) {
        playerHand.push(newCard);
        activePlayer.cardsInHandCount = playerHand.length;
      }

      // Check Time Bomb progression on active player
      if (activePlayer.timeBombTurnsRemaining !== null) {
        activePlayer.timeBombTurnsRemaining -= 1;
        if (activePlayer.timeBombTurnsRemaining <= 0) {
          activePlayer.timeBombTurnsRemaining = null;
          // Bomb explodes!
          const bombEvt: MatchEvent = {
            id: `evt_bomb_${Date.now()}`,
            timestamp: Date.now(),
            type: 'TIME_BOMB_EXPLODED',
            actorPlayerId: activePlayer.id,
            message: `Dark Matter Time Bomb exploded on ${activePlayer.username}!`
          };
          this.recordEvent(bombEvt);
          roundEvents.push(bombEvt);
          this.applyPenalty(activePlayer, roundEvents);
        }
      }

      // Advance turn normally
      this.turnManager.advanceTurn(this.players);
    }

    return {
      success: true,
      events: roundEvents,
      isMatchOver: this.winnerPlayerId !== null,
      winnerPlayerId: this.winnerPlayerId
    };
  }

  private handleOverload(offender: Player, events: MatchEvent[]): void {
    const overloadEvt: MatchEvent = {
      id: `evt_ovl_${Date.now()}`,
      timestamp: Date.now(),
      type: 'OVERLOAD_TRIGGERED',
      actorPlayerId: offender.id,
      message: `NEURAL OVERLOAD DETONATION! Core Total (${this.overloadManager.getCoreTotal()}) exceeded Limit (${this.overloadManager.getOverloadLimit()})!`
    };
    this.recordEvent(overloadEvt);
    events.push(overloadEvt);

    if (offender.hasShield) {
      offender.hasShield = false;
      const shieldEvt: MatchEvent = {
        id: `evt_shld_${Date.now()}`,
        timestamp: Date.now(),
        type: 'SHIELD_ABSORBED',
        actorPlayerId: offender.id,
        message: `${offender.username}'s Plasma Shield absorbed the Overload Detonation!`
      };
      this.recordEvent(shieldEvt);
      events.push(shieldEvt);
    } else {
      this.applyPenalty(offender, events);
    }

    // Check if match is over
    const activeSurvivors = this.getActivePlayers();
    if (activeSurvivors.length <= 1) {
      this.winnerPlayerId = activeSurvivors[0]?.id || offender.id;
      const winEvt: MatchEvent = {
        id: `evt_win_${Date.now()}`,
        timestamp: Date.now(),
        type: 'MATCH_WON',
        actorPlayerId: this.winnerPlayerId,
        message: `VICTORY! ${activeSurvivors[0]?.username || 'Unknown'} is the ultimate Galactic Champion!`
      };
      this.recordEvent(winEvt);
      events.push(winEvt);
    } else {
      // Start next round with new limit and fresh hands
      this.startNewRound(false);
    }
  }

  private applyPenalty(player: Player, events: MatchEvent[]): void {
    player.overloadLevel = Math.min(3, player.overloadLevel + 1) as Player['overloadLevel'];

    const penaltyEvt: MatchEvent = {
      id: `evt_pen_${Date.now()}`,
      timestamp: Date.now(),
      type: 'PLAYER_PENALIZED',
      actorPlayerId: player.id,
      message: `${player.username} reached Overload Level ${player.overloadLevel}!`
    };
    this.recordEvent(penaltyEvt);
    events.push(penaltyEvt);

    if (player.overloadLevel >= GAME_BALANCE.MAX_PENALTIES_BEFORE_ELIMINATION) {
      player.isEliminated = true;
      const elimEvt: MatchEvent = {
        id: `evt_elim_${Date.now()}`,
        timestamp: Date.now(),
        type: 'PLAYER_ELIMINATED',
        actorPlayerId: player.id,
        message: `CRITICAL DETONATION! ${player.username} has been ejected into orbit and eliminated!`
      };
      this.recordEvent(elimEvt);
      events.push(elimEvt);
    }
  }

  public getActivePlayers(): Player[] {
    return this.players.filter(p => !p.isEliminated);
  }

  public getPublicGameState(): GameState {
    return {
      roundNumber: this.roundNumber,
      coreTotal: this.overloadManager.getCoreTotal(),
      overloadLimit: this.overloadManager.getOverloadLimit(),
      turn: this.turnManager.getTurnState(this.players),
      players: this.players,
      activeCardInPlay: this.activeCardInPlay,
      lastEvents: this.recentEvents.slice(-8),
      winnerPlayerId: this.winnerPlayerId
    };
  }

  public getPlayerPrivateView(playerId: string): PlayerPrivateView {
    return {
      gameState: this.getPublicGameState(),
      myHand: this.hands.get(playerId) || [],
      myPlayerId: playerId
    };
  }

  public getPlayerHand(playerId: string): Card[] {
    return this.hands.get(playerId) || [];
  }

  public getAIPlayerDecision(personality?: AIPersonality) {
    const activePlayer = this.turnManager.getActivePlayer(this.players);
    if (!activePlayer || !activePlayer.isAI) return null;

    const hand = this.hands.get(activePlayer.id) || [];
    if (hand.length === 0) return null;

    return AIEngine.decideAction(
      activePlayer,
      hand,
      this.players,
      this.overloadManager.getCoreTotal(),
      this.overloadManager.getOverloadLimit(),
      this.turnManager.getTurnState(this.players).multiplier,
      personality || 'STRATEGIC'
    );
  }

  private recordEvent(event: MatchEvent): void {
    this.recentEvents.push(event);
    if (this.recentEvents.length > 50) {
      this.recentEvents.shift();
    }
  }
}
