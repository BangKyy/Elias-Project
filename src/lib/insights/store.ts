import type { SupabaseClient } from '@supabase/supabase-js';
import { creativeRoleLabels, type CreativeRole } from '../creativeRoles';
import { daysBefore } from '../dates';
import { isBrandCategory } from '../brandCategories';
import { createAdminClient } from '../supabase/admin';
import { isAudienceMarket } from '../targetMarkets';
import { sources, type Evidence, type Insight, type SourceId, type Verdict } from './types';

// Stored daily cycles (supabase/migrations/20261102120000_insight_cycles.sql).
// Beranda shows today and the 4 days before; pg_cron deletes anything older
// every night, and the read policy hides it even if a run is missed.

/** Days of cycles Beranda shows, today included. Keep in sync with insight_window_start(). */
export const feedWindowDays = 5;

export type StoredCard = { cycleDate: string; insight: Insight };

type InsightRow = {
  id: string;
  cycle_date: string;
  position: number;
  source: string;
  category: string;
  brand_categories?: string[] | null;
  audiences?: string[] | null;
  tags: string[];
  observed_on: string;
  signal: string;
  lifecycle: string | null;
  verdict: string;
  why_it_matters: string;
  recommendations: unknown;
  evidence: unknown;
};

const roles = Object.keys(creativeRoleLabels) as CreativeRole[];

function isEvidence(value: unknown): value is Evidence {
  if (typeof value !== 'object' || value === null) return false;
  const { title, url, detail, source } = value as Record<string, unknown>;
  return (
    typeof title === 'string' &&
    typeof url === 'string' &&
    typeof detail === 'string' &&
    // Absent on cards stored before 19 Nov 2026
    (source === undefined || (typeof source === 'string' && source in sources))
  );
}

/** Rows are written by our own generator, but jsonb is still checked before it reaches a card. */
function toInsight(row: InsightRow): Insight | null {
  if (!(row.source in sources) || !['act', 'watch', 'skip'].includes(row.verdict)) return null;
  const recs = row.recommendations as Record<string, unknown> | null;
  if (!recs || !roles.every((role) => typeof recs[role] === 'string')) return null;
  return {
    id: row.id,
    source: row.source as SourceId,
    category: row.category,
    ...(row.brand_categories && { brandCategories: row.brand_categories.filter(isBrandCategory) }),
    ...(row.audiences && { audiences: row.audiences.filter(isAudienceMarket) }),
    tags: row.tags,
    observedOn: row.observed_on,
    signal: row.signal,
    ...(row.lifecycle && { lifecycle: row.lifecycle }),
    verdict: row.verdict as Verdict,
    whyItMatters: row.why_it_matters,
    recommendations: recs as Record<CreativeRole, string>,
    evidence: Array.isArray(row.evidence) ? row.evidence.filter(isEvidence) : [],
  };
}

export type StoredWindow = {
  /** Days in the window that already have a cycle, quiet days included */
  cycleDates: Set<string>;
  /** Newest day first, in the generator's order within a day */
  cards: StoredCard[];
};

const cardColumns =
  'id, cycle_date, position, source, category, tags, observed_on, signal, lifecycle, verdict, why_it_matters, recommendations, evidence';

// Until 20261105090000_insight_persona_tags.sql is applied, the feed
// still reads and saves, just without the persona tags
const TAGS_MIGRATION = '20261105090000_insight_persona_tags.sql';
const tagColumns = 'brand_categories, audiences';
const missingColumn = (error: { code?: string } | null) => error?.code === '42703' || error?.code === 'PGRST204';
// Until 20261106090000_insight_news_source.sql is applied, the source check
// rejects "news": those cards are saved under GDELT, the other news source,
// rather than losing the day and spending quota on generating it again
const NEWS_MIGRATION = '20261106090000_insight_news_source.sql';
// Likewise "wikipedia" until 20261119090000_insight_wikipedia_source.sql: saved
// under Google Trends, the other what-people-looked-up source
const WIKIPEDIA_MIGRATION = '20261119090000_insight_wikipedia_source.sql';
// And "github" until 20261119120000_insight_github_source.sql, under Google Trends too
const GITHUB_MIGRATION = '20261119120000_insight_github_source.sql';
const checkViolation = (error: { code?: string } | null) => error?.code === '23514';
// Open Food Facts lines live apart from the cards, readable by signed-in users
// only (BR-4); until 20261124090000_open_food_facts.sql is applied there are none
const OFF_MIGRATION = '20261124090000_open_food_facts.sql';
const missingTable = (error: { code?: string } | null) => error?.code === '42P01' || error?.code === 'PGRST205';

type OffRow = { insight_id: string; line: string; sample: number; refreshed_at: string };

/** The Open Food Facts lines of these cards; RLS answers guests with none. */
async function readOffContext(supabase: SupabaseClient, ids: string[]): Promise<Map<string, NonNullable<Insight['offContext']>>> {
  if (!ids.length) return new Map();
  const { data, error } = await supabase
    .from('insight_off_context')
    .select('insight_id, line, sample, refreshed_at')
    .in('insight_id', ids)
    .returns<OffRow[]>();
  if (error && !missingTable(error)) console.error('Insight store: reading Open Food Facts lines failed', error.message);
  return new Map((data ?? []).map((row) => [row.insight_id, { line: row.line, sample: row.sample, refreshedAt: row.refreshed_at }]));
}

// PubMed and football-data.org lines likewise, one row per card and source,
// until 20261124100000_pubmed_evidence.sql is applied (football-data.org also
// needs 20261124110000_football_data.sql to widen the source check)
const EVIDENCE_MIGRATION = '20261124100000_pubmed_evidence.sql';
const FOOTBALL_MIGRATION = '20261124110000_football_data.sql';

type EvidenceRow = { insight_id: string; source: string; line: string; fetched_at: string };
type EvidenceLine = { line: string; fetchedAt: string };

/** The PubMed and football-data.org lines of these cards, by source; RLS answers guests with none. */
async function readEvidenceContext(supabase: SupabaseClient, ids: string[]): Promise<Record<'pubmed' | 'footballdata', Map<string, EvidenceLine>>> {
  const lines = { pubmed: new Map<string, EvidenceLine>(), footballdata: new Map<string, EvidenceLine>() };
  if (!ids.length) return lines;
  const { data, error } = await supabase
    .from('insight_evidence_context')
    .select('insight_id, source, line, fetched_at')
    .in('insight_id', ids)
    .returns<EvidenceRow[]>();
  if (error && !missingTable(error)) console.error('Insight store: reading evidence lines failed', error.message);
  for (const row of data ?? []) {
    if (row.source === 'pubmed' || row.source === 'footballdata') lines[row.source].set(row.insight_id, { line: row.line, fetchedAt: row.fetched_at });
  }
  return lines;
}

function readCards(supabase: SupabaseClient, from: string, columns: string) {
  return supabase
    .from('insights')
    .select(columns)
    .gte('cycle_date', from)
    .order('cycle_date', { ascending: false })
    .order('position', { ascending: true })
    .returns<InsightRow[]>();
}

/** Every stored card from the last 5 days. Readable by guests too, through RLS. */
/** One stored card by id, while it is still in the 5-day window (RLS hides older ones); null otherwise. */
export async function readCard(supabase: SupabaseClient, id: string): Promise<Insight | null> {
  const { data, error } = await supabase.from('insights').select(cardColumns).eq('id', id).maybeSingle<InsightRow>();
  if (error) console.error('Insight store: reading a card failed', error.message);
  return data ? toInsight(data) : null;
}

export async function readWindow(supabase: SupabaseClient, today: string): Promise<StoredWindow> {
  const from = daysBefore(today, feedWindowDays - 1);
  const [cycles, tagged] = await Promise.all([
    supabase.from('insight_cycles').select('cycle_date').gte('cycle_date', from),
    readCards(supabase, from, `${cardColumns}, ${tagColumns}`),
  ]);
  let cards = tagged;
  if (missingColumn(cards.error)) {
    console.warn(`Insight store: the persona tag columns are missing; apply ${TAGS_MIGRATION}`);
    cards = await readCards(supabase, from, cardColumns);
  }
  if (cycles.error || cards.error) console.error('Insight store: read failed', cycles.error ?? cards.error);
  const ids = (cards.data ?? []).map((row) => row.id);
  const [off, evidence] = await Promise.all([readOffContext(supabase, ids), readEvidenceContext(supabase, ids)]);

  return {
    cycleDates: new Set((cycles.data ?? []).map((row) => row.cycle_date as string)),
    cards: (cards.data ?? []).flatMap((row) => {
      const insight = toInsight(row);
      if (!insight) return [];
      const offContext = off.get(row.id);
      const pubmedContext = evidence.pubmed.get(row.id);
      const footballContext = evidence.footballdata.get(row.id);
      return [
        {
          cycleDate: row.cycle_date,
          insight: { ...insight, ...(offContext && { offContext }), ...(pubmedContext && { pubmedContext }), ...(footballContext && { footballContext }) },
        },
      ];
    }),
  };
}

/**
 * Saves a generated day once. If another server instance already saved this
 * day, its cycle wins and these cards are dropped, so the feed never doubles.
 */
export async function saveCycle(date: string, insights: Insight[]): Promise<void> {
  const admin = createAdminClient();
  if (!admin) {
    console.warn('Insight store: SUPABASE_SECRET_KEY is not set, so today\'s cycle is kept in memory only');
    return;
  }

  const { data: created, error } = await admin
    .from('insight_cycles')
    .upsert({ cycle_date: date }, { onConflict: 'cycle_date', ignoreDuplicates: true })
    .select('cycle_date');
  if (error) {
    console.error('Insight store: saving the cycle failed', error);
    return;
  }
  if (!created?.length || !insights.length) return;

  const rows = insights.map((insight, position) => ({
    id: insight.id,
    cycle_date: date,
    position,
    source: insight.source,
    category: insight.category,
    brand_categories: insight.brandCategories ?? null,
    audiences: insight.audiences ?? null,
    tags: insight.tags,
    observed_on: insight.observedOn,
    signal: insight.signal,
    lifecycle: insight.lifecycle ?? null,
    verdict: insight.verdict,
    why_it_matters: insight.whyItMatters,
    recommendations: insight.recommendations,
    evidence: insight.evidence ?? [],
  }));
  // Each fallback below keeps the ones before it
  let tagged = true;
  const insertCards = (list: typeof rows) =>
    admin
      .from('insights')
      .insert(tagged ? list : list.map(({ brand_categories: _categories, audiences: _audiences, ...row }) => row));
  let { error: cardsError } = await insertCards(rows);
  if (missingColumn(cardsError)) {
    console.warn(`Insight store: saving cards without persona tags; apply ${TAGS_MIGRATION}`);
    tagged = false;
    ({ error: cardsError } = await insertCards(rows));
  }
  // Each newer migration also allows the sources before it, so the newest is tried first
  let sourced = rows;
  if (checkViolation(cardsError) && sourced.some((row) => row.source === 'github')) {
    console.warn(`Insight store: saving GitHub cards as Google Trends; apply ${GITHUB_MIGRATION}`);
    sourced = sourced.map((row) => (row.source === 'github' ? { ...row, source: 'google_trends' } : row));
    ({ error: cardsError } = await insertCards(sourced));
  }
  if (checkViolation(cardsError) && sourced.some((row) => row.source === 'wikipedia')) {
    console.warn(`Insight store: saving Wikipedia cards as Google Trends; apply ${WIKIPEDIA_MIGRATION}`);
    sourced = sourced.map((row) => (row.source === 'wikipedia' ? { ...row, source: 'google_trends' } : row));
    ({ error: cardsError } = await insertCards(sourced));
  }
  if (checkViolation(cardsError) && sourced.some((row) => row.source === 'news')) {
    console.warn(`Insight store: saving Media Indonesia cards as GDELT; apply ${NEWS_MIGRATION}`);
    sourced = sourced.map((row) => (row.source === 'news' ? { ...row, source: 'gdelt' } : row));
    ({ error: cardsError } = await insertCards(sourced));
  }
  if (cardsError) {
    console.error('Insight store: saving the cards failed', cardsError);
    // A cycle row without its cards would read as a quiet day; drop it so the day is generated again
    await admin.from('insight_cycles').delete().eq('cycle_date', date);
    return;
  }

  // A card without its context line is still a valid card, so a failure below keeps the day
  const offRows = insights.flatMap((insight) =>
    insight.offContext
      ? [{ insight_id: insight.id, line: insight.offContext.line, sample: insight.offContext.sample, refreshed_at: insight.offContext.refreshedAt }]
      : [],
  );
  if (offRows.length) {
    const { error: offError } = await admin.from('insight_off_context').insert(offRows);
    if (missingTable(offError)) console.warn(`Insight store: saving cards without their Open Food Facts lines; apply ${OFF_MIGRATION}`);
    else if (offError) console.error('Insight store: saving Open Food Facts lines failed', offError.message);
  }

  // PubMed and football-data.org go in separately, so a database without the
  // football migration (source check) still keeps the PubMed lines
  const evidence = [
    { source: 'pubmed', key: 'pubmedContext', label: 'PubMed', migration: EVIDENCE_MIGRATION },
    { source: 'footballdata', key: 'footballContext', label: 'football-data.org', migration: FOOTBALL_MIGRATION },
  ] as const;
  for (const { source, key, label, migration } of evidence) {
    const rows = insights.flatMap((insight) => {
      const context = insight[key];
      return context ? [{ insight_id: insight.id, source, line: context.line, fetched_at: context.fetchedAt }] : [];
    });
    if (!rows.length) continue;
    const { error } = await admin.from('insight_evidence_context').insert(rows);
    if (missingTable(error) || checkViolation(error)) console.warn(`Insight store: saving cards without their ${label} lines; apply ${migration}`);
    else if (error) console.error(`Insight store: saving ${label} lines failed`, error.message);
  }
}
