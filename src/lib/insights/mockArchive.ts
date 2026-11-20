import type { ArchivedTrend, ArchivePriority, ArchiveStatus } from '../archive';
import type { SourceId } from './types';

// Phase 0 sample archive, enough to exercise filters, sorting and more than
// one page (AR-5, AR-6). Loaded only on request from /arsip?contoh=1.

type Sample = [
  title: string,
  source: SourceId,
  category: string,
  tags: string[],
  savedDaysAgo: number,
  status: ArchiveStatus,
  priority: ArchivePriority | null,
  notes?: string,
];

const samples: Sample[] = [
  ["Views video 'outfit kondangan' naik 1,9x dalam 10 hari.", 'youtube', 'Fashion', ['kondangan', 'outfit'], 1, 'in_progress', 'high', 'Draft carousel sudah, tunggu foto produk.'],
  [
    "Minat pencarian 'skincare pria' naik 31% dalam 30 hari.",
    'google_trends',
    'Beauty',
    ['skincare', 'pria'],
    2,
    'not_started',
    'high',
    [
      'MAKE IT TODAY — Elias',
      "Tren: Minat pencarian 'skincare pria' naik 31% dalam 30 hari.",
      'Keputusan: Pantau',
      'Peran: Content Strategist',
      '',
      'Pantau — minatnya naik, tapi belum ada momen yang bikin pria Jakarta mulai cari produk.',
      'So what: Pencarian naik stabil tanpa satu pemicu, jadi slot feed kamu lebih aman dipakai topik lain minggu ini.',
      'Format: Carousel',
      'Angle: Rutinitas skincare tiga langkah buat pria yang baru mulai, tanpa istilah yang bikin bingung.',
      'Langkah:',
      '1. Kumpulkan tiga pertanyaan skincare pria yang paling sering muncul di kolom komentar kamu.',
      '2. Siapkan draf carousel lima slide, simpan dulu sampai pencarian naik lagi minggu depan.',
      'Copy:',
      'Hook: Skincare pria nggak harus sepuluh langkah.',
      'Caption: Tiga langkah, lima menit, kulit nggak kusam lagi. Simpan buat besok pagi.',
      'CTA: Simpan carousel ini dan coba besok pagi.',
      'Kenapa: Kenaikan 31% dalam 30 hari belum disertai liputan media, jadi momentumnya belum matang.',
    ].join('\n'),
  ],
  ['Liputan media soal libur akhir tahun naik 48% minggu ini.', 'gdelt', 'Travel', ['libur', 'akhir tahun'], 3, 'not_started', 'medium'],
  ["Minat pencarian 'kopi susu gula aren' turun 12% dalam 60 hari.", 'google_trends', 'Food & Beverage', ['kopi', 'stagnan'], 4, 'executed', 'low', 'Konten perbandingan sudah tayang.'],
  ["Views video 'meal prep murah' naik 2,2x dalam 14 hari.", 'youtube', 'Food & Beverage', ['meal prep', 'hemat'], 6, 'executed', 'high'],
  ["Minat pencarian 'lari pagi' naik 18% dalam 30 hari.", 'google_trends', 'Sports', ['lari', 'komunitas'], 7, 'in_progress', 'medium'],
  ['Liputan media soal kebijakan kendaraan listrik naik 36% minggu ini.', 'gdelt', 'Automotive', ['EV', 'kebijakan'], 9, 'not_started', null],
  ["Views video 'desk setup minimalis' naik 1,6x dalam 30 hari.", 'youtube', 'Home & Living', ['desk setup', 'minimalis'], 11, 'executed', 'medium'],
  ["Minat pencarian 'investasi emas' naik 27% dalam 14 hari.", 'google_trends', 'Finance', ['emas', 'investasi'], 13, 'not_started', 'low'],
  ["Views video 'belajar AI untuk pemula' naik 2,5x dalam 30 hari.", 'youtube', 'Education', ['AI', 'pemula'], 16, 'in_progress', null],
  ['Liputan media soal festival musik lokal naik 52% minggu ini.', 'gdelt', 'Entertainment', ['festival', 'musik'], 20, 'executed', 'low'],
  ["Minat pencarian 'MPASI rumahan' naik 15% dalam 60 hari.", 'google_trends', 'Parenting & Kids', ['MPASI', 'keluarga'], 24, 'not_started', null],
];

export function sampleArchive(): ArchivedTrend[] {
  const now = Date.now();
  return samples.map(([title, source, category, tags, savedDaysAgo, status, priority, notes = ''], index) => {
    const savedAt = new Date(now - savedDaysAgo * 86_400_000).toISOString();
    return {
      insightId: `sample-${index + 1}`,
      title,
      source,
      category,
      // Started work reads as an "act" call; untouched ones as "watch"
      verdict: status === 'not_started' ? 'watch' : 'act',
      tags,
      observedOn: savedAt.slice(0, 10),
      savedAt,
      status,
      statusChangedAt: savedAt,
      priority,
      notes,
    };
  });
}
