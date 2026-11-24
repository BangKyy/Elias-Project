// football-data.org checks before SOURCE_FOOTBALLDATA_ENABLED (docs/MVP.md
// checklist): only names, dates and numbers are kept, requests carry nothing
// but competition codes and dates, a stale snapshot or a failure means no
// line, the refresh keeps to the rate, and no line predicts or mentions odds.
// `npm run test:football`
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { composeFootballLine, matchCompetition, wibKickoff } from '../src/lib/sources/footballdata/compose.ts';
import { FOOTBALL_TOPICS } from '../src/lib/sources/footballdata/topicMap.ts';
import { createClient, normalizeMatches, normalizeStandings, refresh } from './football-refresh.mjs';

// Shaped like docs.football-data.org's v4 samples, with the parts Elias must never keep
const team = (name) => ({ id: 1, name, shortName: name, tla: 'XXX', crest: 'https://crests.football-data.org/1.png', coach: { name: 'Coach' }, lineup: [{ name: 'Player' }] });
const matchesAnswer = {
  competition: { id: 2021, name: 'Premier League', code: 'PL', type: 'LEAGUE', emblem: 'https://crests.football-data.org/PL.png' },
  matches: [
    { id: 1, utcDate: '2026-11-29T15:00:00Z', status: 'TIMED', matchday: 13, homeTeam: team('Arsenal FC'), awayTeam: team('Chelsea FC'), score: { fullTime: { home: null, away: null } }, odds: { homeWin: 1.5 }, referees: [{ name: 'Ref' }] },
    { id: 2, utcDate: '2026-11-22T15:00:00Z', status: 'FINISHED', matchday: 12, homeTeam: team('Liverpool FC'), awayTeam: team('Everton FC'), score: { fullTime: { home: 2, away: 0 } }, goals: [{ scorer: { name: 'Scorer' } }] },
    { id: 3, utcDate: 'not a date', status: 'TIMED', homeTeam: team('A'), awayTeam: team('B') },
  ],
};
const standingsAnswer = {
  season: { startDate: '2026-08-21', currentMatchday: 12 },
  standings: [
    { type: 'TOTAL', group: null, table: [{ position: 1, team: team('Arsenal FC'), playedGames: 12, points: 28, form: 'WWDWW' }, { position: 2, team: team('Manchester City FC'), playedGames: 12, points: 26 }] },
    { type: 'HOME', group: null, table: [{ position: 1, team: team('Liverpool FC'), playedGames: 6, points: 18 }] },
  ],
};

test('only names, dates and numbers are kept: no crests, players, odds or goals', () => {
  const fixtures = normalizeMatches(matchesAnswer);
  const table = normalizeStandings(standingsAnswer);
  assert.equal(fixtures.length, 2);
  assert.deepEqual(fixtures[1], { match_id: 2, kickoff_utc: '2026-11-22T15:00:00.000Z', matchday: 12, status: 'FINISHED', home_name: 'Liverpool FC', away_name: 'Everton FC', home_goals: 2, away_goals: 0 });
  assert.deepEqual(table, [
    { season: 2026, position: 1, team_name: 'Arsenal FC', played: 12, points: 28 },
    { season: 2026, position: 2, team_name: 'Manchester City FC', played: 12, points: 26 },
  ]);
  const kept = JSON.stringify({ fixtures, table });
  for (const leak of ['crest', 'png', 'Coach', 'Player', 'Scorer', 'Ref', 'homeWin', 'WWDWW']) assert.ok(!kept.includes(leak), leak);
});

test('a cup has no table: standings 404 is a valid empty answer', async () => {
  const get = createClient({ token: 't', rpm: 100_000, fetch: async () => new Response('', { status: 404 }) });
  assert.equal(await get('/competitions/CL/standings'), null);
  assert.deepEqual(normalizeStandings(null), []);
});

test('requests carry only the token, competition codes and dates: nothing about a brand', async () => {
  const sent = [];
  const get = createClient({
    token: 'secret-token',
    rpm: 100_000,
    fetch: async (url, init) => {
      sent.push({ url: new URL(url), token: init.headers['X-Auth-Token'] });
      return Response.json(url.includes('standings') ? standingsAnswer : matchesAnswer);
    },
  });
  await refresh({ get, codes: ['PL'], store: async () => {}, now: Date.parse('2026-11-24T00:00:00Z'), log: {} });
  assert.deepEqual(sent.map(({ url }) => `${url.pathname}${url.search}`), ['/v4/competitions/PL/standings', '/v4/competitions/PL/matches?dateFrom=2026-11-21&dateTo=2026-12-01']);
  for (const { url, token } of sent) {
    assert.equal(token, 'secret-token');
    assert.ok(!url.search.includes('secret-token'), 'the token stays out of the URL');
  }
});

test('one competition failing never stops the others, and 429, 5xx and timeouts are failures', async () => {
  const failures = [() => new Response('{"message":"slow down"}', { status: 429 }), () => new Response('', { status: 503 }), () => { throw new DOMException('timed out', 'TimeoutError'); }];
  for (const fail of failures) {
    const stored = [];
    const get = createClient({ token: 't', rpm: 100_000, fetch: async (url) => (url.includes('/BL1/') ? fail() : Response.json(url.includes('standings') ? standingsAnswer : matchesAnswer)) });
    const count = await refresh({ get, codes: ['PL', 'BL1', 'SA'], store: async (code) => stored.push(code), log: {} });
    assert.equal(count, 2);
    assert.deepEqual(stored, ['PL', 'SA']);
  }
});

test('a full refresh keeps to the request rate', async () => {
  const times = [];
  const get = createClient({ token: 't', rpm: 600, fetch: async (url) => { times.push(Date.now()); return Response.json(url.includes('standings') ? standingsAnswer : matchesAnswer); } });
  await refresh({ get, codes: ['PL', 'SA', 'PD'], store: async () => {}, log: {} });
  assert.equal(times.length, 6);
  // The k-th request never comes before its slot, k × 100 ms after the first (a late timer can shorten one gap, never the total)
  for (let i = 1; i < times.length; i++) assert.ok(times[i] - times[0] >= i * 100 - 5, `request ${i} after ${times[i] - times[0]} ms at 600 a minute`);
});

const now = Date.parse('2026-11-24T03:00:00Z');
const competition = { competition_code: 'PL', name: 'Premier League', type: 'LEAGUE', current_matchday: 12, fetched_at: '2026-11-24T20:00:00Z' };
const fixtures = [
  { competition_code: 'PL', kickoff_utc: '2026-11-29T15:00:00Z', status: 'TIMED', matchday: 13 },
  { competition_code: 'PL', kickoff_utc: '2026-11-28T20:00:00Z', status: 'POSTPONED', matchday: 13 },
  { competition_code: 'PL', kickoff_utc: '2026-11-30T16:30:00Z', status: 'SCHEDULED', matchday: 13 },
  { competition_code: 'PL', kickoff_utc: '2026-11-22T15:00:00Z', status: 'FINISHED', matchday: 12 },
];
const standings = [{ competition_code: 'PL', position: 1, team_name: 'Arsenal FC', played: 12, points: 28 }];
const fresh = { ...competition, fetched_at: '2026-11-23T20:00:00Z' };

test('the line gives the schedule in WIB and the table as a record, without postponed matches', () => {
  assert.equal(wibKickoff('2026-11-29T15:00:00Z'), 'Minggu, 29 Nov, 22.00 WIB');
  assert.equal(
    composeFootballLine('Liga Inggris', fresh, fixtures, standings, { now }),
    'Liga Inggris memasuki pekan 13. Pertandingan berikutnya Minggu, 29 Nov, 22.00 WIB, dengan 2 laga dalam 7 hari ke depan. Klasemen Liga Inggris per 24 Nov: Arsenal FC memimpin dengan 28 poin dari 12 laga.',
  );
  // A cup: no matchday, no table
  assert.equal(
    composeFootballLine('Liga Champions', { ...fresh, type: 'CUP' }, fixtures, [], { now }),
    'Liga Champions: pertandingan berikutnya Minggu, 29 Nov, 22.00 WIB, dengan 2 laga dalam 7 hari ke depan.',
  );
});

test('a stale snapshot, or one with nothing ahead and no table, gives no line', () => {
  assert.equal(composeFootballLine('Liga Inggris', { ...fresh, fetched_at: '2026-11-22T14:00:00Z' }, fixtures, standings, { now, maxAgeHours: 36 }), null);
  assert.equal(composeFootballLine('Liga Inggris', undefined, fixtures, standings, { now }), null);
  assert.equal(composeFootballLine('Piala Dunia', { ...fresh, type: 'CUP' }, [], [], { now }), null);
});

test('no line mentions odds, betting or who will win', () => {
  const line = composeFootballLine('Liga Inggris', fresh, fixtures, standings, { now });
  for (const word of ['odds', 'taruhan', 'judi', 'prediksi', 'menang', 'favorit', 'peluang']) assert.ok(!line.toLowerCase().includes(word), word);
});

test('trends match a covered competition on whole words, never a currency or another country', () => {
  assert.equal(matchCompetition(FOOTBALL_TOPICS, ['liga inggris', 'derby'], 'Derby London ramai dibahas'), 'PL');
  assert.equal(matchCompetition(FOOTBALL_TOPICS, ['liga champions'], ''), 'CL');
  assert.equal(matchCompetition(FOOTBALL_TOPICS, ['euro', 'kurs'], 'Kurs euro melemah'), null);
  assert.equal(matchCompetition(FOOTBALL_TOPICS, ['liga 1', 'persib'], 'Persib juara Liga 1'), null);
  assert.equal(matchCompetition(FOOTBALL_TOPICS, ['liga brasil'], ''), 'BSA');
});
