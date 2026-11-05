# GAME DESIGN DOCUMENT (GDD)
# COSMIC CHAOS: CARD ARENA

## 1. Executive Summary
- **Game Title:** Cosmic Chaos: Card Arena
- **Platform:** Modern Web Browsers (Desktop & Mobile, WebGL, WebSocket)
- **Engine/Stack:** React, Three.js / React Three Fiber, Fastify, Socket.IO, PostgreSQL, TypeScript
- **Target Audience:** Casual party game lovers, sci-fi humor fans, competitive card players (Ages 10+)
- **Session Duration:** 5 – 15 minutes per match
- **Monetization / Distribution:** Free-to-play, zero installation, link-based instant play

---

## 2. Core Game Loop
1. **Lobby & Match Start:**
   - 2 to 8 players join via Room Code or direct URL.
   - Host configures match settings (Default: 15s turn timer, base Overload limit 30-40, 3 penalty strikes).
   - Seats assigned in circle around the Cosmic Holographic Table.
2. **Round Setup:**
   - Server initializes standard 54-card deck (40 Number cards, 14 Special cards).
   - 5 cards dealt privately to each player.
   - Central Core resets to 0. Overload Limit dynamically calibrated.
   - Play direction begins Clockwise.
3. **Turn Progression:**
   - Active player selects 1 valid card from their hand.
   - Number Card: Added directly to Current Core Total.
   - Special Card: Triggers immediate tactical effect (Reversals, Freezes, Core Drains, Steals, Bombs).
   - Turn advances to next player based on table direction and active status.
4. **Overload Event (Neural Overload):**
   - If a played card causes `Current Core Total > Overload Limit`:
   - Offending player triggers **Neural Overload**.
   - Character receives +1 Overload Level (accompanied by comical 3D deformation animations):
     - Level 1: Swollen Head / Bulging eyes.
     - Level 2: Violent cartoon vibration + spark particles.
     - Level 3: Detonation & Ejection to orbit!
5. **Round Reset & Elimination:**
   - If player survives (< 3 penalties), new round begins.
   - If player reaches 3 penalties, they are eliminated and convert to Spectator.
   - Match ends when only 1 surviving player remains.
   - Final results screen celebrates the winner with podium and match statistics.

---

## 3. Deck Composition & Card Balance

### A. Number Cards (40 Cards)
- **+1** (5 cards): Essential endgame survivability tools.
- **+2** (5 cards): Safe stepping stone.
- **+3** (5 cards): Standard pacing.
- **+4** (4 cards): Moderate push.
- **+5** (4 cards): Baiting card.
- **+6** (4 cards): Shifting into warning zone.
- **+7** (4 cards): High pressure play.
- **+8** (3 cards): Heavy bomb.
- **+9** (3 cards): High-risk aggressive push.
- **+10** (3 cards): Maximum acceleration bomb.

### B. Special Cards (14 Unique Cards)
1. **Warp Inversion (Reverse)**: Inverts play direction (CW <-> CCW).
2. **Cryo-Stun (Freeze)**: Skips the next player in line.
3. **Overclock Surge (Double Trouble)**: Multiplies the next number card's value by 2x.
4. **Antimatter Flush (Zero-G Vent)**: Lowers Core Total by 5 points (floor = 0).
5. **Pocket Wormhole (Quantum Steal)**: Steal 1 random card from a chosen opponent.
6. **Plasma Shield (Cosmic Aegis)**: Shields against 1 targeted sabotage or prevents 1 overload strike.
7. **Warp Swap (Chaos Matrix)**: Swap 2 random cards with a chosen opponent.
8. **Hyper-Surge (Solar Flare)**: Adds +15 to Core Total instantly, grants an immediate extra turn.
9. **Tachyon Mirror (Deflection Field)**: Redirects negative targeted effects to another opponent.
10. **System Hard-Reset (Core Reboot)**: Resets Core Total to 0, permanently lowers Overload Limit by 5 for the round.
11. **Dark Matter Infusion (Time Bomb)**: Places a 3-turn ticking bomb on a target; triggers penalty if Core does not overload before detonation.
12. **Gravity Crush (Graviton Sabotage)**: Target opponent discards their highest number card and draws a replacement.
13. **Harmonic Resonance (Equalizer)**: Snaps Core Total directly to 50% of the Overload Limit.
14. **EMP Shockwave (Glitch Pulse)**: Scrambles visible card values of the next 2 players until played.

---

## 4. Characters & Visual Presentation
Four distinct alien species represented in low-poly sci-fi aesthetic:
1. **Zorblax the Glutton:** Green gelatinous one-eyed creature whose body jiggles comically.
2. **Vex the Cyber-Mantis:** Sleek purple android alien with antenna twitching.
3. **Blobbo the Puffer:** Orange spherical alien that expands drastically on overload.
4. **Nebula the Cosmic Witch:** Blue floating entity with starry particle hair.
