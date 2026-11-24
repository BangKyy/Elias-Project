# Daftar topik PubMed untuk ditinjau tim konten

Disiapkan 24 November 2026. Elias menambahkan satu kalimat jumlah studi PubMed pada tren Health & Wellness yang menyebut salah satu topik di bawah. Contoh untuk kolagen:

> PubMed mencatat 132 uji terkontrol acak dan 43 tinjauan sistematis tentang suplemen kolagen dalam 5 tahun terakhir.

Topik lain tidak mendapat kalimat. Sisi teknisnya sudah dicek: setiap kueri sudah dijalankan di PubMed dan dikenali tanpa galat. Yang perlu diputuskan tim konten adalah sisi redaksi.

## Yang perlu ditinjau per baris

1. **Topik.** Apakah topik ini memang muncul di tren brand kita dan layak diberi konteks riset?
2. **Kata pemicu.** Kalimat muncul bila tag atau judul tren memuat salah satu kata ini (kata utuh). Ada kata yang kurang atau terlalu umum?
3. **Label.** Bagaimana topik disebut di kalimat ("tentang …"). Sudah wajar dalam bahasa tim kita?
4. **Isi angka.** Kueri suplemen hanya menghitung studi tentang suplemennya, bukan semua riset tentang zat itu ("collagen" saja: 59.390 publikasi, kebanyakan riset laboratorium). Masuk akal untuk topik ini?

Isi kolom **Keputusan** dengan *Setuju*, *Ubah: …*, atau *Hapus*. Angka adalah hasil 5 tahun terakhir per 24 November 2026; kalimat di kartu memakai uji terkontrol acak (RCT) dan tinjauan sistematis (SR).

| # | Topik | Kata pemicu | Label di kalimat | Cakupan kueri | Total | RCT | SR | Keputusan |
|---|---|---|---|---|---|---|---|---|
| 1 | Kolagen | kolagen, collagen | suplemen kolagen | Kolagen + suplemen | 2.057 | 132 | 43 | |
| 2 | Magnesium | magnesium | suplemen magnesium | Magnesium + suplemen | 1.848 | 117 | 96 | |
| 3 | Probiotik | probiotik, probiotic, probiotics | probiotik | Semua studi probiotik | 32.444 | 1.270 | 1.252 | |
| 4 | Vitamin D | vitamin d, vitamin d3 | suplemen vitamin D | Vitamin D + suplemen | 7.907 | 680 | 714 | |
| 5 | Vitamin C | vitamin c | suplemen vitamin C | Vitamin C + suplemen | 1.781 | 115 | 114 | |
| 6 | Omega-3 | omega 3, omega3, minyak ikan, fish oil | suplemen omega-3 | Omega-3 + suplemen atau minyak ikan | 6.919 | 573 | 408 | |
| 7 | Kunyit | kunyit, kurkumin, curcumin, turmeric | kunyit dan kurkumin | Semua studi kurkumin dan kunyit | 13.020 | 209 | 337 | |
| 8 | Jahe | jahe, ginger | jahe | Semua studi jahe | 2.439 | 61 | 77 | |
| 9 | Puasa intermiten | intermittent fasting, puasa intermiten, time restricted eating | puasa intermiten | Puasa intermiten dan makan terbatas waktu | 2.518 | 258 | 202 | |
| 10 | Kreatin | kreatin, creatine | suplemen kreatin | Kreatin + suplemen | 1.365 | 169 | 117 | |
| 11 | Melatonin | melatonin | melatonin untuk tidur | Melatonin + tidur | 2.162 | 163 | 134 | |
| 12 | Ashwagandha | ashwagandha | ashwagandha | Semua studi ashwagandha | 662 | 34 | 25 | |
| 13 | Whey | whey, whey protein, protein whey | protein whey | Semua studi protein whey | 4.620 | 249 | 81 | |
| 14 | Teh hijau | teh hijau, green tea, matcha | teh hijau dan matcha | Teh hijau dan matcha | 3.461 | 96 | 91 | |

## Topik baru

Topik baru boleh diusulkan di bawah tabel (nama topik, kata pemicu, label). Kuerinya disusun dan dicek di PubMed sebelum dipakai: istilah medis tidak diterjemahkan otomatis, karena kueri yang salah tetap menghasilkan angka yang tampak meyakinkan.

## Setelah ditinjau

Perubahan diterapkan di `src/lib/sources/evidence/termMap.ts`. Catat siapa yang meninjau dan tanggalnya di `docs/MVP.md`, bagian PubMed, lalu centang kotak tinjauan tim konten.
