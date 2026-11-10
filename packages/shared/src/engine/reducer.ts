import type {
  Action,
  ActionResult,
  Card,
  LogTone,
  MatchSettings,
  MatchState,
  PlayerSeed,
  Resolution,
  RollResult,
} from './types.js';
import { buildDeck, cardInfo, MINUS_AMOUNT } from './cards.js';
import { createRng, shuffle, type Rng } from './rng.js';
import { activePlayer, alivePlayers, legalMoves, restrictionError, stepFrom } from './rules.js';
import { chooseMove } from './ai.js';
import { MAX_PLAYERS, MIN_PLAYERS } from './settings.js';

const LOG_LIMIT = 40;

// ─── Setup ──────────────────────────────────────────────────────────────────
export function createMatch(seeds: PlayerSeed[], settings: MatchSettings, seed: number): MatchState {
  if (seeds.length < MIN_PLAYERS || seeds.length > MAX_PLAYERS) {
    throw new Error(`Jumlah pemain harus ${MIN_PLAYERS}-${MAX_PLAYERS}`);
  }
  const rng = createRng(seed);
  const deck = shuffle(buildDeck(), rng);
  const hands: Record<string, Card[]> = {};
  for (const p of seeds) hands[p.id] = deck.splice(0, settings.handSize);

  const state: MatchState = {
    settings: { ...settings },
    players: seeds.map((p) => ({ ...p, autopilot: false, eliminated: false, left: false })),
    hands,
    deck,
    discard: [],
    total: 0,
    direction: 1,
    activeIndex: rng.int(0, seeds.length - 1),
    restriction: null,
    phase: 'TURN',
    lastPlay: null,
    resolution: null,
    winnerId: null,
    log: [],
    turnSeq: 1,
    seq: 0,
    rngState: rng.state,
  };
  log(state, 'info', `Match dimulai! Batas overload ${settings.overloadLimit}. ${nameOf(state, state.players[state.activeIndex].id)} jalan duluan.`);
  return state;
}

// ─── Reducer ────────────────────────────────────────────────────────────────
export function applyAction(prev: MatchState, action: Action): ActionResult {
  if (prev.phase === 'OVER' && action.type !== 'SET_AUTOPILOT' && action.type !== 'REMOVE_PLAYER') {
    return { ok: false, error: 'Match sudah selesai.' };
  }
  const state = structuredClone(prev);
  const rng = createRng(state.rngState);
  const error = run(state, action, rng);
  if (error) return { ok: false, error };
  state.rngState = rng.state;
  return { ok: true, state };
}

function run(state: MatchState, action: Action, rng: Rng): string | null {
  switch (action.type) {
    case 'PLAY':
      return play(state, action.playerId, action.cardId, rng);
    case 'PASS': {
      const p = activePlayer(state);
      if (state.phase !== 'TURN' || !p || p.id !== action.playerId) return 'Bukan giliranmu!';
      if ((state.hands[p.id] ?? []).length > 0) return 'Kamu masih punya kartu.';
      state.restriction = null;
      log(state, 'info', `${p.name} tidak punya kartu dan melewati giliran.`);
      startTurn(state, stepFrom(state, state.activeIndex, 1));
      return null;
    }
    case 'RESOLVE':
      return resolve(state);
    case 'TIMEOUT': {
      if (state.phase !== 'TURN' || action.turnSeq !== state.turnSeq) return 'Timer kedaluwarsa.';
      const p = activePlayer(state);
      if (!p) return 'Tidak ada pemain aktif.';
      const cardId = chooseMove(state, p.id, 'NORMAL', () => rng.next());
      log(state, 'info', `Waktu ${p.name} habis! Kartu dimainkan otomatis.`);
      if (!cardId) return run(state, { type: 'PASS', playerId: p.id }, rng);
      return play(state, p.id, cardId, rng);
    }
    case 'SET_AUTOPILOT': {
      const p = state.players.find((x) => x.id === action.playerId);
      if (!p) return 'Pemain tidak ditemukan.';
      if (p.autopilot === action.on) return null;
      p.autopilot = action.on;
      if (state.phase !== 'OVER' && !p.eliminated) {
        log(state, 'info', action.on ? `${p.name} terputus — bot mengambil alih.` : `${p.name} kembali bermain!`);
      }
      return null;
    }
    case 'REMOVE_PLAYER':
      return removePlayer(state, action.playerId);
  }
}

function play(state: MatchState, playerId: string, cardId: string, rng: Rng): string | null {
  const p = activePlayer(state);
  if (state.phase === 'RESOLVING') return 'Tunggu hasil roll dulu!';
  if (state.phase !== 'TURN' || !p || p.id !== playerId) return 'Bukan giliranmu!';
  const hand = state.hands[playerId] ?? [];
  const idx = hand.findIndex((c) => c.id === cardId);
  if (idx === -1) return 'Kartu tidak ada di tanganmu.';

  const { cardIds, trapped } = legalMoves(state, playerId);
  if (!cardIds.includes(cardId)) return restrictionError(state.restriction);

  const [card] = hand.splice(idx, 1);
  state.discard.push(card);
  state.restriction = null;
  state.seq++;
  state.lastPlay = { seq: state.seq, playerId, card, trapped };
  const info = cardInfo(card, state.settings.overloadLimit);
  const limit = state.settings.overloadLimit;

  draw(state, playerId, rng);

  if (trapped) {
    log(state, 'danger', `${p.name} TERJEBAK! ${info.title} hangus dan wajib roll nasib.`);
    beginResolution(state, 'TRAPPED', playerId, [rollFor(state, playerId, rng)]);
    return null;
  }

  if (card.kind === 'NUMBER') {
    state.total += card.value;
    if (state.total > limit) {
      log(state, 'danger', `${p.name} main +${card.value} → ${state.total}/${limit}. OVERLOAD!`);
      beginResolution(state, 'OVERLOAD', playerId, [rollFor(state, playerId, rng)]);
    } else {
      log(state, 'play', `${p.name} main +${card.value} → ${state.total}/${limit}`);
      startTurn(state, stepFrom(state, state.activeIndex, 1));
    }
    return null;
  }

  switch (card.special) {
    case 'DEATH': {
      log(state, 'danger', `${p.name} memainkan DEATH! Semua pemain roll nasib!`);
      const rolls = alivePlayers(state).map((x) => rollFor(state, x.id, rng));
      if (rolls.every((r) => !r.survived)) {
        const own = rolls.find((r) => r.playerId === playerId);
        if (own) own.spared = true;
      }
      beginResolution(state, 'DEATH', playerId, rolls);
      return null;
    }
    case 'ROLEBACK':
      state.direction = state.direction === 1 ? -1 : 1;
      log(state, 'special', `${p.name} main ROLEBACK! Arah giliran berbalik.`);
      startTurn(state, stepFrom(state, state.activeIndex, 1));
      state.restriction = { kind: 'NO_ROLEBACK' };
      return null;
    case 'GREATER_THAN': {
      const min = card.threshold ?? 1;
      const next = stepFrom(state, state.activeIndex, 1);
      log(state, 'special', `${p.name} main >${min}! ${state.players[next].name} wajib main angka lebih dari ${min}.`);
      startTurn(state, next);
      state.restriction = { kind: 'GREATER_THAN', min };
      return null;
    }
    case 'SKIP': {
      const alive = alivePlayers(state).length;
      const skipped = stepFrom(state, state.activeIndex, 1);
      if (alive > 2) {
        log(state, 'special', `${p.name} main SKIP! Giliran ${state.players[skipped].name} dilewati.`);
        startTurn(state, stepFrom(state, state.activeIndex, 2));
      } else {
        log(state, 'special', `${p.name} main SKIP! (2 pemain — giliran tetap pindah)`);
        startTurn(state, skipped);
      }
      return null;
    }
    case 'RESET_ZERO':
      state.total = 0;
      log(state, 'good', `${p.name} main RESET! Total kembali 0.`);
      break;
    case 'SET_LIMIT':
      state.total = limit;
      log(state, 'danger', `${p.name} main =${limit}! Total langsung ${limit}.`);
      break;
    case 'MINUS_5':
      state.total = Math.max(0, state.total - MINUS_AMOUNT);
      log(state, 'good', `${p.name} main -${MINUS_AMOUNT}! Total jadi ${state.total}.`);
      break;
  }
  startTurn(state, stepFrom(state, state.activeIndex, 1));
  return null;
}

function rollFor(state: MatchState, playerId: string, rng: Rng): RollResult {
  const roll = rng.int(1, 100);
  return { playerId, roll, survived: roll <= state.settings.surviveChance };
}

function beginResolution(state: MatchState, kind: Resolution['kind'], actorId: string, rolls: RollResult[]) {
  state.seq++;
  state.phase = 'RESOLVING';
  state.resolution = { id: state.seq, kind, actorId, total: state.total, rolls };
}

function resolve(state: MatchState): string | null {
  if (state.phase !== 'RESOLVING' || !state.resolution) return 'Tidak ada roll yang menunggu.';
  const res = state.resolution;
  const chance = state.settings.surviveChance;
  for (const r of res.rolls) {
    const p = state.players.find((x) => x.id === r.playerId);
    if (!p || p.eliminated) continue;
    if (r.survived) {
      log(state, 'good', `${p.name} SELAMAT (roll ${r.roll} ≤ ${chance})`);
    } else if (r.spared) {
      log(state, 'good', `Semua gagal! ${p.name} sebagai pemilik DEATH diselamatkan (roll ${r.roll}).`);
    } else {
      log(state, 'danger', `${p.name} GUGUR (roll ${r.roll} > ${chance})`);
      eliminate(state, p.id);
    }
  }
  state.total = 0;
  state.resolution = null;
  if (checkWinner(state, res.actorId)) return null;
  const actorIdx = state.players.findIndex((x) => x.id === res.actorId);
  startTurn(state, stepFrom(state, actorIdx, 1));
  return null;
}

function removePlayer(state: MatchState, playerId: string): string | null {
  const p = state.players.find((x) => x.id === playerId);
  if (!p) return 'Pemain tidak ditemukan.';
  if (p.left) return null;
  p.left = true;
  if (state.phase === 'OVER' || p.eliminated) return null;
  const wasActive = state.phase === 'TURN' && state.players[state.activeIndex]?.id === playerId;
  log(state, 'danger', `${p.name} keluar dari match.`);
  eliminate(state, playerId);
  if (state.phase === 'RESOLVING') {
    // Resolve will skip the removed player; only end now if nobody is left to play.
    if (alivePlayers(state).length <= 1) {
      state.resolution = null;
      checkWinner(state, null);
    }
    return null;
  }
  if (checkWinner(state, null)) return null;
  if (wasActive) {
    state.restriction = null;
    startTurn(state, stepFrom(state, state.activeIndex, 1));
  }
  return null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function eliminate(state: MatchState, playerId: string) {
  const p = state.players.find((x) => x.id === playerId);
  if (!p) return;
  p.eliminated = true;
  state.discard.push(...(state.hands[playerId] ?? []));
  state.hands[playerId] = [];
}

function checkWinner(state: MatchState, fallbackId: string | null): boolean {
  const alive = alivePlayers(state);
  if (alive.length > 1) return false;
  state.phase = 'OVER';
  state.restriction = null;
  state.winnerId = alive[0]?.id ?? fallbackId;
  if (state.winnerId) log(state, 'win', `${nameOf(state, state.winnerId)} MENANG!`);
  return true;
}

function startTurn(state: MatchState, index: number) {
  state.activeIndex = index;
  state.phase = 'TURN';
  state.turnSeq++;
}

function draw(state: MatchState, playerId: string, rng: Rng) {
  if (state.deck.length === 0) {
    if (state.discard.length === 0) return;
    state.deck = shuffle(state.discard, rng);
    state.discard = [];
    log(state, 'info', 'Deck habis — tumpukan buangan dikocok ulang.');
  }
  const card = state.deck.pop();
  if (card) state.hands[playerId].push(card);
}

function log(state: MatchState, tone: LogTone, text: string) {
  state.seq++;
  state.log.push({ id: state.seq, tone, text });
  if (state.log.length > LOG_LIMIT) state.log.splice(0, state.log.length - LOG_LIMIT);
}

function nameOf(state: MatchState, id: string) {
  return state.players.find((p) => p.id === id)?.name ?? '???';
}

/** How long clients animate a resolution before the runner fires RESOLVE. */
export function resolveDurationMs(res: Resolution | null): number {
  if (!res) return 0;
  if (res.kind === 'DEATH') return 2200 + 900 * res.rolls.length;
  return 3200;
}
