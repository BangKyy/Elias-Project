// football-data.org daily snapshot (docs/MVP.md, football-data.org). Runs in
// GitHub Actions (.github/workflows/football-refresh.yml) before the day's
// cards, never in a web route: 12 competitions × 2 requests at
// FOOTBALLDATA_RPM_CAP (6) a minute is about 4 minutes. The daily cycle only
// reads what this stores.
//
// The one module that knows football-data.org's v4 answers. Checked against
// docs.football-data.org on 24 Nov 2026: matches carry `utcDate`, `status`,
// `matchday`, `homeTeam.name`, `awayTeam.name`, `score.fullTime.home/away`;
// standings carry `standings[]` with `type` TOTAL/HOME/AWAY and `table[]`
// rows of `position`, `team.name`, `playedGames`, `points`; CUP and PLAYOFFS
// competitions answer standings with 404, which is a valid "no table". Only
// names, dates and numbers are kept: never crests, players or odds (terms §9.2).
//
// Env: FOOTBALLDATA_API_TOKEN (secret), NEXT_PUBLIC_SUPABASE_URL,
// SUPABASE_SECRET_KEY, SOURCE_FOOTBALLDATA_ENABLED; optional
// FOOTBALLDATA_BASE_URL, FOOTBALLDATA_COMPETITIONS, FOOTBALLDATA_RPM_CAP,
// FOOTBALLDATA_FIXTURE_WINDOW_DAYS, FOOTBALLDATA_RESULT_WINDOW_DAYS.
// While the source is off, a run empties the snapshot instead (terms §4.6,
// §9.1). `--dry-run` fetches and prints without storing; `--purge` only empties.

import { pathToFileURL } from 'node:url';

// The 12 free-plan competitions, confirmed with GET /v4/competitions on 24 Nov 2026
export const DEFAULT_COMPETITIONS = ['PL', 'ELC', 'CL', 'BL1', 'SA', 'PD', 'FL1', 'DED', 'PPL', 'BSA', 'WC', 'EC'];
const BASE_URL = 'https://api.football-data.org/v4';
const TIMEOUT_MS = 15_000;

export class FootballDataError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** A client spaced to `rpm` requests a minute. 404 is "no data" (null); every other failure throws. */
export function createClient({ token, baseUrl = BASE_URL, rpm = 6, fetch: fetchImpl = fetch }) {
  let nextSlot = 0;
  const gap = Math.ceil(60_000 / Math.max(rpm, 0.1));
  return async function get(path, params = {}) {
    const now = Date.now();
    const slot = Math.max(now, nextSlot);
    nextSlot = slot + gap;
    if (slot > now) await new Promise((resolve) => setTimeout(resolve, slot - now));
    const query = new URLSearchParams(params).toString();
    const response = await fetchImpl(`${baseUrl}${path}${query ? `?${query}` : ''}`, {
      headers: { 'X-Auth-Token': token },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (response.status === 404) return null;
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new FootballDataError(response.status, `football-data ${response.status}${body?.message || body?.error ? `: ${body.message ?? body.error}` : ''}`);
    }
    return response.json();
  };
}

const nameOf = (team) => (typeof team?.name === 'string' && team.name.trim() ? team.name.trim().slice(0, 80) : null);
const intOrNull = (value) => (Number.isInteger(value) ? value : null);

/** The fixtures of a /competitions/{code}/matches answer, names, dates and numbers only. */
export function normalizeMatches(answer) {
  const matches = Array.isArray(answer?.matches) ? answer.matches : [];
  return matches.flatMap((match) => {
    if (!Number.isInteger(match?.id) || typeof match.utcDate !== 'string' || Number.isNaN(Date.parse(match.utcDate)) || typeof match.status !== 'string') {
      return [];
    }
    return [
      {
        match_id: match.id,
        kickoff_utc: new Date(match.utcDate).toISOString(),
        matchday: intOrNull(match.matchday),
        status: match.status,
        home_name: nameOf(match.homeTeam),
        away_name: nameOf(match.awayTeam),
        home_goals: match.status === 'FINISHED' ? intOrNull(match.score?.fullTime?.home) : null,
        away_goals: match.status === 'FINISHED' ? intOrNull(match.score?.fullTime?.away) : null,
      },
    ];
  });
}

/**
 * The league table of a /competitions/{code}/standings answer; [] for none.
 * The only TOTAL table, whatever its group: live answers label most leagues'
 * one table `group: "Matchday"` (24 Nov 2026), though the docs show null.
 * With several (real groups), only an ungrouped one.
 */
export function normalizeStandings(answer) {
  const totals = (Array.isArray(answer?.standings) ? answer.standings : []).filter((entry) => entry?.type === 'TOTAL');
  const total = totals.length === 1 ? totals[0] : totals.find((entry) => !entry.group);
  const season = Number.parseInt(String(answer?.season?.startDate ?? '').slice(0, 4), 10);
  return (Array.isArray(total?.table) ? total.table : []).flatMap((row) => {
    const team = nameOf(row?.team);
    if (!team || !Number.isInteger(row.position) || !Number.isInteger(row.playedGames) || !Number.isInteger(row.points)) return [];
    return [{ season: Number.isInteger(season) ? season : null, position: row.position, team_name: team, played: row.playedGames, points: row.points }];
  });
}

/** The competition facts the cycle needs, from whichever answer came back. */
export function normalizeCompetition(code, ...answers) {
  const competition = answers.find((answer) => answer?.competition)?.competition;
  const season = answers.find((answer) => answer?.season)?.season ?? answers.find((answer) => answer?.matches?.[0]?.season)?.matches[0].season;
  return {
    name: typeof competition?.name === 'string' ? competition.name : code,
    type: typeof competition?.type === 'string' ? competition.type : 'UNKNOWN',
    current_matchday: intOrNull(season?.currentMatchday),
  };
}

const isoDate = (time) => new Date(time).toISOString().slice(0, 10);

/**
 * Fetches every competition and hands each snapshot to `store`. One
 * competition failing never stops the rest. Returns how many were stored.
 */
export async function refresh({ get, codes, store, now = Date.now(), fixtureDays = 7, resultDays = 3, log = console }) {
  const dateFrom = isoDate(now - resultDays * 86_400_000);
  const dateTo = isoDate(now + fixtureDays * 86_400_000);
  let stored = 0;
  for (const code of codes) {
    try {
      // One after the other: the client spaces them anyway
      const standings = await get(`/competitions/${code}/standings`);
      const matches = await get(`/competitions/${code}/matches`, { dateFrom, dateTo });
      if (!matches && !standings) throw new Error('no answer for this competition');
      const fixtures = normalizeMatches(matches);
      const table = normalizeStandings(standings);
      await store(code, normalizeCompetition(code, standings, matches), fixtures, table);
      stored += 1;
      log.info?.(`${code}: ${fixtures.length} fixtures, ${table.length} table rows`);
    } catch (error) {
      log.warn?.(`${code}: refresh failed, ${error instanceof Error ? error.message : error}`);
    }
  }
  return stored;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const purgeOnly = process.argv.includes('--purge');
  const enabled = process.env.SOURCE_FOOTBALLDATA_ENABLED === 'true';

  let admin = null;
  if (!dryRun) {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!base || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are needed to store or purge the snapshot');
    const { createClient: createSupabase } = await import('@supabase/supabase-js');
    admin = createSupabase(base, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }

  // Off, or asked to: nothing of the provider's may stay stored (terms §4.6, §9.1)
  if (admin && (purgeOnly || !enabled)) {
    const { error } = await admin.rpc('football_purge_all');
    if (error) throw new Error(`Purging the snapshot failed: ${error.message}`);
    console.log(purgeOnly ? 'Snapshot purged' : 'SOURCE_FOOTBALLDATA_ENABLED is not true: snapshot purged, nothing fetched');
    return;
  }

  const token = process.env.FOOTBALLDATA_API_TOKEN;
  if (!token) throw new Error('FOOTBALLDATA_API_TOKEN is not set');
  const codes = (process.env.FOOTBALLDATA_COMPETITIONS || DEFAULT_COMPETITIONS.join(','))
    .split(',')
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean);
  const get = createClient({ token, baseUrl: process.env.FOOTBALLDATA_BASE_URL || BASE_URL, rpm: Number(process.env.FOOTBALLDATA_RPM_CAP) || 6 });

  const store = dryRun
    ? async (code, competition, fixtures, standings) => console.log(JSON.stringify({ code, competition, fixtures: fixtures.slice(0, 3), fixtureCount: fixtures.length, standings: standings.slice(0, 3) }))
    : async (code, competition, fixtures, standings) => {
        const { error } = await admin.rpc('football_replace_competition', { p_code: code, p_competition: competition, p_fixtures: fixtures, p_standings: standings });
        if (error) throw new Error(`storing failed: ${error.message}`);
      };

  const started = Date.now();
  const stored = await refresh({
    get,
    codes,
    store,
    fixtureDays: Number(process.env.FOOTBALLDATA_FIXTURE_WINDOW_DAYS) || 7,
    resultDays: Number(process.env.FOOTBALLDATA_RESULT_WINDOW_DAYS) || 3,
  });
  console.log(`${stored}/${codes.length} competitions ${dryRun ? 'fetched' : 'stored'} in ${Math.round((Date.now() - started) / 1000)} s`);
  if (!stored) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
