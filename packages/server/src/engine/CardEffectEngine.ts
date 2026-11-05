import {
  SpecialCard,
  Player,
  Card,
  NumberCard,
  MatchEvent,
  GAME_BALANCE
} from '@cosmic/shared';
import { TurnManager } from './TurnManager.js';
import { OverloadManager, OverloadCheckResult } from './OverloadManager.js';
import { DeckManager } from './DeckManager.js';

export interface EffectExecutionResult {
  events: MatchEvent[];
  skipTurns: number;
  overloadResult: OverloadCheckResult;
}

export class CardEffectEngine {
  public executeSpecialCard(
    card: SpecialCard,
    actor: Player,
    target: Player | undefined,
    players: Player[],
    hands: Map<string, Card[]>,
    turnManager: TurnManager,
    overloadManager: OverloadManager,
    deckManager: DeckManager
  ): EffectExecutionResult {
    const events: MatchEvent[] = [];
    let skipTurns = 0;
    const now = Date.now();

    const createEvent = (
      type: MatchEvent['type'],
      message: string,
      targetId?: string,
      payload?: Record<string, unknown>
    ): MatchEvent => ({
      id: `evt_${now}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: now,
      type,
      actorPlayerId: actor.id,
      targetPlayerId: targetId,
      specialId: card.specialId,
      cardName: card.name,
      message,
      payload
    });

    switch (card.specialId) {
      case 'WARP_INVERSION': {
        const newDir = turnManager.reverseDirection();
        events.push(
          createEvent(
            'SPECIAL_EFFECT_TRIGGERED',
            `${actor.username} reversed turn order to ${newDir}!`,
            undefined,
            { newDirection: newDir }
          )
        );
        break;
      }

      case 'CRYO_STUN': {
        skipTurns = 1;
        const nextPlayer = turnManager.getNextPlayer(players, 1);
        events.push(
          createEvent(
            'SPECIAL_EFFECT_TRIGGERED',
            `${actor.username} used Cryo-Stun! ${nextPlayer ? nextPlayer.username : 'Next player'} is frozen and will be skipped!`,
            nextPlayer?.id
          )
        );
        break;
      }

      case 'OVERCLOCK_SURGE': {
        turnManager.setMultiplier(2);
        events.push(
          createEvent(
            'SPECIAL_EFFECT_TRIGGERED',
            `${actor.username} triggered Overclock Surge! The next number card played will be multiplied by 2x!`,
            undefined,
            { multiplier: 2 }
          )
        );
        break;
      }

      case 'ANTIMATTER_FLUSH': {
        overloadManager.reduceValue(GAME_BALANCE.ANTIMATTER_FLUSH_AMOUNT);
        events.push(
          createEvent(
            'SPECIAL_EFFECT_TRIGGERED',
            `${actor.username} flushed antimatter! Core Total decreased by -${GAME_BALANCE.ANTIMATTER_FLUSH_AMOUNT} (Now: ${overloadManager.getCoreTotal()}).`,
            undefined,
            { newTotal: overloadManager.getCoreTotal() }
          )
        );
        break;
      }

      case 'QUANTUM_STEAL': {
        if (target && target.id !== actor.id) {
          // Check if target has Plasma Shield
          if (target.hasShield) {
            target.hasShield = false;
            events.push(
              createEvent(
                'SHIELD_ABSORBED',
                `${target.username}'s Plasma Shield absorbed ${actor.username}'s Quantum Steal!`,
                target.id
              )
            );
          } else {
            const targetHand = hands.get(target.id) || [];
            if (targetHand.length > 0) {
              const stealIdx = Math.floor(Math.random() * targetHand.length);
              const stolenCard = targetHand.splice(stealIdx, 1)[0];
              const actorHand = hands.get(actor.id) || [];
              actorHand.push(stolenCard);
              target.cardsInHandCount = targetHand.length;
              actor.cardsInHandCount = actorHand.length;

              events.push(
                createEvent(
                  'SPECIAL_EFFECT_TRIGGERED',
                  `${actor.username} opened a wormhole and stole a card from ${target.username}!`,
                  target.id
                )
              );
            } else {
              events.push(
                createEvent(
                  'SPECIAL_EFFECT_TRIGGERED',
                  `${actor.username} tried to steal from ${target.username}, but their hand was empty!`,
                  target.id
                )
              );
            }
          }
        }
        break;
      }

      case 'PLASMA_SHIELD': {
        actor.hasShield = true;
        events.push(
          createEvent(
            'SPECIAL_EFFECT_TRIGGERED',
            `${actor.username} activated Plasma Shield forcefield! Protected from the next negative effect or overload penalty.`,
            actor.id
          )
        );
        break;
      }

      case 'WARP_SWAP': {
        if (target && target.id !== actor.id) {
          if (target.hasShield) {
            target.hasShield = false;
            events.push(
              createEvent(
                'SHIELD_ABSORBED',
                `${target.username}'s Plasma Shield absorbed ${actor.username}'s Warp Swap!`,
                target.id
              )
            );
          } else {
            const actorHand = hands.get(actor.id) || [];
            const targetHand = hands.get(target.id) || [];
            const swapCount = Math.min(2, Math.min(actorHand.length, targetHand.length));

            if (swapCount > 0) {
              const actorCardsToSwap: Card[] = [];
              const targetCardsToSwap: Card[] = [];

              for (let i = 0; i < swapCount; i++) {
                const aIdx = Math.floor(Math.random() * actorHand.length);
                actorCardsToSwap.push(actorHand.splice(aIdx, 1)[0]);
                const tIdx = Math.floor(Math.random() * targetHand.length);
                targetCardsToSwap.push(targetHand.splice(tIdx, 1)[0]);
              }

              actorHand.push(...targetCardsToSwap);
              targetHand.push(...actorCardsToSwap);

              actor.cardsInHandCount = actorHand.length;
              target.cardsInHandCount = targetHand.length;

              events.push(
                createEvent(
                  'SPECIAL_EFFECT_TRIGGERED',
                  `${actor.username} triggered Warp Swap! Swapped ${swapCount} cards with ${target.username}!`,
                  target.id,
                  { count: swapCount }
                )
              );
            }
          }
        }
        break;
      }

      case 'HYPER_SURGE': {
        // Adds +15 to core and gives extra turn
        const overloadRes = overloadManager.addValue(GAME_BALANCE.HYPER_SURGE_AMOUNT);
        turnManager.grantExtraTurn(actor.id);
        events.push(
          createEvent(
            'SPECIAL_EFFECT_TRIGGERED',
            `${actor.username} triggered Hyper-Surge (+${GAME_BALANCE.HYPER_SURGE_AMOUNT} Core Total)! Granted an immediate extra turn!`,
            actor.id,
            { newTotal: overloadRes.coreTotal }
          )
        );
        return {
          events,
          skipTurns,
          overloadResult: overloadRes
        };
      }

      case 'TACHYON_MIRROR': {
        // Preemptive defensive stance
        actor.hasShield = true;
        events.push(
          createEvent(
            'SPECIAL_EFFECT_TRIGGERED',
            `${actor.username} aligned the Tachyon Mirror! Any incoming sabotage will be deflected!`,
            actor.id
          )
        );
        break;
      }

      case 'CORE_REBOOT': {
        overloadManager.setCoreTotal(0);
        overloadManager.reduceOverloadLimit(GAME_BALANCE.CORE_REBOOT_LIMIT_PENALTY);
        events.push(
          createEvent(
            'SPECIAL_EFFECT_TRIGGERED',
            `${actor.username} executed System Hard-Reset! Core rebooted to 0. Overload Limit lowered by -${GAME_BALANCE.CORE_REBOOT_LIMIT_PENALTY} (Now: ${overloadManager.getOverloadLimit()}).`,
            undefined,
            { newTotal: 0, newLimit: overloadManager.getOverloadLimit() }
          )
        );
        break;
      }

      case 'TIME_BOMB': {
        if (target && target.id !== actor.id) {
          if (target.hasShield) {
            target.hasShield = false;
            events.push(
              createEvent(
                'SHIELD_ABSORBED',
                `${target.username}'s Plasma Shield absorbed the Time Bomb!`,
                target.id
              )
            );
          } else {
            target.timeBombTurnsRemaining = GAME_BALANCE.TIME_BOMB_FUSE_TURNS;
            events.push(
              createEvent(
                'SPECIAL_EFFECT_TRIGGERED',
                `${actor.username} attached a Dark Matter Time Bomb to ${target.username}! (3 turns to detonation)`,
                target.id
              )
            );
          }
        }
        break;
      }

      case 'GRAVITY_CRUSH': {
        if (target && target.id !== actor.id) {
          if (target.hasShield) {
            target.hasShield = false;
            events.push(
              createEvent(
                'SHIELD_ABSORBED',
                `${target.username}'s Plasma Shield deflected Gravity Crush!`,
                target.id
              )
            );
          } else {
            const targetHand = hands.get(target.id) || [];
            // Find highest number card
            let highestIdx = -1;
            let highestVal = -1;
            targetHand.forEach((c, idx) => {
              if (c.type === 'NUMBER' && c.value > highestVal) {
                highestVal = c.value;
                highestIdx = idx;
              }
            });

            if (highestIdx !== -1) {
              const crushedCard = targetHand.splice(highestIdx, 1)[0];
              deckManager.discard(crushedCard);
              // Draw replacement
              const replacement = deckManager.drawCard();
              if (replacement) {
                targetHand.push(replacement);
              }
              target.cardsInHandCount = targetHand.length;

              events.push(
                createEvent(
                  'SPECIAL_EFFECT_TRIGGERED',
                  `${actor.username} crushed ${target.username}'s highest card (${crushedCard.name}) with localized gravity! Replacement drawn.`,
                  target.id
                )
              );
            } else {
              events.push(
                createEvent(
                  'SPECIAL_EFFECT_TRIGGERED',
                  `${actor.username} targeted ${target.username} with Gravity Crush, but they had no number cards!`,
                  target.id
                )
              );
            }
          }
        }
        break;
      }

      case 'HARMONIC_EQUALIZER': {
        const halfLimit = Math.floor(overloadManager.getOverloadLimit() / 2);
        overloadManager.setCoreTotal(halfLimit);
        events.push(
          createEvent(
            'SPECIAL_EFFECT_TRIGGERED',
            `${actor.username} played Harmonic Equalizer! Core Total snapped to exactly 50% (${halfLimit}).`,
            undefined,
            { newTotal: halfLimit }
          )
        );
        break;
      }

      case 'GLITCH_PULSE': {
        // Scramble the next 2 players
        const next1 = turnManager.getNextPlayer(players, 1);
        const next2 = turnManager.getNextPlayer(players, 2);
        if (next1) next1.isGlitchScrambled = true;
        if (next2) next2.isGlitchScrambled = true;

        events.push(
          createEvent(
            'SPECIAL_EFFECT_TRIGGERED',
            `${actor.username} released an EMP Glitch Pulse! The displays of upcoming players are scrambled with static!`,
            undefined
          )
        );
        break;
      }
    }

    return {
      events,
      skipTurns,
      overloadResult: overloadManager.checkOverload()
    };
  }
}
