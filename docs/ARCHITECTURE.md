# Arsitektur

```
packages/shared   ← dipakai server DAN browser
  engine/types.ts      MatchState, Action, MatchView
  engine/reducer.ts    createMatch(), applyAction(state, action) → {ok, state} | {ok:false, error}
  engine/rules.ts      legalMoves() — satu-satunya definisi "kartu sah"
  engine/ai.ts         chooseMove() — selalu memilih dari legalMoves()
  engine/runner.ts     MatchRunner: timer roll, gerakan bot, timer giliran
  engine/view.ts       buildView() — apa yang boleh dilihat satu pemain
  protocol/index.ts    nama event socket + schema zod semua payload
packages/server
  app.ts               Fastify + Socket.IO; handler tipis dengan validasi + ack aman
  rooms/RoomManager.ts socket ↔ pemain, buat/gabung/reconnect, timer grace
  rooms/GameRoom.ts    lobby + satu MatchRunner per match
packages/client
  game/session.ts      backend lokal (MatchRunner di browser) atau online (socket)
  store/store.ts       zustand: layar, preferensi, view terakhir
  screens/             Title, Menu, Setup, Online, Lobby, Table (+ overlay)
  ui/                  komponen pixel, sprite dari grid teks
  audio/audio.ts       sfx + sequencer musik chiptune (Web Audio)
```

## Prinsip

1. **Satu sumber kebenaran.** Semua state match ada di `MatchState` milik engine. Room server hanya menyimpan info koneksi. Bot pengganti, keluar, dan kick dijalankan sebagai action engine (`SET_AUTOPILOT`, `REMOVE_PLAYER`).
2. **Reducer murni.** `applyAction` meng-clone state, tidak memakai jam atau `Math.random` (RNG seeded tersimpan di state). Mudah dites dan bisa diputar ulang.
3. **Fase eksplisit.** `TURN → RESOLVING → TURN … → OVER`. Selama `RESOLVING` (animasi roll) semua permainan kartu ditolak. `MatchRunner` mengirim `RESOLVE` setelah `resolveDurationMs()`.
4. **Satu timer per match.** Runner hanya punya satu timer aktif; setiap callback memeriksa ulang `turnSeq`/`resolution.id`, jadi timer basi tidak bisa menyentuh giliran baru.
5. **Tidak bisa macet.** Timeout giliran dan bot memakai `legalMoves()`; aturan Terjebak menjamin selalu ada kartu sah. Simulasi 1.000 match acak di test memastikan setiap match selesai dengan tepat satu pemenang.
6. **Tidak ada kebocoran.** `buildView()` tidak menyertakan deck, state RNG, atau tangan pemain lain. Server mengirim satu `game:view` per pemain dengan `version` naik; client mengabaikan view lama.

## Alur online

```
client ──emit(event, payload, ack)──▶ app.ts handle(): zod.safeParse → RoomManager → GameRoom → MatchRunner.dispatch
                                                                                   │ onChange
client ◀── room:state / game:view (per socket) ◀── GameRoom.broadcastRoom/Game ◀──┘
```

Reconnect: client menyimpan `{code, token}` di localStorage dan mengirim `room:reconnect` setiap kali socket tersambung (termasuk setelah refresh).

## Mode lokal

`game/session.ts` membuat `MatchRunner` yang sama di browser. Hot-seat memakai `manualHumanTimer`: timer giliran baru mulai setelah pemain menekan "Saya Siap" di layar oper perangkat.
