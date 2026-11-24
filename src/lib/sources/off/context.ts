import type { Insight } from '../../insights/types';
import { createAdminClient } from '../../supabase/admin';
import { composeOffLine, matchEntries, type OffEntry, type TagStat } from './compose';
import { offEnabled } from './enabled';
import watchlist from './watchlist.json';

// Open Food Facts context for Food & Beverage cards (docs/MVP.md, Open Food
// Facts). Server only. The only module besides scripts/off-refresh.mjs that
// knows OFF: it reads the stored snapshot, never OFF itself, so the cycle
// never waits on OFF and a failed refresh only means an older snapshot or no
// line. OFF never makes a card: it adds one line to a card the cycle already
// picked, and a card without one is still a valid card. Off until
// SOURCE_OFF_ENABLED=true (./enabled).

/** "Dari 120 produk minuman Indonesia di Open Food Facts, 18% berlabel halal.", its sample and snapshot time */
export type OffContext = NonNullable<Insight['offContext']>;

const entries = watchlist.entries as OffEntry[];

// A starting value, to retune once the first snapshot's sample sizes are known
const minSample = () => Number(process.env.OFF_MIN_SAMPLE) || 30;

type Trend = { tags: string[]; signal: string; brandCategories?: string[] };

/**
 * The OFF line for each Food & Beverage trend that matches the watchlist and
 * has enough products, by position. Empty when OFF is off or anything fails.
 * Never throws.
 */
export async function offContextFor(trends: Trend[]): Promise<Map<number, OffContext>> {
  const lines = new Map<number, OffContext>();
  if (!offEnabled()) return lines;
  const matched = trends.flatMap((trend, i) => {
    if (!trend.brandCategories?.includes('food_beverage')) return [];
    const candidates = matchEntries(entries, trend.tags, trend.signal);
    return candidates.length ? [{ i, candidates }] : [];
  });
  if (!matched.length) return lines;
  const admin = createAdminClient();
  if (!admin) return lines;

  const all = matched.flatMap(({ candidates }) => candidates);
  const categoryTags = [...new Set(all.map((entry) => entry.category))];
  const labelTags = [...new Set(all.flatMap((entry) => (entry.label ? [entry.label] : [])))];
  const [tagResult, pairResult] = await Promise.all([
    admin.rpc('off_tag_stats', { p_tags: categoryTags }),
    labelTags.length ? admin.rpc('off_pair_stats', { p_categories: categoryTags, p_labels: labelTags }) : Promise.resolve({ data: [], error: null }),
  ]);
  if (tagResult.error || pairResult.error) {
    console.error('Open Food Facts: reading the snapshot failed', (tagResult.error ?? pairResult.error)?.message);
    return lines;
  }

  type TagRow = { tag: string; tag_type: string; n: number; nutriscore: Record<string, number>; refreshed_at: string };
  type PairRow = { category: string; label: string; n: number };
  const categories = new Map(
    ((tagResult.data ?? []) as TagRow[]).filter((row) => row.tag_type === 'category').map((row) => [row.tag, row]),
  );
  const pairs = new Map(((pairResult.data ?? []) as PairRow[]).map((row) => [`${row.category}\t${row.label}`, row.n]));

  for (const { i, candidates } of matched) {
    for (const entry of candidates) {
      const row = categories.get(entry.category);
      const stat: TagStat | null = row ? { n: row.n, nutriscore: row.nutriscore } : null;
      const pair = entry.label ? (pairs.get(`${entry.category}\t${entry.label}`) ?? 0) : null;
      const composed = composeOffLine(entry, stat, pair, minSample());
      if (composed && row) {
        lines.set(i, { ...composed, refreshedAt: row.refreshed_at });
        break;
      }
    }
  }
  return lines;
}
