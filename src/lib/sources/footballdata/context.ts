import type { Insight } from '../../insights/types';
import { createAdminClient } from '../../supabase/admin';
import { composeFootballLine, matchCompetition, type CachedCompetition, type CachedFixture, type CachedStanding } from './compose';
import { footballEnabled } from './enabled';
import { FOOTBALL_TOPICS, type CompetitionCode } from './topicMap';

// Schedule and standings context for Sports cards (docs/MVP.md,
// football-data.org). Server only. Reads the snapshot GitHub Actions stores
// each morning (scripts/football-refresh.mjs) and never calls the provider,
// so the app needs no token and a failed refresh only means an older snapshot
// or, past FOOTBALLDATA_MAX_AGE_HOURS, no line. football-data.org never makes
// a card: it adds one line to a Sports card the cycle already picked. Off
// until SOURCE_FOOTBALLDATA_ENABLED=true (./enabled).

/** "Liga Inggris memasuki pekan 12. …" and when the snapshot behind it was fetched */
export type FootballContext = NonNullable<Insight['footballContext']>;

type Trend = { tags: string[]; signal: string; brandCategories?: string[] };
type Snapshot = { competitions: CachedCompetition[]; fixtures: CachedFixture[]; standings: CachedStanding[] };

/**
 * The football line for each Sports trend that names a covered competition,
 * by position. Empty when the source is off or anything fails. Never throws.
 */
export async function footballContextFor(trends: Trend[]): Promise<Map<number, FootballContext>> {
  const lines = new Map<number, FootballContext>();
  if (!footballEnabled()) return lines;
  const matched = trends.flatMap((trend, i) => {
    if (!trend.brandCategories?.includes('sports')) return [];
    const code = matchCompetition(FOOTBALL_TOPICS, trend.tags, trend.signal) as CompetitionCode | null;
    return code ? [{ i, code }] : [];
  });
  if (!matched.length) return lines;
  const admin = createAdminClient();
  if (!admin) return lines;

  const { data, error } = await admin.rpc('football_read', { p_codes: [...new Set(matched.map(({ code }) => code))] });
  if (error || !data) {
    if (error) console.error('football-data.org: reading the snapshot failed', error.message);
    return lines;
  }
  const snapshot = data as Snapshot;
  const maxAgeHours = Number(process.env.FOOTBALLDATA_MAX_AGE_HOURS) || 36;
  const windowDays = Number(process.env.FOOTBALLDATA_FIXTURE_WINDOW_DAYS) || 7;

  for (const { i, code } of matched) {
    const competition = snapshot.competitions.find((row) => row.competition_code === code);
    const line = composeFootballLine(
      FOOTBALL_TOPICS[code].name,
      competition,
      snapshot.fixtures.filter((row) => row.competition_code === code),
      snapshot.standings.filter((row) => row.competition_code === code),
      { maxAgeHours, windowDays },
    );
    if (competition && line) lines.set(i, { line, fetchedAt: competition.fetched_at });
  }
  return lines;
}
