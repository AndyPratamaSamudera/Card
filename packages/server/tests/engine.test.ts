import { describe, it, expect, beforeEach } from 'vitest';
import { MatchEngine } from '../src/engine/MatchEngine.js';
import { DeckManager } from '../src/engine/DeckManager.js';
import { Player } from '@cosmic/shared';

describe('Cosmic Chaos Core Game Engine', () => {
  const dummyPlayers: Player[] = [
    {
      id: 'p1',
      username: 'Zorblax',
      avatarId: 'alien_zorblax',
      seatIndex: 0,
      isReady: true,
      isHost: true,
      isAI: false,
      isConnected: true,
      overloadLevel: 0,
      hasShield: false,
      timeBombTurnsRemaining: null,
      isGlitchScrambled: false,
      isEliminated: false,
      cardsInHandCount: 5
    },
    {
      id: 'p2',
      username: 'VexBot',
      avatarId: 'alien_vex',
      seatIndex: 1,
      isReady: true,
      isHost: false,
      isAI: true,
      aiDifficulty: 'NORMAL',
      isConnected: true,
      overloadLevel: 0,
      hasShield: false,
      timeBombTurnsRemaining: null,
      isGlitchScrambled: false,
      isEliminated: false,
      cardsInHandCount: 5
    }
  ];

  it('DeckManager deals 5 cards to each player and builds standard deck', () => {
    const deck = new DeckManager();
    const hands = deck.dealInitialHands(['p1', 'p2'], 5);
    expect(hands.get('p1')?.length).toBe(5);
    expect(hands.get('p2')?.length).toBe(5);
    expect(deck.getDrawPileCount()).toBe(54 - 10);
  });

  it('MatchEngine initializes match, deals hands and establishes turn state', () => {
    const match = new MatchEngine('m_1', dummyPlayers);
    const state = match.getPublicGameState();

    expect(state.roundNumber).toBe(1);
    expect(state.coreTotal).toBe(0);
    expect(state.overloadLimit).toBeGreaterThanOrEqual(28);
    expect(state.turn.activePlayerId).toBe('p1');
    expect(match.getPlayerHand('p1').length).toBe(5);
    expect(match.getPlayerHand('p2').length).toBe(5);
  });

  it('Playing a valid number card adds to Core Total and advances turn', () => {
    const match = new MatchEngine('m_2', dummyPlayers);
    const p1Hand = match.getPlayerHand('p1');
    const numberCard = p1Hand.find(c => c.type === 'NUMBER');

    if (numberCard) {
      const initialTotal = match.getPublicGameState().coreTotal;
      const res = match.playCard('p1', numberCard.id);

      expect(res.success).toBe(true);
      const newState = match.getPublicGameState();
      expect(newState.coreTotal).toBe(initialTotal + numberCard.value);
      // Turn advances to p2
      expect(newState.turn.activePlayerId).toBe('p2');
    }
  });

  it('Rejects playing out of turn', () => {
    const match = new MatchEngine('m_3', dummyPlayers);
    const p2Hand = match.getPlayerHand('p2');
    const res = match.playCard('p2', p2Hand[0].id);

    expect(res.success).toBe(false);
    expect(res.error).toBe('Not your turn');
  });

  it('Triggering Overload increments penalty level', () => {
    const match = new MatchEngine('m_4', dummyPlayers);
    const p1Hand = match.getPlayerHand('p1');

    // Force inject a massive number card to guarantee overload
    p1Hand.push({
      id: 'num_bomb_test',
      type: 'NUMBER',
      value: 100,
      name: 'Test Bomb',
      description: 'Massive overflow',
      glowColor: '#ff0000'
    });

    const res = match.playCard('p1', 'num_bomb_test');
    expect(res.success).toBe(true);

    const events = res.events.map(e => e.type);
    expect(events).toContain('OVERLOAD_TRIGGERED');
    expect(events).toContain('PLAYER_PENALIZED');

    const state = match.getPublicGameState();
    const p1 = state.players.find(p => p.id === 'p1');
    expect(p1?.overloadLevel).toBe(1);
  });

  it('Plasma Shield absorbs overload detonation', () => {
    const match = new MatchEngine('m_5', dummyPlayers);
    const p1Hand = match.getPlayerHand('p1');

    // Give p1 a shield
    const state = match.getPublicGameState();
    const p1 = state.players.find(p => p.id === 'p1')!;
    p1.hasShield = true;

    // Force overload
    p1Hand.push({
      id: 'num_shield_test',
      type: 'NUMBER',
      value: 100,
      name: 'Test Bomb',
      description: 'Massive overflow',
      glowColor: '#ff0000'
    });

    const res = match.playCard('p1', 'num_shield_test');
    expect(res.success).toBe(true);

    const events = res.events.map(e => e.type);
    expect(events).toContain('SHIELD_ABSORBED');
    expect(p1.overloadLevel).toBe(0); // Protected!
    expect(p1.hasShield).toBe(false); // Shield consumed
  });

  it('Eliminates player upon reaching 3 penalties and crowns winner', () => {
    const match = new MatchEngine('m_6', dummyPlayers);
    const state = match.getPublicGameState();
    const p1 = state.players.find(p => p.id === 'p1')!;
    p1.overloadLevel = 2; // Pre-set to 2 penalties

    const p1Hand = match.getPlayerHand('p1');
    p1Hand.push({
      id: 'num_final_strike',
      type: 'NUMBER',
      value: 100,
      name: 'Fatal Strike',
      description: 'Fatal overload',
      glowColor: '#ff0000'
    });

    const res = match.playCard('p1', 'num_final_strike');
    expect(res.success).toBe(true);
    expect(res.isMatchOver).toBe(true);
    expect(res.winnerPlayerId).toBe('p2');
    expect(p1.isEliminated).toBe(true);
  });

  it('AI generates a valid decision without errors', () => {
    const match = new MatchEngine('m_7', dummyPlayers);
    const decision = match.getAIPlayerDecision();
    // Initially p1 is human and active, so null is expected
    expect(decision).toBeNull();

    // Advance to p2 (AI)
    const p1Hand = match.getPlayerHand('p1');
    match.playCard('p1', p1Hand[0].id);

    // Now p2 is active AI
    const aiDecision = match.getAIPlayerDecision();
    expect(aiDecision).not.toBeNull();
    expect(aiDecision?.cardId).toBeDefined();
  });
});
