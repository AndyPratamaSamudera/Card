# 🌌 COSMIC CHAOS: CARD ARENA
### 3D Realtime Multiplayer Sci-Fi Party Card Game

*Cosmic Chaos: Card Arena* adalah permainan kartu multiplayer online 3D berbasis web browser yang berlatar di kasino stasiun antargalaksi. Pemain mengendalikan karakter alien eksentrik yang saling bertanding di meja holografik, menaikkan total angka inti energi pusat tanpa memicu ledakan **Neural Overload**.

---

## 🎮 Fitur Utama

- **Mode Permainan "Overload Protocol":**
  - Akumulasi kartu angka (+1 hingga +10) menuju Overload Limit acak (28–40).
  - 14 Kartu Spesial Taktis Original (Warp Inversion, Cryo-Stun, Overclock Surge, Antimatter Flush, Quantum Steal, Plasma Shield, Warp Swap, Hyper-Surge, Tachyon Mirror, Core Reboot, Time Bomb, Gravity Crush, Harmonic Equalizer, Glitch Pulse).
- **Sistem Penalti Fisik "Neural Overload":**
  - **Level 0:** Normal, idle sway.
  - **Level 1:** Kepala alien membengkak 1.6x secara kartun.
  - **Level 2:** Karakter bergetar hebat dengan percikan listrik statis.
  - **Level 3 (Detonasi Kritis):** Karakter meledak kartun dan terlontar keluar ke orbit antariksa (Eliminasi).
- **Server-Authoritative Multiplayer (Socket.IO + Fastify):**
  - Bebas kecurangan (*Zero-Knowledge Distribution*): kartu tersembunyi pemain lain tidak pernah dikirim ke browser client.
  - Grace period 30 detik untuk *reconnection* tanpa kehilangan giliran.
  - Tautan undangan instan (`?room=CODE`) langsung dibagikan ke teman.
- **Visual Tabletop 3D (React Three Fiber & Three.js):**
  - Meja judi sci-fi futuristik dengan cincin arah giliran yang berputar secara dinamis.
  - Inti reaktor holografik yang berubah warna dari Cyan (aman) ➔ Kuning/Oranye (peringatan) ➔ Merah membara (bahaya).
  - 4 Spesies Alien 3D Original: Zorblax (Slime Cyclops), Vex (Cyber-Mantis), Blobbo (Puffer Beast), dan Nebula (Star Entity).
- **AI Bot Player Cerdas:**
  - 3 Tingkat kesulitan (Easy, Normal, Hard) dan 4 kepribadian bermain (Aggressive, Defensive, Strategic, Chaotic).
  - Mode "Quick Solo Play vs Bots" langsung bermain tanpa menunggu teman.
- **Audio Synthesizer Prosedural (Web Audio API):**
  - Efek suara sci-fi instan (hover, play card, special burst, alarm bahaya, ledakan detonasi, shield deflect, melodi kemenangan) tanpa membutuhkan unduhan file MP3/WAV besar.

---

## 📂 Struktur Monorepo

```
.
├── package.json
├── tsconfig.json
├── ASSET_CREDITS.md            # Audit lisensi CC0 dan open-source
├── docs/
│   ├── GDD.md                  # Game Design Document detail
│   └── ARCHITECTURE.md         # Spesifikasi arsitektur & anti-cheat
└── packages/
    ├── shared/                 # Tipe TypeScript, Zod Schema, Deck Constants
    ├── server/                 # Fastify, Socket.IO, Match Engine, AI Engine, Unit Tests
    └── client/                 # React 18, Vite, Three.js, R3F, Tailwind CSS UI
```

---

## 🚀 Panduan Menjalankan Game

### 1. Prasyarat
- Node.js versi 18+ atau 20+
- NPM versi 9+ atau 10+

### 2. Instalasi Dependensi
```bash
npm install
```

### 3. Menjalankan Unit & Multiplayer Integration Tests
```bash
npm run test
```
*Menguji logika penjumlahan angka, proteksi overload, penyerapan shield, eliminasi 3 penalti, dan simulasi 2 pemain real-time.*

### 4. Menjalankan Mode Development
Jalankan backend server dan frontend client secara simultan:
```bash
npm run dev
```
- Client Frontend: `http://localhost:3000`
- Server Backend: `http://localhost:4000`

### 5. Build & Menjalankan Mode Produksi
```bash
# Build seluruh workspace
npm run build

# Jalankan server mandiri (otomatis menyajikan frontend statis & WebSocket di port 4000)
npm run start --workspace=packages/server
```
Buka browser di: `http://localhost:4000`

---

## 📜 Lisensi & Atribusi Aset
Seluruh aset 3D, tekstur, ikon, dan audio mematuhi lisensi **Creative Commons CC0 1.0 Universal (Public Domain)** atau open-source MIT/ISC. Rincian lengkap tersedia di file [ASSET_CREDITS.md](file:///home/samudera/Projects/Personal/Ocean_Game/Card/ASSET_CREDITS.md).
