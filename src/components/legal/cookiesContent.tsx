import type { ReactNode } from 'react';
import Link from 'next/link';
import { ContactLink, List, P, Term, type LegalSection } from './LegalPage';

export const cookiesSummary = [
  <>Elias hanya memakai cookie yang <strong>diperlukan</strong> untuk masuk ke akun. Tidak ada cookie analytics, iklan, atau pihak ketiga.</>,
  <>Arsip dan beberapa data sementara disimpan di <strong>penyimpanan browser</strong>, bukan di server.</>,
  <>Karena semuanya diperlukan, Elias <strong>tidak menampilkan banner persetujuan</strong> cookie.</>,
];

type StorageRow = { name: ReactNode; purpose: ReactNode; duration: ReactNode };

/** A table from tablet width up; stacked cards on phones, so "Berapa lama" never hides off-screen. */
function StorageTable({ caption, rows }: { caption: string; rows: StorageRow[] }) {
  return (
    <>
      <ul aria-label={caption} className="flex flex-col gap-3 md:hidden">
        {rows.map((row, i) => (
          <li key={i} className="flex flex-col gap-3 rounded-md border border-disabled-surface p-4 text-sm text-neutral-80">
            <div>{row.name}</div>
            <dl className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <dt className="font-mono text-xs font-bold text-gray-600 uppercase">Untuk apa</dt>
                <dd>{row.purpose}</dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="font-mono text-xs font-bold text-gray-600 uppercase">Berapa lama</dt>
                <dd>{row.duration}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
      <StorageGrid caption={caption} rows={rows} />
    </>
  );
}

function StorageGrid({ caption, rows }: { caption: string; rows: StorageRow[] }) {
  return (
    <div className="hidden overflow-x-auto rounded-md border border-disabled-surface md:block">
      <table className="w-full min-w-[560px] border-collapse text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-neutral-100 font-mono text-xs text-gray-600 uppercase">
          <tr>
            <th scope="col" className="px-4 py-3 font-bold">Nama</th>
            <th scope="col" className="px-4 py-3 font-bold">Untuk apa</th>
            <th scope="col" className="px-4 py-3 font-bold">Berapa lama</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-disabled-surface align-top text-neutral-80">
              <td className="px-4 py-3">{row.name}</td>
              <td className="px-4 py-3">{row.purpose}</td>
              <td className="px-4 py-3">{row.duration}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const cookiesSections: LegalSection[] = [
  {
    id: 'apa-itu',
    title: 'Cookie dan penyimpanan browser',
    content: (
      <P>
        Cookie adalah berkas kecil yang disimpan browser dan dikirim kembali ke situs setiap kali kamu membukanya. Selain cookie, Elias juga
        memakai <strong>local storage</strong> (bertahan sampai dihapus) dan <strong>session storage</strong> (hilang saat tab ditutup).
        Halaman ini mencantumkan semuanya.
      </P>
    ),
  },
  {
    id: 'cookie',
    title: 'Cookie yang dipakai',
    content: (
      <>
        <P>Semua cookie di bawah ini berasal dari Elias sendiri dan diperlukan agar kamu bisa masuk dan tetap masuk.</P>
        <StorageTable
          caption="Cookie yang dipakai Elias"
          rows={[
            {
              name: <Term>sb-…-auth-token</Term>,
              purpose: (
                <>
                  Sesi masuk dari Supabase Auth. Bila isinya besar, browser menyimpannya dalam beberapa bagian (<Term>.0</Term>,{' '}
                  <Term>.1</Term>, dan seterusnya).
                </>
              ),
              duration: (
                <>
                  400 hari bila <strong>Ingat saya</strong> dicentang; tanpa itu, sampai browser ditutup. Dihapus saat kamu keluar.
                </>
              ),
            },
            {
              name: <Term>sb-…-auth-token-code-verifier</Term>,
              purpose: 'Kode pengaman sementara saat kamu membuka tautan konfirmasi email atau memulihkan kata sandi.',
              duration: 'Dihapus setelah tautan atau kode itu dipakai.',
            },
            {
              name: <Term>elias-remember</Term>,
              purpose: (
                <>
                  Mencatat bahwa kamu masuk <strong>tanpa</strong> Ingat saya, agar sesi berakhir saat browser ditutup. Hanya dibuat bila
                  pilihan itu tidak dicentang.
                </>
              ),
              duration: 'Sampai browser ditutup.',
            },
          ]}
        />
      </>
    ),
  },
  {
    id: 'local-storage',
    title: 'Local storage',
    content: (
      <StorageTable
        caption="Local storage yang dipakai Elias"
        rows={[
          {
            name: (
              <>
                <Term>elias.archive.v1.guest</Term> dan <Term>elias.archive.v1.user.…</Term>
              </>
            ),
            purpose:
              'Arsip: tren yang kamu simpan beserta status, prioritas, catatan, dan reaksinya. Tamu dan setiap akun di perangkat yang sama punya Arsip terpisah.',
            duration: 'Sampai kamu menghapus tren, menghapus akun dari browser ini, atau menghapus data browser.',
          },
        ]}
      />
    ),
  },
  {
    id: 'session-storage',
    title: 'Session storage',
    content: (
      <StorageTable
        caption="Session storage yang dipakai Elias"
        rows={[
          {
            name: <Term>elias.insight.v4.…</Term>,
            purpose: 'Hasil analisis Elias yang sudah dibuka di tab ini, agar tidak diminta ulang dan tidak mengurangi batas harian.',
            duration: 'Sampai tab ditutup.',
          },
          {
            name: <Term>elias:recovery-email</Term>,
            purpose: 'Alamat email yang kamu masukkan saat memulihkan kata sandi, untuk memeriksa kode pada langkah berikutnya.',
            duration: 'Sampai pemulihan selesai atau tab ditutup.',
          },
        ]}
      />
    ),
  },
  {
    id: 'tidak-dipakai',
    title: 'Yang tidak dipakai',
    content: (
      <List>
        <li>Cookie atau skrip analytics.</li>
        <li>Cookie iklan atau pelacakan lintas situs.</li>
        <li>Font dari server pihak ketiga: semua font Elias dimuat dari server Elias sendiri.</li>
      </List>
    ),
  },
  {
    id: 'mengatur',
    title: 'Mengatur cookie',
    content: (
      <>
        <P>
          Kamu bisa melihat dan menghapus cookie serta penyimpanan situs di pengaturan browser. Perlu diingat:
        </P>
        <List>
          <li>Memblokir cookie Elias membuat kamu tidak bisa masuk ke akun.</li>
          <li>Menghapus data situs akan mengeluarkan kamu dari akun dan menghapus Arsip di browser itu.</li>
          <li>Di mode privat atau penyamaran, semuanya hilang saat jendela ditutup.</li>
        </List>
        <P>
          Penjelasan tentang data yang disimpan di server ada di{' '}
          <Link href="/privasi" className="font-semibold text-primary hover:underline">Kebijakan Privasi</Link>. Pertanyaan bisa dikirim ke{' '}
          <ContactLink />.
        </P>
      </>
    ),
  },
];
