import Link from 'next/link';
import { LEGAL_OPERATOR } from '@/lib/legal';
import { ContactLink, List, P, type LegalSection } from './LegalPage';

export const privacySummary = [
  <>Kami menyimpan <strong>email, profil, dan jawaban brand</strong> kamu untuk menjalankan akun dan menyesuaikan saran Elias.</>,
  <>Untuk analisis, <strong>informasi brand</strong> (bukan nama atau email kamu) dikirim ke model AI melalui OpenRouter.</>,
  <>Elias <strong>tidak memakai</strong> analytics, iklan, atau pelacak pihak ketiga, dan <strong>tidak menjual</strong> data kamu.</>,
  <>Kamu bisa mengubah data di Profil dan <strong>menghapus akun</strong> kapan saja.</>,
];

export const privacySections: LegalSection[] = [
  {
    id: 'pengelola',
    title: 'Siapa yang mengelola data kamu',
    content: (
      <P>
        Data pribadi di Elias dikelola oleh <strong>{LEGAL_OPERATOR}</strong>. Kebijakan ini menjelaskan data apa yang dikumpulkan, untuk apa,
        dengan siapa dibagikan, dan hak kamu menurut Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP). Hubungi
        kami di <ContactLink />.
      </P>
    ),
  },
  {
    id: 'data',
    title: 'Data yang kami kumpulkan',
    content: (
      <>
        <P>
          <strong>Akun.</strong> Alamat email, kata sandi, dan waktu akun dibuat. Akun dikelola oleh Supabase Auth, yang menyimpan kata sandi
          dalam bentuk hash, bukan teks aslinya. Bila kamu mengganti email, alamat baru disimpan sampai tautan konfirmasinya dibuka.
        </P>
        <P>
          <strong>Profil dan brand</strong>, dari pendaftaran, onboarding, dan halaman Profil:
        </P>
        <List>
          <li>nama, jenis akun, dan peran kamu;</li>
          <li>kategori brand, target market, archetype, lokasi, dan apakah brand berfokus lokal;</li>
          <li>tujuan brand;</li>
          <li>jam email pagi dan pilihan Always On;</li>
          <li>dari mana kamu mengetahui Elias (dan keterangan bila memilih &ldquo;Lainnya&rdquo;);</li>
          <li>waktu onboarding selesai dan waktu profil terakhir diubah.</li>
        </List>
        <P>
          <strong>Lokasi.</strong> Kamu bisa mengetik lokasi sendiri, atau memakai tombol lokasi. Tombol itu meminta izin lokasi dari browser,
          lalu koordinatnya diubah menjadi nama &ldquo;kota/kabupaten, provinsi, negara&rdquo;. Yang disimpan hanya nama itu, bukan
          koordinatnya.
        </P>
        <P>
          <strong>Penggunaan analisis.</strong> Jumlah analisis baru yang kamu buat per hari, untuk menerapkan batas harian, serta hasil analisis
          yang disimpan sementara agar analisis yang sama tidak dibuat dua kali.
        </P>
        <P>
          <strong>Di perangkat kamu.</strong> Arsip dan beberapa data sementara disimpan di browser dan tidak dikirim ke server kami. Rinciannya
          ada di <Link href="/cookies" className="font-semibold text-primary hover:underline">Kebijakan Cookie</Link>.
        </P>
        <P>
          Elias <strong>tidak</strong> mengumpulkan data pembayaran, tidak memakai alat analytics atau iklan, dan tidak menanyakan usia kamu.
        </P>
      </>
    ),
  },
  {
    id: 'tujuan',
    title: 'Untuk apa data dipakai',
    content: (
      <List>
        <li>Membuat akun, memverifikasi email, menjaga kamu tetap masuk, dan memulihkan kata sandi.</li>
        <li>Menyesuaikan Beranda: kategori brand menentukan kartu yang tampil lebih dulu, dan target market menentukan urutannya.</li>
        <li>Menyusun analisis Elias sesuai brand dan peran kamu.</li>
        <li>Menerapkan batas harian analisis per akun.</li>
        <li>Menyimpan jam email pagi dan pilihan Always On. Pengiriman email pagi belum aktif.</li>
        <li>Memahami dari mana pengguna mengetahui Elias, dari jawaban survei onboarding.</li>
      </List>
    ),
  },
  {
    id: 'dibagikan',
    title: 'Dengan siapa data dibagikan',
    content: (
      <>
        <P>Data kamu tidak dijual. Data hanya sampai ke layanan berikut, sebatas yang diperlukan:</P>
        <List>
          <li>
            <strong>Supabase</strong>: menyimpan akun, profil, dan data penggunaan di database, serta mengirim email autentikasi (konfirmasi
            pendaftaran, kode pemulihan kata sandi, dan konfirmasi ganti email).
          </li>
          <li>
            <strong>OpenRouter</strong>: saat kamu meminta analisis, Elias mengirim kategori brand, archetype, target market, lokasi dan fokus
            lokal, tujuan brand, peran kamu, serta topik dan rincian tren. OpenRouter meneruskannya ke penyedia model AI untuk menyusun
            jawaban. Nama dan email kamu <strong>tidak</strong> ikut dikirim.
          </li>
          <li>
            <strong>BigDataCloud</strong>: hanya bila kamu memakai tombol lokasi. Browser kamu mengirim koordinat ke BigDataCloud untuk diubah
            menjadi nama tempat.
          </li>
        </List>
        <P>
          Untuk menyusun kartu tren, server Elias juga mengambil data publik dari Google Trends, YouTube, GDELT, Google News, situs berita,
          Wikipedia, dan GitHub. Permintaan itu memakai kata kunci tren, bukan data pribadi kamu.
        </P>
      </>
    ),
  },
  {
    id: 'penyimpanan',
    title: 'Berapa lama data disimpan',
    content: (
      <List>
        <li>
          <strong>Akun dan profil</strong>: sampai kamu menghapus akun.
        </li>
        <li>
          <strong>Jumlah analisis harian</strong>: hanya hari ini; data hari sebelumnya dihapus otomatis setiap malam.
        </li>
        <li>
          <strong>Hasil analisis sementara</strong>: sampai tengah malam WIB, lalu dihapus otomatis.
        </li>
        <li>
          <strong>Arsip</strong>: di browser kamu sampai kamu menghapusnya atau menghapus data browser.
        </li>
      </List>
    ),
  },
  {
    id: 'hapus',
    title: 'Saat akun dihapus',
    content: (
      <P>
        Menghapus akun dari halaman Profil langsung menghapus akun di Supabase Auth beserta profil, data brand, dan jumlah analisis harian
        kamu, serta hasil analisis sementara milik akun itu. Arsip akun itu di browser yang sedang kamu pakai ikut dihapus. Arsip di
        perangkat atau browser lain tidak bisa kami jangkau, jadi hapus dari browser tersebut bila perlu.
      </P>
    ),
  },
  {
    id: 'hak',
    title: 'Hak kamu',
    content: (
      <>
        <P>Sesuai UU PDP, kamu berhak antara lain untuk:</P>
        <List>
          <li>mendapat informasi tentang pemrosesan data kamu (seperti di halaman ini);</li>
          <li>
            melengkapi, memperbarui, atau memperbaiki data: langsung di halaman <Link href="/profil" className="font-semibold text-primary hover:underline">Profil</Link>;
          </li>
          <li>mengakses dan memperoleh salinan data pribadi kamu;</li>
          <li>mengakhiri pemrosesan dan meminta data dihapus: lewat Hapus Akun di halaman Profil;</li>
          <li>menarik kembali persetujuan yang sudah kamu berikan.</li>
        </List>
        <P>
          Untuk permintaan yang tidak bisa kamu lakukan sendiri di Elias, kirim email ke <ContactLink /> dari alamat email akun kamu.
        </P>
      </>
    ),
  },
  {
    id: 'keamanan',
    title: 'Keamanan',
    content: (
      <P>
        Database Elias memakai aturan akses per baris (row level security), sehingga setiap akun hanya bisa membaca dan mengubah profilnya
        sendiri. Data penggunaan dan hasil analisis sementara tidak bisa diakses dari browser sama sekali. Mengganti kata sandi meminta kata
        sandi lama lebih dulu.
      </P>
    ),
  },
  {
    id: 'perubahan',
    title: 'Perubahan kebijakan',
    content: (
      <P>
        Kebijakan ini akan diperbarui bila cara Elias memproses data berubah, misalnya saat email pagi mulai dikirim. Versi terbaru selalu ada
        di halaman ini dengan tanggal berlakunya di bagian atas.
      </P>
    ),
  },
  {
    id: 'kontak',
    title: 'Kontak',
    content: (
      <P>
        Pertanyaan atau permintaan tentang data pribadi kamu bisa dikirim ke <ContactLink />. Sebutkan email akun kamu agar kami bisa
        menemukannya.
      </P>
    ),
  },
];
