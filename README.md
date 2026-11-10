# OVERLOAD 21

Game kartu arcade retro (pixel art, tema neon) untuk 2–8 pemain. Mainkan kartu, jaga total meja tetap di bawah batas — kalau tembus, roll nasibmu!

- **Lawan Bot** — offline, jalan sepenuhnya di browser
- **Hot-Seat** — beberapa orang bergantian di satu perangkat
- **Online** — buat/gabung room dengan kode 4 karakter

Semua grafis (kartu, avatar robot, ikon) digambar lewat kode, dan semua suara/musik chiptune disintesis dengan Web Audio — tidak ada file aset.

## Menjalankan

```bash
npm install
npm run dev        # shared (watch) + server :4000 + client :3000
```

Buka http://localhost:3000. Client mem-proxy `/socket.io` ke server, jadi mode online langsung jalan. Untuk mencoba dari HP di jaringan yang sama, buka `http://<ip-komputer>:3000`.

Produksi (server menyajikan client hasil build):

```bash
npm run build
npm start          # http://localhost:4000  (PORT, HOST bisa diatur lewat env)
```

## Konfigurasi (.env)

Satu file `.env` di root dibaca oleh server dan client. Salin dari contoh:

```bash
cp .env.example .env
```

| Variabel | Default | Fungsi |
|---|---|---|
| `SERVER_PORT` | 4000 | Port backend (di produksi juga menyajikan client) |
| `SERVER_HOST` | 0.0.0.0 | Alamat bind backend |
| `CLIENT_PORT` | 3000 | Port dev server Vite (`npm run dev`) |
| `CLIENT_HOST` | 0.0.0.0 | Alamat bind dev server Vite |

Client otomatis mem-proxy ke `SERVER_PORT`, jadi cukup ubah `.env` saja. Variabel environment sistem (dan `PORT` dari platform hosting) tetap menang atas isi `.env`.

## Perintah lain

| Perintah | Isi |
|---|---|
| `npm test` | Test engine (termasuk simulasi 1.000 match bot) + test integrasi socket |
| `npm run typecheck` | `tsc --noEmit` untuk ketiga package |

## Struktur

```
packages/shared   engine murni (aturan, AI, runner), tipe, protokol socket + validasi zod
packages/server   Fastify + Socket.IO: room, reconnect, bot pengganti
packages/client   React + Vite + Tailwind + Zustand: UI pixel, audio chiptune
```

Aturan lengkap: [docs/GDD.md](docs/GDD.md). Arsitektur: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
