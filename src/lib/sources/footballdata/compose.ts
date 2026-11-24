// The football-data.org sentence on a Sports card, composed in code from the
// stored snapshot so the model never writes a date or a number. Schedule and
// standings as a record, never a prediction, odds or betting; times in WIB.
// No imports: scripts/football.test.mjs runs this file directly.

export type CachedCompetition = { competition_code: string; name: string; type: string; current_matchday: number | null; fetched_at: string };
export type CachedFixture = { competition_code: string; kickoff_utc: string; status: string; matchday: number | null };
export type CachedStanding = { competition_code: string; position: number; team_name: string; played: number; points: number };

type Topic = { match: string[]; name: string };

// Postponed, cancelled or suspended matches are not on the schedule
const UPCOMING = new Set(['SCHEDULED', 'TIMED']);
const DAY = 86_400_000;

/** The first competition the trend's tags or claim name, whole words only; null when none does. */
export function matchCompetition<T extends Topic>(topics: Record<string, T>, tags: string[], signal: string): string | null {
  const text = ` ${[...tags, signal].join(' ').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ')} `;
  const found = Object.entries(topics).find(([, topic]) =>
    topic.match.some((word) => text.includes(` ${word.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ')} `)),
  );
  return found ? found[0] : null;
}

const wib = (iso: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', ...options }).format(new Date(iso));

/** "Sabtu, 29 Nov, 22.00 WIB" */
export function wibKickoff(iso: string): string {
  return `${wib(iso, { weekday: 'long' })}, ${wib(iso, { day: 'numeric', month: 'short' })}, ${wib(iso, { hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', '.')} WIB`;
}

/**
 * "Liga Inggris memasuki pekan 12. Pertandingan berikutnya Sabtu, 29 Nov,
 * 22.00 WIB, dengan 10 laga dalam 7 hari ke depan. Klasemen per 24 Nov:
 * Arsenal memimpin dengan 28 poin dari 11 laga." Null when the snapshot is
 * older than `maxAgeHours` or has neither an upcoming match nor a table.
 */
export function composeFootballLine(
  name: string,
  competition: CachedCompetition | undefined,
  fixtures: CachedFixture[],
  standings: CachedStanding[],
  { now = Date.now(), maxAgeHours = 36, windowDays = 7 } = {},
): string | null {
  if (!competition || now - Date.parse(competition.fetched_at) > maxAgeHours * 3_600_000) return null;
  const upcoming = fixtures
    .filter((match) => UPCOMING.has(match.status))
    .filter((match) => {
      const kickoff = Date.parse(match.kickoff_utc);
      return kickoff > now && kickoff <= now + windowDays * DAY;
    })
    .sort((a, b) => a.kickoff_utc.localeCompare(b.kickoff_utc));
  const leader = standings.find((row) => row.position === 1);

  const sentences: string[] = [];
  if (upcoming.length) {
    const matchday = competition.type === 'LEAGUE' ? (upcoming[0].matchday ?? competition.current_matchday) : null;
    const opening = matchday ? `${name} memasuki pekan ${matchday}. Pertandingan berikutnya` : `${name}: pertandingan berikutnya`;
    sentences.push(`${opening} ${wibKickoff(upcoming[0].kickoff_utc)}, dengan ${upcoming.length} laga dalam ${windowDays} hari ke depan.`);
  }
  if (leader) {
    const asOf = wib(competition.fetched_at, { day: 'numeric', month: 'short' });
    sentences.push(`Klasemen ${name} per ${asOf}: ${leader.team_name} memimpin dengan ${leader.points} poin dari ${leader.played} laga.`);
  }
  return sentences.length ? sentences.join(' ') : null;
}
