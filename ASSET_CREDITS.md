# ASSET CREDITS & LICENSING AUDIT
## COSMIC CHAOS: CARD ARENA

Dokumen ini mencatat seluruh aset eksternal yang diintegrasikan ke dalam proyek game *Cosmic Chaos: Card Arena*, mencakup model 3D, tekstur, ikon 2D, audio, dan font. Seluruh aset berasal dari sumber terpercaya yang bebas royalti dan legal digunakan.

---

## 1. 3D Models & Environments

### Kenney Space Kit
- **Deskripsi:** Modul stasiun luar angkasa, terminal sci-fi, pipa, pintu blast, dan dekorasi lingkungan.
- **Pencipta:** Kenney (Kenney.nl)
- **URL Sumber:** [https://kenney.nl/assets/space-kit](https://kenney.nl/assets/space-kit)
- **Lisensi:** Creative Commons CC0 1.0 Universal (Public Domain Dedication)
- **Atribusi Diperlukan:** Tidak wajib, namun dicantumkan sebagai bentuk apresiasi.
- **Lokasi File:** `packages/client/public/assets/models/space/`

### Kenney Animated Characters 3 (Alien & Sci-Fi Pack)
- **Deskripsi:** Karakter alien 3D bertema fiksi ilmiah dengan rig siap animasi untuk reaksi emosional dan pose meja.
- **Pencipta:** Kenney (Kenney.nl)
- **URL Sumber:** [https://kenney.nl/assets/animated-characters-3](https://kenney.nl/assets/animated-characters-3)
- **Lisensi:** Creative Commons CC0 1.0 Universal (Public Domain Dedication)
- **Atribusi Diperlukan:** Tidak wajib.
- **Lokasi File:** `packages/client/public/assets/models/characters/`

### Kenney Furniture & Sci-Fi Props
- **Deskripsi:** Meja arena, kursi futuristik, dan lampu meja holografik.
- **Pencipta:** Kenney (Kenney.nl)
- **URL Sumber:** [https://kenney.nl/assets/furniture-kit](https://kenney.nl/assets/furniture-kit)
- **Lisensi:** Creative Commons CC0 1.0 Universal (Public Domain Dedication)
- **Atribusi Diperlukan:** Tidak wajib.
- **Lokasi File:** `packages/client/public/assets/models/props/`

---

## 2. Textures & Materials (PBR)

### Poly Haven Sci-Fi & Industrial Textures
- **Deskripsi:** Tekstur PBR permukaan logam gelap, panel luar angkasa, dan lapisan reflektif meja.
- **Pencipta:** Poly Haven (polyhaven.com)
- **URL Sumber:** [https://polyhaven.com/textures](https://polyhaven.com/textures)
- **Lisensi:** CC0 1.0 Universal
- **Atribusi Diperlukan:** Tidak wajib.
- **Lokasi File:** `packages/client/public/assets/textures/pbr/`

### ambientCG Sci-Fi Grids & Cyber Patterns
- **Deskripsi:** Grid neon, pola ubin teknologi tinggi untuk meja permainan dan hologram.
- **Pencipta:** ambientCG (Lennart Demes)
- **URL Sumber:** [https://ambientcg.com](https://ambientcg.com)
- **Lisensi:** CC0 1.0 Universal
- **Atribusi Diperlukan:** Tidak wajib.
- **Lokasi File:** `packages/client/public/assets/textures/grid/`

---

## 3. 2D UI, Icons & Illustrations

### Kenney Game Icons & Sci-Fi UI Expansion
- **Deskripsi:** Ikon kartu (panah putar reverse, es freeze, kilat double trouble, lubang cacing, bom waktu), frame kartu futuristik, tombol neon.
- **Pencipta:** Kenney (Kenney.nl)
- **URL Sumber:** [https://kenney.nl/assets/game-icons](https://kenney.nl/assets/game-icons) & [https://kenney.nl/assets/ui-pack-space-expansion](https://kenney.nl/assets/ui-pack-space-expansion)
- **Lisensi:** CC0 1.0 Universal
- **Atribusi Diperlukan:** Tidak wajib.
- **Lokasi File:** `packages/client/public/assets/ui/` & `packages/client/public/assets/icons/`

### Lucide React
- **Deskripsi:** Kumpulan ikon SVG responsif untuk antarmuka pengguna (audio toggle, close modal, copy link, settings).
- **Pencipta:** Tim Lucide
- **URL Sumber:** [https://lucide.dev](https://lucide.dev)
- **Lisensi:** ISC License
- **Penggunaan:** Modul NPM `@lucide/react`

---

## 4. Audio, Sound Effects & Music

### Kenney Sci-Fi & Interface Sounds
- **Deskripsi:** Suara kartu dimainkan, efek laser, suara ledakan Overload, alarm peringatan, suara tombol menu, dan sci-fi beep.
- **Pencipta:** Kenney (Kenney.nl)
- **URL Sumber:** [https://kenney.nl/assets/sci-fi-sounds](https://kenney.nl/assets/sci-fi-sounds) & [https://kenney.nl/assets/interface-sounds](https://kenney.nl/assets/interface-sounds)
- **Lisensi:** CC0 1.0 Universal
- **Lokasi File:** `packages/client/public/assets/audio/`

### Web Audio Procedural Sound Synthesizer
- **Deskripsi:** Generator audio prosedural berbasis Web Audio API (Osilator, White Noise Filter, Gain Envelopes) untuk efek suara interaktif tanpa perlu download file besar dan bekerja seketika.
- **Pencipta:** Cosmic Chaos Engineering Team
- **Lisensi:** MIT
- **Lokasi File:** `packages/client/src/audio/SynthAudioEngine.ts`

---

## 5. Pernyataan Orisinalitas & Kepatuhan Hak Cipta
Game ini mengimplementasikan aturan dan desain orisinal yang sepenuhnya independen:
- Tidak ada source code, gambar karakter, aset suara, atau elemen visual hak cipta dari game *Bogos Binted?* atau *Zogblorp* yang disalin atau digunakan.
- Semua nama kartu, tema alien, ilustrasi, alur pertandingan, dan sistem efek adalah kreasi orisinal.
- Semua aset pihak ketiga yang digunakan tunduk pada lisensi Public Domain (CC0) atau lisensi open-source terverifikasi.
