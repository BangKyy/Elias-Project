// The PubMed sentence on a Health & Wellness card, composed in code from the
// stored counts so the model never writes the number. It reports how much
// literature exists, never that anything works, is safe or cures (rules in
// docs/MVP.md, PubMed). Type imports only: scripts/evidence.test.mjs runs this
// file directly with Node's type stripping.

import type { PubmedCounts } from '../pubmed/counts';

type Term = { match: string[]; label: string };

/**
 * The first term whose words the trend's tags or claim name, whole words
 * only, as [key, term]; null when none does: no mapping, no line.
 */
export function matchTerm<T extends Term>(terms: Record<string, T>, tags: string[], signal: string): [string, T] | null {
  const text = ` ${[...tags, signal].join(' ').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ')} `;
  return Object.entries(terms).find(([, term]) => term.match.some((word) => text.includes(` ${word.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ')} `))) ?? null;
}

/**
 * "PubMed mencatat 132 uji terkontrol acak dan 43 tinjauan sistematis tentang
 * suplemen kolagen dalam 5 tahun terakhir." A topic with results but no trials
 * or reviews gets "belum mencatat", which only a curated term may say. Null
 * when the term found fewer than `minTotal` results at all, which more likely
 * means the query is off than that nobody studies it.
 */
export function composePubmedLine(label: string, counts: PubmedCounts, years: number, minTotal: number): string | null {
  if (counts.total < Math.max(minTotal, 1)) return null;
  const n = (value: number) => value.toLocaleString('id-ID');
  if (!counts.rct && !counts.systematicReview) {
    return `PubMed belum mencatat uji terkontrol acak atau tinjauan sistematis tentang ${label} dalam ${years} tahun terakhir.`;
  }
  return `PubMed mencatat ${n(counts.rct)} uji terkontrol acak dan ${n(counts.systematicReview)} tinjauan sistematis tentang ${label} dalam ${years} tahun terakhir.`;
}
