import type { Insight } from '../../insights/types';
import { createAdminClient } from '../../supabase/admin';
import { fetchPubmedCounts, pubmedQueries, type PubmedCounts } from '../pubmed/counts';
import { composePubmedLine, matchTerm } from './compose';
import { pubmedEnabled } from './enabled';
import { TERM_MAP } from './termMap';

// Evidence context for Health & Wellness cards (docs/MVP.md, PubMed). Server
// only. PubMed never makes a card: it adds one line to a card the cycle
// already picked, and a card without one is still a valid card. Counts are
// cached in evidence_cache for PUBMED_CACHE_TTL_DAYS, so most days the cycle
// asks NCBI nothing; a failed lookup only means no line. Opening a card
// never calls PubMed. Off until SOURCE_PUBMED_ENABLED=true (./enabled).

/** "PubMed mencatat 132 uji terkontrol acak …" and when its counts were fetched */
export type PubmedContext = NonNullable<Insight['pubmedContext']>;

const DAY = 86_400_000;
const config = () => ({
  tool: process.env.NCBI_TOOL || 'elias',
  email: process.env.NCBI_EMAIL ?? '',
  apiKey: process.env.NCBI_API_KEY || undefined,
  // NCBI's limits: 3 a second without a key, 10 with one
  rps: Math.min(Number(process.env.PUBMED_RPS) || 3, process.env.NCBI_API_KEY ? 10 : 3),
  years: Number(process.env.PUBMED_WINDOW_YEARS) || 5,
  ttlMs: (Number(process.env.PUBMED_CACHE_TTL_DAYS) || 14) * DAY,
  minTotal: Number(process.env.PUBMED_MIN_TOTAL) || 1,
});

let warnedNoEmail = false;

type Trend = { tags: string[]; signal: string; brandCategories?: string[] };
type CachedRow = { term_key: string; query: string; window_years: number; total: number; by_type: Record<string, number>; fetched_at: string };

/**
 * The PubMed line for each Health & Wellness trend that names a curated term,
 * by position. Empty when PubMed is off or anything fails. Never throws.
 */
export async function pubmedContextFor(trends: Trend[]): Promise<Map<number, PubmedContext>> {
  const lines = new Map<number, PubmedContext>();
  if (!pubmedEnabled()) return lines;
  const settings = config();
  // NCBI requires a registered developer address on every request
  if (!settings.email) {
    if (!warnedNoEmail) console.warn('PubMed: NCBI_EMAIL is not set, so it is skipped');
    warnedNoEmail = true;
    return lines;
  }
  const matched = trends.flatMap((trend, i) => {
    if (!trend.brandCategories?.includes('health_wellness')) return [];
    const found = matchTerm(TERM_MAP, trend.tags, trend.signal);
    return found ? [{ i, key: found[0], term: found[1] }] : [];
  });
  if (!matched.length) return lines;
  const admin = createAdminClient();
  if (!admin) return lines;

  const keys = [...new Set(matched.map(({ key }) => key))];
  const { data, error } = await admin.rpc('pubmed_cached_counts', { p_term_keys: keys });
  if (error) console.error('PubMed: reading the cache failed', error.message);
  const cached = new Map(((data ?? []) as CachedRow[]).map((row) => [row.term_key, row]));

  const counts = new Map<string, { counts: PubmedCounts; fetchedAt: string }>();
  for (const key of keys) {
    const term = TERM_MAP[key as keyof typeof TERM_MAP];
    const query = pubmedQueries(term.pubmed, settings.years).total;
    const row = cached.get(key);
    // Fresh, and for the same query and window: the term map may have changed since
    if (row && row.query === query && row.window_years === settings.years && Date.now() - Date.parse(row.fetched_at) < settings.ttlMs) {
      counts.set(key, {
        counts: { total: row.total, rct: row.by_type.rct ?? 0, systematicReview: row.by_type.systematic_review ?? 0, metaAnalysis: row.by_type.meta_analysis ?? 0 },
        fetchedAt: row.fetched_at,
      });
      continue;
    }
    const fetched = await fetchPubmedCounts(term.pubmed, settings.years, settings);
    if (!fetched) continue;
    const fetchedAt = new Date().toISOString();
    counts.set(key, { counts: fetched, fetchedAt });
    const { error: storeError } = await admin.rpc('pubmed_store_counts', {
      p_term_key: key,
      p_query: query,
      p_window_years: settings.years,
      p_total: fetched.total,
      p_by_type: { rct: fetched.rct, systematic_review: fetched.systematicReview, meta_analysis: fetched.metaAnalysis },
    });
    if (storeError) console.error('PubMed: caching the counts failed', storeError.message);
  }

  for (const { i, key, term } of matched) {
    const found = counts.get(key);
    const line = found && composePubmedLine(term.label, found.counts, settings.years, settings.minTotal);
    if (found && line) lines.set(i, { line, fetchedAt: found.fetchedAt });
  }
  return lines;
}
