// Curated map from Health & Wellness trend words to PubMed queries (docs/MVP.md,
// PubMed). Curated by hand, never translated by a model: a wrong medical term
// gives a number that looks valid. Only `pubmed` leaves for NCBI, never
// anything about a brand (DM-5). No imports: scripts/evidence.test.mjs runs
// this file directly.
//
// A starting list for the content team to confirm. Each query was run on
// 24 Nov 2026 (last 5 years) and PubMed reported no unknown term or field;
// `checked` holds those counts so a later change can be compared. A plain
// word is too broad ("collagen" alone: 59,390 papers, mostly lab research),
// so supplement topics are narrowed to supplement studies.

export type EvidenceTerm = {
  /** Trend tags or words that select this entry, lowercase, whole words */
  match: string[];
  /** "suplemen kolagen", as it reads after "tentang" */
  label: string;
  /** PubMed query; the cycle adds the date window and publication types */
  pubmed: string;
  /** Date the query was run and its counts over the last 5 years */
  checked: { on: string; total: number; rct: number; systematicReview: number };
};

export const TERM_MAP = {
  collagen: {
    match: ['kolagen', 'collagen'],
    label: 'suplemen kolagen',
    pubmed: 'collagen[tiab] AND (supplement*[tiab] OR "dietary supplements"[mh])',
    checked: { on: '2026-11-24', total: 2057, rct: 132, systematicReview: 43 },
  },
  magnesium: {
    match: ['magnesium'],
    label: 'suplemen magnesium',
    pubmed: 'magnesium[tiab] AND (supplement*[tiab] OR "dietary supplements"[mh])',
    checked: { on: '2026-11-24', total: 1848, rct: 117, systematicReview: 96 },
  },
  probiotics: {
    match: ['probiotik', 'probiotic', 'probiotics'],
    label: 'probiotik',
    pubmed: '"probiotics"[mh] OR probiotic*[tiab]',
    checked: { on: '2026-11-24', total: 32444, rct: 1270, systematicReview: 1252 },
  },
  vitamin_d: {
    match: ['vitamin d', 'vitamin d3'],
    label: 'suplemen vitamin D',
    pubmed: '"vitamin d"[tiab] AND (supplement*[tiab] OR "dietary supplements"[mh])',
    checked: { on: '2026-11-24', total: 7907, rct: 680, systematicReview: 714 },
  },
  vitamin_c: {
    match: ['vitamin c'],
    label: 'suplemen vitamin C',
    pubmed: '("vitamin c"[tiab] OR "ascorbic acid"[mh]) AND (supplement*[tiab] OR "dietary supplements"[mh])',
    checked: { on: '2026-11-24', total: 1781, rct: 115, systematicReview: 114 },
  },
  omega_3: {
    match: ['omega 3', 'omega3', 'minyak ikan', 'fish oil'],
    label: 'suplemen omega-3',
    pubmed: '(omega-3[tiab] OR "fatty acids, omega-3"[mh]) AND (supplement*[tiab] OR "dietary supplements"[mh] OR "fish oils"[mh])',
    checked: { on: '2026-11-24', total: 6919, rct: 573, systematicReview: 408 },
  },
  curcumin: {
    match: ['kunyit', 'kurkumin', 'curcumin', 'turmeric'],
    label: 'kunyit dan kurkumin',
    pubmed: '"curcumin"[mh] OR curcumin[tiab] OR turmeric[tiab]',
    checked: { on: '2026-11-24', total: 13020, rct: 209, systematicReview: 337 },
  },
  ginger: {
    match: ['jahe', 'ginger'],
    label: 'jahe',
    pubmed: '"zingiber officinale"[mh] OR ginger[tiab]',
    checked: { on: '2026-11-24', total: 2439, rct: 61, systematicReview: 77 },
  },
  intermittent_fasting: {
    match: ['intermittent fasting', 'puasa intermiten', 'time restricted eating'],
    label: 'puasa intermiten',
    pubmed: '"intermittent fasting"[mh] OR "intermittent fasting"[tiab] OR "time-restricted eating"[tiab]',
    checked: { on: '2026-11-24', total: 2518, rct: 258, systematicReview: 202 },
  },
  creatine: {
    match: ['kreatin', 'creatine'],
    label: 'suplemen kreatin',
    pubmed: 'creatine[tiab] AND (supplement*[tiab] OR "dietary supplements"[mh])',
    checked: { on: '2026-11-24', total: 1365, rct: 169, systematicReview: 117 },
  },
  melatonin_sleep: {
    match: ['melatonin'],
    label: 'melatonin untuk tidur',
    pubmed: 'melatonin[tiab] AND sleep[tiab]',
    checked: { on: '2026-11-24', total: 2162, rct: 163, systematicReview: 134 },
  },
  ashwagandha: {
    match: ['ashwagandha'],
    label: 'ashwagandha',
    pubmed: 'ashwagandha[tiab] OR "withania"[mh]',
    checked: { on: '2026-11-24', total: 662, rct: 34, systematicReview: 25 },
  },
  whey_protein: {
    match: ['whey', 'whey protein', 'protein whey'],
    label: 'protein whey',
    pubmed: '"whey proteins"[mh] OR "whey protein"[tiab]',
    checked: { on: '2026-11-24', total: 4620, rct: 249, systematicReview: 81 },
  },
  green_tea: {
    match: ['teh hijau', 'green tea', 'matcha'],
    label: 'teh hijau dan matcha',
    pubmed: '"green tea"[tiab] OR matcha[tiab] OR ("tea"[mh] AND green[tiab])',
    checked: { on: '2026-11-24', total: 3461, rct: 96, systematicReview: 91 },
  },
} satisfies Record<string, EvidenceTerm>;

export type TermKey = keyof typeof TERM_MAP;
