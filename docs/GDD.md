# OVERLOAD 21 — Game Design

Sumber kebenaran aturan adalah kode di `packages/shared/src/engine/`. Dokumen ini merangkumnya.

## Tujuan
Jadi pemain terakhir yang masih hidup.

## Setup
- 2–8 pemain (manusia dan/atau bot).
- Deck 58 kartu dikocok; tiap pemain mendapat **5 kartu** (bisa diatur 3–7).
- Total meja mulai dari **0**. Pemain pertama dipilih acak.

## Giliran
1. Pemain aktif memainkan **1 kartu**.
2. Pemain itu langsung mengambil 1 kartu. Jika deck habis, tumpukan buangan dikocok ulang menjadi deck.
3. Giliran pindah ke pemain hidup berikutnya sesuai arah putaran.

Jika timer giliran aktif (default 15 detik) dan waktu habis, kartu dimainkan otomatis oleh AI.

## Overload
- Jika total **lebih dari batas** (default 21) → **OVERLOAD**. Tepat sama dengan batas masih aman.
- Pemain yang memainkan kartu itu roll 1–100: **≤ peluang selamat** (default 70) = selamat, selain itu **gugur**.
- Total kembali ke 0 dan giliran pindah ke pemain berikutnya.
- Pemain gugur menjadi penonton; kartunya masuk tumpukan buangan.

## Deck (58 kartu)

| Kartu | Jumlah | Efek |
|---|---|---|
| +1 … +8 | 5 tiap nilai | Tambah nilai ke total |
| +9, +10 | 4 tiap nilai | Tambah nilai ke total |
| DEATH | 1 | Semua pemain hidup roll nasib. Jika **semua** gagal, pemain yang memainkan DEATH diampuni |
| ROLEBACK | 2 | Balik arah giliran. Pemain berikutnya tidak boleh membalas dengan ROLEBACK |
| >1, >2, >3 | 1 tiap jenis | Pemain berikutnya wajib main kartu **angka** lebih dari nilai itu; kartu spesial dilarang |
| SKIP | 1 | Lewati pemain berikutnya (dengan 2 pemain, giliran tetap pindah biasa) |
| RESET | 1 | Total jadi 0 |
| = BATAS | 1 | Total langsung sama dengan batas |
| -5 | 1 | Total dikurangi 5 (minimal 0) |

## Aturan Terjebak
Jika aturan (>N atau larangan ROLEBACK) membuat pemain **tidak punya kartu yang sah**, semua kartunya boleh dimainkan. Kartu yang dimainkan **hangus** (efeknya batal) dan pemain **wajib roll nasib** seperti overload. Aturan ini memastikan permainan tidak pernah macet.

## Keluar & Koneksi (online)
- Keluar di tengah match = gugur.
- Terputus: setelah 5 detik bot mengambil alih kursi (tanda AUTO). Saat tersambung lagi, kendali kembali ke pemain.
- Di lobby, pemain yang terputus lebih dari 20 detik dikeluarkan. Room tanpa pemain manusia yang tersambung ditutup setelah 2 menit.

## Pengaturan Room
| Opsi | Rentang | Default |
|---|---|---|
| Batas overload | 15–31 | 21 |
| Peluang selamat | 50–90% | 70% |
| Kartu awal | 3–7 | 5 |
| Waktu giliran | off / 10 / 15 / 20 / 30 detik | 15 (hot-seat: off) |
| Level bot | Mudah / Normal / Sulit | Normal |
| Maks pemain (online) | 2–8 | 8 |
