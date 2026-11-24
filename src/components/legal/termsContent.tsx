import Link from 'next/link';
import { chatEnabled } from '@/lib/chatFeature';
import { LEGAL_OPERATOR } from '@/lib/legal';
import { pubmedEnabled } from '@/lib/sources/evidence/enabled';
import { offEnabled } from '@/lib/sources/off/enabled';
import { ContactLink, List, P, type LegalSection } from './LegalPage';

// The Chat passages follow the same switch as Chat itself (lib/chatFeature)

export const termsSummary = [
  <>Elias membaca tren dari <strong>sumber publik</strong> dan memakai <strong>model AI</strong> untuk menyarankan apa yang bisa brand kamu lakukan. Saran itu bisa keliru, jadi periksa dulu sebelum dipublikasikan.</>,
  <>Akun dibuat dengan <strong>email dan kata sandi</strong>. Kamu bisa menghapusnya kapan saja dari halaman Profil.</>,
  <>Arsip tersimpan <strong>di browser perangkat yang kamu pakai</strong>, bukan di server kami, dan hilang bila data browser dihapus.</>,
  ...(chatEnabled
    ? [<>Chat hanya membahas <strong>satu tren</strong>. Pesannya disimpan 30 hari dan diproses model AI, jadi <strong>jangan tulis informasi rahasia</strong>.</>]
    : []),
  <>Syarat ini tunduk pada <strong>hukum Republik Indonesia</strong>.</>,
];

export const termsSections: LegalSection[] = [
  {
    id: 'tentang',
    title: 'Tentang Elias dan syarat ini',
    content: (
      <>
        <P>
          Elias adalah layanan yang dikelola oleh <strong>{LEGAL_OPERATOR}</strong>. Elias membantu tim kreatif dan pemilik brand
          membaca tren harian dan memutuskan mana yang layak dieksekusi, dipantau, atau dilewati.
        </P>
        <P>
          Dengan membuat akun atau memakai Elias, kamu menyetujui Syarat & Ketentuan ini, <Link href="/privasi" className="font-semibold text-primary hover:underline">Kebijakan Privasi</Link>, dan{' '}
          <Link href="/cookies" className="font-semibold text-primary hover:underline">Kebijakan Cookie</Link>. Kalau tidak setuju, jangan memakai Elias.
        </P>
      </>
    ),
  },
  {
    id: 'akun',
    title: 'Akun kamu',
    content: (
      <>
        <P>Akun Elias dibuat dengan alamat email dan kata sandi. Saat ini Elias belum menyediakan masuk lewat akun Google, Facebook, atau Apple.</P>
        <List>
          <li>Pakai alamat email yang bisa kamu akses: tautan konfirmasi pendaftaran, kode pemulihan kata sandi, dan konfirmasi ganti email dikirim ke sana.</li>
          <li>Jaga kerahasiaan kata sandi kamu. Aktivitas yang dilakukan lewat akun kamu dianggap dilakukan oleh kamu.</li>
          <li>
            Pilihan <strong>Ingat saya</strong> membuat kamu tetap masuk di browser itu. Tanpa pilihan itu, sesi berakhir saat browser ditutup.
          </li>
          <li>Isi profil dan brand dengan informasi yang benar, karena Elias memakainya untuk menyusun saran.</li>
        </List>
      </>
    ),
  },
  {
    id: 'cara-kerja',
    title: 'Cara Elias bekerja',
    content: (
      <>
        <P>
          Setiap hari Elias mengumpulkan sinyal dari sumber publik: Google Trends, YouTube, GDELT, Google News, newsdata.io, situs berita Indonesia (antara lain
          Antara, CNN Indonesia, detikNews, CNBC Indonesia, Republika, dan DailySocial), Wikipedia, dan GitHub. Dari sinyal itu Elias
          menyusun daftar tren di Beranda.
        </P>
        <P>
          Saat kamu meminta analisis untuk brand kamu, Elias mengirim informasi brand dan topik tren ke model AI melalui layanan OpenRouter.
          Rincian data yang dikirim ada di <Link href="/privasi#dibagikan" className="font-semibold text-primary hover:underline">Kebijakan Privasi</Link>.
        </P>
        <List>
          <li>
            <strong>Analisis AI bisa keliru.</strong> Hasilnya adalah saran, bukan nasihat hukum, keuangan, atau profesional lain. Periksa fakta,
            hak cipta, dan kepantasan konten sebelum kamu memakainya.
          </li>
          <li>
            Setiap akun punya <strong>batas harian</strong> analisis baru. Analisis yang sudah pernah dibuat hari itu bisa dibuka lagi tanpa
            mengurangi batas. Model AI yang dipakai juga punya kuota sendiri; bila kuota itu habis, analisis baru bisa dibuat lagi setelah
            kuota direset.
          </li>
          <li>Tamu (tanpa akun) hanya melihat tren dari sumber utama dan tidak bisa meminta analisis untuk brand{chatEnabled ? ' atau memakai Chat' : ''}.</li>
        </List>
      </>
    ),
  },
  ...(chatEnabled
    ? [
        {
          id: 'chat',
          title: 'Chat dengan Elias',
          content: (
            <>
              <P>
                Chat dipakai untuk bertanya lanjut tentang <strong>satu tren</strong>: angle, format, copy, risiko, atau langkah yang bisa
                kamu mulai hari ini. Chat dibuka dari tombol <strong>Tanya Elias</strong> di setiap tren di Beranda atau Arsip, dan hanya untuk pengguna
                yang sudah masuk dan menyelesaikan profil.
              </P>
              <List>
                <li>Pertanyaan di luar tren itu tidak dijawab. Elias akan mengarahkan kamu kembali ke tren tersebut.</li>
                <li>
                  Ada batas pesan per hari dan per percakapan, serta batas bersama untuk semua pengguna agar daftar tren harian tetap bisa disusun.
                  Bila batas tercapai, Chat bisa dipakai lagi setelah batasnya direset.
                </li>
                <li>
                  Balasan Elias di Chat juga saran dari model AI yang bisa keliru. Pesan disimpan 30 hari dan diproses model AI melalui
                  OpenRouter, jadi <strong>jangan menulis informasi rahasia</strong>, data pelanggan, atau data pribadi orang lain. Rinciannya ada
                  di <Link href="/privasi#dibagikan" className="font-semibold text-primary hover:underline">Kebijakan Privasi</Link>.
                </li>
                <li>Kamu bisa menghapus percakapan kapan saja dengan Hapus percakapan.</li>
              </List>
            </>
          ),
        },
      ]
    : []),
  {
    id: 'arsip',
    title: 'Arsip',
    content: (
      <>
        <P>
          Tren yang kamu simpan, beserta status, prioritas, dan catatannya, disimpan di <strong>penyimpanan lokal browser</strong> pada perangkat
          yang kamu pakai. Arsip tidak dikirim ke server Elias dan tidak ikut berpindah ke perangkat atau browser lain.
        </P>
        <List>
          <li>Menghapus data situs di browser akan menghapus Arsip di browser itu, dan Elias tidak bisa memulihkannya.</li>
          <li>Tamu dan setiap akun di perangkat yang sama punya Arsip terpisah.</li>
          <li>Prioritas hanya bisa diatur oleh pemilik akun.</li>
        </List>
      </>
    ),
  },
  {
    id: 'penggunaan',
    title: 'Penggunaan yang tidak diizinkan',
    content: (
      <List>
        <li>Masuk ke akun orang lain atau mencoba membaca data pengguna lain.</li>
        <li>Mengakali batas harian analisis{chatEnabled ? ' atau Chat' : ''}, misalnya dengan membuat banyak akun untuk satu brand.</li>
        {chatEnabled && <li>Memakai Chat untuk hal di luar tren, atau mencoba membuat Elias mengabaikan aturannya.</li>}
        <li>Mengganggu, membebani, atau mencoba membobol layanan Elias.</li>
        <li>Memakai hasil Elias untuk konten yang melanggar hukum yang berlaku di Indonesia.</li>
      </List>
    ),
  },
  {
    id: 'konten-pihak-ketiga',
    title: 'Konten dan tautan pihak ketiga',
    content: (
      <>
        <P>
          Setiap tren menampilkan judul, tautan, dan angka (misalnya jumlah penayangan atau pencarian) dari sumber di atas. Konten aslinya milik
          pemiliknya masing-masing. Tautan membuka situs pihak ketiga yang punya syarat dan kebijakan privasinya sendiri.
        </P>
        {offEnabled() && (
          <P>
            Sebagian tren Food & Beverage memuat satu angka tentang produk Indonesia di Open Food Facts, basis data produk terbuka yang diisi
            kontributor, jadi angkanya tidak menggambarkan pasar. Berisi data dari{' '}
            <a href="https://world.openfoodfacts.org" target="_blank" rel="noopener noreferrer" className="underline">
              Open Food Facts
            </a>
            , tersedia di bawah{' '}
            <a href="https://opendatacommons.org/licenses/odbl/1-0/" target="_blank" rel="noopener noreferrer" className="underline">
              Open Database License
            </a>
            .
          </P>
        )}
        {pubmedEnabled() && (
          <P>
            Sebagian tren Health & Wellness memuat jumlah studi tentang topiknya di PubMed. Jumlah studi bukan bukti bahwa sebuah produk atau bahan
            bekerja, aman, atau menyembuhkan, dan bukan saran medis. Dari{' '}
            <a href="https://pubmed.ncbi.nlm.nih.gov/" target="_blank" rel="noopener noreferrer" className="underline">
              MEDLINE®/PubMed®
            </a>
            , basis data National Library of Medicine AS (From MEDLINE®/PubMed®, a database of the U.S. National Library of Medicine). National
            Library of Medicine tidak mendukung Elias atau isinya.
          </P>
        )}
      </>
    ),
  },
  {
    id: 'fitur-segera',
    title: 'Fitur yang belum tersedia',
    content: (
      <P>
        Fitur yang ditandai <strong>Segera</strong> atau <strong>Segera Hadir</strong>
        {chatEnabled ? '' : ', seperti Chat,'} belum bisa dipakai. Jam email pagi dan pilihan Always On sudah bisa kamu atur di halaman
        Notifikasi, tetapi pengiriman email pagi belum aktif. Saat fitur seperti ini aktif, syarat dan kebijakan ini akan diperbarui bila
        perlu.
      </P>
    ),
  },
  {
    id: 'hapus-akun',
    title: 'Menghapus akun',
    content: (
      <P>
        Kamu bisa menghapus akun kapan saja dari halaman <strong>Profil</strong>, bagian Hapus Akun. Penghapusan bersifat permanen dan tidak
        bisa dibatalkan. Apa saja yang ikut terhapus dijelaskan di{' '}
        <Link href="/privasi#penyimpanan" className="font-semibold text-primary hover:underline">Kebijakan Privasi</Link>.
      </P>
    ),
  },
  {
    id: 'layanan',
    title: 'Ketersediaan dan perubahan layanan',
    content: (
      <P>
        Elias bergantung pada sumber data dan layanan pihak ketiga yang bisa berubah atau tidak tersedia. Karena itu Elias disediakan
        sebagaimana adanya: fitur, sumber tren, dan model AI dapat berubah, dan layanan bisa sesekali tidak tersedia. {LEGAL_OPERATOR} tidak
        bertanggung jawab atas keputusan atau konten yang kamu buat berdasarkan saran Elias.
      </P>
    ),
  },
  {
    id: 'perubahan',
    title: 'Perubahan syarat',
    content: (
      <P>
        Syarat ini bisa diperbarui. Versi terbaru selalu ada di halaman ini dengan tanggal berlakunya di bagian atas. Dengan tetap memakai
        Elias setelah perubahan berlaku, kamu menyetujui versi yang baru.
      </P>
    ),
  },
  {
    id: 'hukum',
    title: 'Hukum yang berlaku',
    content: <P>Syarat & Ketentuan ini diatur oleh dan ditafsirkan menurut hukum Republik Indonesia.</P>,
  },
  {
    id: 'kontak',
    title: 'Kontak',
    content: (
      <P>
        Pertanyaan tentang syarat ini bisa dikirim ke <ContactLink />.
      </P>
    ),
  },
];
