# PubMed di Elias: ringkasan untuk keputusan hukum

Disiapkan 24 November 2026. Dokumen ini bukan nasihat hukum: isinya fakta tentang cara Elias memakai data PubMed, supaya orang yang berwenang bisa memutuskan tiga pertanyaan di bawah. Fitur ini **belum aktif** (`SOURCE_PUBMED_ENABLED=false`) dan tidak tampil ke siapa pun sampai diaktifkan.

## Apa fiturnya

Elias menyusun daftar tren harian untuk tim kreatif brand. Pada sebagian tren berkategori Health & Wellness, Elias menambahkan **satu kalimat** tentang jumlah studi di PubMed, basis data literatur medis milik National Library of Medicine (NLM) Amerika Serikat. Contoh:

> PubMed mencatat 132 uji terkontrol acak dan 43 tinjauan sistematis tentang suplemen kolagen dalam 5 tahun terakhir.

Tujuannya kehati-hatian, bukan promosi: memberi tahu tim brand seberapa banyak riset yang ada sebelum mereka membuat konten yang menyentuh klaim kesehatan.

## Fakta yang relevan

| Hal | Cara Elias melakukannya |
|---|---|
| Data yang diambil dari PubMed | Hanya **jumlah** hasil pencarian (total, uji terkontrol acak, tinjauan sistematis, meta-analisis). Tidak ada abstrak, judul artikel, atau isi publikasi yang diambil, disimpan, atau ditampilkan |
| Yang dikirim ke PubMed | Hanya kata kunci topik dari daftar yang dikurasi (mis. "collagen", "ginger"). Tidak pernah nama brand, data profil, atau data pengguna |
| Siapa yang melihat | Hanya pengguna yang sudah masuk (tim brand). Tamu tidak pernah melihatnya |
| Cara kalimat ditulis | Disusun oleh kode, bukan oleh AI, dan hanya berisi angka dan rentang waktu. Kalimat tidak pernah memuat kata seperti "terbukti", "efektif", "aman", "menyembuhkan", atau "mencegah" (diuji otomatis) |
| Saran AI di sekitarnya | Instruksi ke model AI melarang menyebut sesuatu berhasil, terbukti, aman, menyembuhkan atau mencegah, dan melarang mengubah jumlah studi menjadi klaim produk |
| Atribusi di kartu | "Dari MEDLINE®/PubMed®, basis data National Library of Medicine AS." dengan tautan ke PubMed |
| Atribusi di halaman Syarat | Kalimat di atas, ditambah teks resmi NLM dalam bahasa Inggris ("From MEDLINE®/PubMed®, a database of the U.S. National Library of Medicine."), pernyataan bahwa jumlah studi bukan bukti atau saran medis, dan bahwa NLM tidak mendukung Elias |
| Model bisnis | Elias adalah layanan untuk brand, jadi penggunaannya dapat dianggap komersial |

## Tiga pertanyaan yang perlu diputuskan

1. **Syarat NLM untuk penggunaan komersial.** Apakah menyimpan jumlah hasil pencarian (tanpa abstrak) dan menampilkan kalimat turunan dengan atribusi di layanan komersial memenuhi syarat NLM? NLM menyatakan tidak bertanggung jawab atas penggunaan materi berhak cipta (abstrak milik penerbit), meminta pengguna menyebut NLM sebagai sumber, dan melarang kesan bahwa NLM mendukung produk. Elias tidak memakai abstrak sama sekali.
2. **Aturan klaim kesehatan dan iklan BPOM.** Pengguna Elias adalah tim brand yang membuat konten. Apakah jumlah studi yang tampil di samping tren kesehatan bisa dibaca sebagai dukungan atas klaim produk? Risiko terbesarnya: brand mengutip angka itu di iklan sebagai "terbukti oleh 132 studi". Elias tidak menulis klaim seperti itu, tapi tidak bisa mengendalikan apa yang dipublikasikan brand setelahnya.
3. **Atribusi.** Apakah teks atribusi di kartu dan di halaman Syarat (lihat tabel) sudah memenuhi syarat NLM?

## Pilihan untuk menurunkan risiko pertanyaan 2

- Tampilkan kalimat PubMed hanya pada tren dengan putusan "pantau" atau "lewati", sehingga dibaca sebagai alasan berhati-hati, bukan dorongan untuk mempublikasikan.
- Tambahkan catatan singkat di kartu, mis. "Jumlah studi bukan bukti manfaat. Ikuti aturan BPOM untuk klaim kesehatan."
- Batasi topik ke bahan yang tidak berstatus obat di Indonesia.

## Sumber

- Kebijakan pemakaian E-utilities (NCBI): https://www.ncbi.nlm.nih.gov/books/NBK25497/
- Hak cipta dan unduhan data NLM: https://www.nlm.nih.gov/databases/download.html
- Lisensi data NLM (contoh teks atribusi): https://www.nlm.nih.gov/databases/license/weblic/
- Dataset BPOM di Portal Satu Data: https://data.go.id/instantion/badan-pengawas-obat-dan-makanan

Ketentuan NLM di atas dibaca dari ringkasan halaman, bukan teks hukum lengkap. Aturan BPOM tentang klaim kesehatan dan iklan belum ditinjau sama sekali dan perlu dibaca langsung.

## Setelah diputuskan

Catat keputusan, siapa yang memutuskan, dan tanggalnya di `docs/MVP.md`, bagian PubMed, lalu centang kotak "Legal" di daftar periksa.
