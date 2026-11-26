import Link from 'next/link';
import { chatEnabled } from '@/lib/chatFeature';
import { LEGAL_OPERATOR, LEGAL_OPERATOR_DESCRIPTION, PINTEREST_INTEGRATION_LIVE } from '@/lib/legal';
import { pubmedEnabled } from '@/lib/sources/evidence/enabled';
import { footballEnabled } from '@/lib/sources/footballdata/enabled';
import { offEnabled } from '@/lib/sources/off/enabled';
import { ContactLink, InstagramLink, List, P, PinterestSource, type LegalSection } from './LegalPage';

// The Chat passages follow the same switch as Chat itself (lib/chatFeature),
// so the policy never describes a feature people can't use yet, or misses one they can

export const privacySummary = [
  <>Kami menyimpan <strong>email, profil, dan jawaban brand</strong> kamu untuk menjalankan akun dan menyesuaikan saran Elias.</>,
  chatEnabled ? (
    <>
      Untuk analisis dan Chat, <strong>informasi brand, tren, dan pesan Chat yang kamu tulis</strong> dikirim ke model AI melalui
      OpenRouter. Nama dan email kamu tidak ikut dikirim. Percakapan Chat disimpan <strong>30 hari</strong>.
    </>
  ) : (
    <>Untuk analisis, <strong>informasi brand</strong> (bukan nama atau email kamu) dikirim ke model AI melalui OpenRouter.</>
  ),
  <>Elias <strong>tidak memakai</strong> analytics, iklan, atau pelacak pihak ketiga, dan <strong>tidak menjual</strong> data kamu.</>,
  <>Kamu bisa mengubah data di Profil dan <strong>menghapus akun</strong> kapan saja.</>,
];

export const privacySections: LegalSection[] = [
  {
    id: 'pengelola',
    title: 'Siapa yang mengelola data kamu',
    content: (
      <P>
        Elias dikembangkan dan dikelola oleh <strong>{LEGAL_OPERATOR}</strong>, {LEGAL_OPERATOR_DESCRIPTION.id} (Instagram: <InstagramLink />),
        yang mengelola data pribadi di Elias. Kebijakan ini menjelaskan data apa yang dikumpulkan, untuk apa, dengan siapa dibagikan, dan hak
        kamu menurut Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP). Hubungi kami di <ContactLink />.
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
          <strong>Penggunaan model AI.</strong> Catatan setiap permintaan ke model AI: jenisnya (analisis, daftar tren harian
          {chatEnabled ? ', atau Chat' : ''}), akun yang memintanya bila ada, dan waktunya, tanpa isi permintaan. Catatan ini dipakai untuk menerapkan batas harian. Hasil analisis juga disimpan
          sementara agar analisis yang sama tidak dibuat dua kali.
        </P>
        {chatEnabled && (
          <P>
            <strong>Chat.</strong> Pesan yang kamu tulis di Chat dan balasan Elias, beserta salinan tren yang kamu tanyakan. Bila tren
            itu dibuka dari Arsip, salinannya ikut memuat catatan Arsip kamu untuk tren tersebut. Setiap balasan Elias disimpan
            bersama nama model AI yang menulisnya. Bila kamu menilai balasan (membantu atau kurang membantu, dan alasannya bila ada),
            penilaian itu disimpan bersama pesannya.
          </P>
        )}
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
        <li>Menyesuaikan Beranda: kategori brand menentukan tren yang tampil lebih dulu, dan target market menentukan urutannya.</li>
        <li>Menyusun analisis Elias sesuai brand dan peran kamu.</li>
        {chatEnabled && <li>Menjawab pertanyaan lanjutan kamu tentang satu tren di Chat, dan menyimpan percakapannya agar bisa kamu lanjutkan.</li>}
        {chatEnabled && (
          <li>
            Memperbaiki Chat dari penilaian balasan: aturan yang diberikan ke model AI dan pilihan modelnya. Penilaian tidak dikirim ke
            OpenRouter atau penyedia model AI.
          </li>
        )}
        <li>Menerapkan batas harian analisis{chatEnabled ? ' dan Chat' : ''} per akun, dan menjaga kuota model AI tetap cukup untuk daftar tren harian.</li>
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
            {chatEnabled && (
              <>
                {' '}
                Untuk Chat, OpenRouter juga menerima tren yang kamu tanyakan, beberapa pesan terakhir percakapan, dan pesan baru kamu.
                Elias memakai model gratis, dan sebagian penyedianya bisa mencatat atau memakai isi permintaan untuk melatih model mereka.
                Karena itu <strong>jangan menulis informasi rahasia</strong>, data pelanggan, atau data pribadi orang lain di Chat.
              </>
            )}
          </li>
          <li>
            <strong>BigDataCloud</strong>: hanya bila kamu memakai tombol lokasi. Browser kamu mengirim koordinat ke BigDataCloud untuk diubah
            menjadi nama tempat.
          </li>
        </List>
        <P>
          Untuk menyusun daftar tren, server Elias juga mengambil data publik dari Google Trends, YouTube, GDELT, Google News, newsdata.io, situs berita,
          Wikipedia, dan GitHub{pubmedEnabled() ? ', serta jumlah studi dari PubMed untuk sebagian tren Health & Wellness' : ''}{footballEnabled() ? ', serta jadwal dan klasemen sepak bola dari football-data.org' : ''}
          {offEnabled() ? ', serta data produk dari Open Food Facts untuk sebagian tren Food & Beverage' : ''}, ditambah <PinterestSource />. Permintaan itu
          memakai kata kunci tren, bukan data pribadi kamu atau nama brand kamu.
        </P>
      </>
    ),
  },
  {
    id: 'pinterest',
    title: 'Pinterest Trends API',
    content: (
      <>
        <P>
          {PINTEREST_INTEGRATION_LIVE
            ? 'Elias memakai Pinterest Trends API sebagai salah satu sumber sinyal tren. Bagian ini menjelaskan apa saja yang termasuk dalam integrasinya.'
            : 'Elias sedang mengintegrasikan Pinterest Trends API sebagai salah satu sumber sinyal tren. Sebelum integrasi itu aktif, Elias tidak membaca data apa pun dari Pinterest. Bagian ini menjelaskan apa saja yang termasuk dalam integrasinya.'}
        </P>
        <List>
          <li>
            <strong>Yang dibaca:</strong> kata kunci pencarian yang sedang tren di suatu wilayah, bisa disaring per kategori minat, beserta
            persentase pertumbuhan dan volume pencarian relatifnya. Ini informasi tren agregat, bukan data pribadi.
          </li>
          <li>
            <strong>Yang tidak dilakukan:</strong> Elias tidak membaca, membuat, mengubah, atau menghapus Pin atau board, tidak memposting atas
            nama siapa pun, dan tidak mengakses profil atau konten pengguna Pinterest. Pengguna Elias tidak pernah diminta menghubungkan atau
            masuk dengan akun Pinterest.
          </li>
          <li>
            <strong>Autentikasi:</strong> Elias mengakses API dengan kredensial aplikasinya sendiri melalui alur OAuth 2.0 Pinterest. Kredensial
            dan token hanya disimpan di sisi server.
          </li>
          <li>
            <strong>Penyimpanan:</strong> Elias tidak menyimpan respons mentah dari Pinterest API dan tidak membangun dataset historis darinya.
            Informasi tren dipakai untuk menyusun rekomendasi hari itu.
          </li>
          <li>
            <strong>Tanpa afiliasi:</strong> Elias tidak berafiliasi dengan, disponsori, atau didukung oleh Pinterest. Pinterest adalah merek
            dagang Pinterest, Inc.
          </li>
        </List>
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
          <strong>Catatan permintaan ke model AI</strong>: 30 hari, lalu dihapus otomatis.
        </li>
        {chatEnabled && (
          <li>
            <strong>Percakapan Chat</strong>: 30 hari setelah pesan terakhir, lalu dihapus otomatis. Kamu bisa menghapusnya lebih cepat dengan
            Hapus percakapan.
          </li>
        )}
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
        Menghapus akun dari halaman Profil langsung menghapus akun di Supabase Auth beserta profil, data brand,
        {chatEnabled ? ' semua percakapan Chat,' : ''} dan hasil analisis sementara milik akun itu. Catatan permintaan ke model AI yang
        masih tersimpan tidak lagi terhubung ke akun mana pun, lalu terhapus dalam 30 hari. Arsip akun itu di browser yang sedang kamu
        pakai ikut dihapus. Arsip di perangkat atau browser lain tidak bisa kami jangkau, jadi hapus dari browser tersebut bila perlu.
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
        Database Elias memakai aturan akses per baris (row level security), sehingga setiap akun hanya bisa membaca dan mengubah profil dan
        data brand-nya sendiri.{chatEnabled ? ' Percakapan Chat hanya bisa dibaca dan dihapus oleh pemiliknya, dan dari browser yang bisa diubah hanya penilaian balasan Elias.' : ''}{' '}
        Catatan penggunaan model AI dan hasil analisis sementara tidak bisa diakses dari browser sama sekali. Mengganti kata sandi meminta kata
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
        Pertanyaan atau permintaan tentang data pribadi kamu bisa dikirim ke {LEGAL_OPERATOR} di <ContactLink />. Sebutkan email akun kamu
        agar kami bisa menemukannya. {LEGAL_OPERATOR} juga bisa dihubungi lewat Instagram: <InstagramLink />.
      </P>
    ),
  },
];
