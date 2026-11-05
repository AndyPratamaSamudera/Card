# SYSTEM ARCHITECTURE SPECIFICATION
# COSMIC CHAOS: CARD ARENA

## 1. Architecture Paradigm
- **Pattern:** Strict Server-Authoritative Architecture.
- **Protocol:** WebSocket via Socket.IO with bi-directional typed events.
- **Client Render Engine:** Three.js / React Three Fiber + Tailwind CSS HTML HUD.
- **Backend Runtime:** Node.js + Fastify + TypeScript.
- **Database:** PostgreSQL (with Drizzle ORM).

---

## 2. Security & Anti-Cheat Guarantees
1. **Server Validation:** All card plays, turn timers, score totals, and penalties are calculated exclusively on the server.
2. **Hidden Hand Protection:** The server sanitizes the broadcast state so that a client only receives the cards in their own hand. Other players' hands are represented solely as an integer count (`cardCount`).
3. **Turn Enforcement:** If a client emits a `game:play_card` event outside their active turn or for a card not present in their validated server hand, the server rejects the action with error payload `NOT_YOUR_TURN` or `INVALID_CARD`.
4. **Idempotent Actions & Nonce:** Every play request contains a monotonic event id / nonce to eliminate duplicate packets from high-latency connections.

---

## 3. Disconnection & Reconnection Strategy
- When a socket disconnects, the server marks the player as `DISCONNECTED` and starts a 30-second grace timer.
- Other players see a disconnected indicator next to the player's avatar.
- If the player reconnects with their valid `sessionToken` within 30 seconds, the server re-binds their socket and dispatches a full `game:reconnect_success` state snapshot.
- If the 30-second timer expires, the server smoothly substitutes a bot AI to play the turn so the match flow is never blocked.

---

## 4. Scalability & Deployment
- Fastify provides ultra-low HTTP overhead.
- Socket.IO rooms isolate network broadcast traffic per game room code (`room:<code>`).
- Fully compatible with Nginx / Apache 2 reverse proxies (`Upgrade: websocket` headers).
