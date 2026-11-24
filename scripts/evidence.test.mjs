// PubMed checks before SOURCE_PUBMED_ENABLED (docs/MVP.md checklist): only
// counts leave PubMed, only curated terms reach it, no mapping or a failure
// means no line, and calls keep to the rate. `npm run test:evidence`
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { composePubmedLine, matchTerm } from '../src/lib/sources/evidence/compose.ts';
import { TERM_MAP } from '../src/lib/sources/evidence/termMap.ts';
import { fetchPubmedCounts, pubmedQueries } from '../src/lib/sources/pubmed/counts.ts';

const options = { tool: 'elias', email: 'dev@example.org', rps: 1000 };
const answer = (count, extra = {}) => new Response(JSON.stringify({ esearchresult: { count: String(count), ...extra } }), { status: 200 });

test('a trend matches a curated term on whole words only, else there is no mapping', () => {
  assert.equal(matchTerm(TERM_MAP, ['kolagen', 'skincare'], 'Minuman kolagen ramai dibahas')?.[0], 'collagen');
  assert.equal(matchTerm(TERM_MAP, ['omega-3'], '')?.[0], 'omega_3');
  assert.equal(matchTerm(TERM_MAP, ['jahenya'], 'Resep jahenya viral'), null);
  assert.equal(matchTerm(TERM_MAP, ['olahraga', 'lari'], 'Lari pagi makin ramai'), null);
});

test('every curated term was checked and carries what the line needs', () => {
  for (const [key, term] of Object.entries(TERM_MAP)) {
    assert.ok(term.match.length && term.label && term.pubmed, key);
    assert.match(term.checked.on, /^\d{4}-\d{2}-\d{2}$/, key);
    assert.ok(term.checked.total > 0, `${key} found nothing when checked`);
  }
});

test('the queries carry only the curated term, the window and publication types: nothing about a brand', () => {
  const queries = pubmedQueries('ginger[tiab]', 5);
  assert.deepEqual(queries, {
    total: '(ginger[tiab]) AND ("last 5 years"[dp])',
    rct: '(ginger[tiab]) AND ("last 5 years"[dp]) AND "randomized controlled trial"[pt]',
    systematicReview: '(ginger[tiab]) AND ("last 5 years"[dp]) AND "systematic review"[pt]',
    metaAnalysis: '(ginger[tiab]) AND ("last 5 years"[dp]) AND "meta-analysis"[pt]',
  });
});

test('only counts come back from PubMed, never a record', async () => {
  const sent = [];
  const counts = await fetchPubmedCounts('ginger[tiab]', 5, {
    ...options,
    fetch: async (url) => {
      sent.push(new URL(url));
      return answer(sent.length * 10, { idlist: ['123'], translationset: [] });
    },
  });
  assert.deepEqual(counts, { total: 10, rct: 20, systematicReview: 30, metaAnalysis: 40 });
  for (const url of sent) {
    assert.equal(url.searchParams.get('retmax'), '0');
    assert.equal(url.searchParams.get('tool'), 'elias');
    assert.equal(url.searchParams.get('email'), 'dev@example.org');
  }
});

test('a failure or an unknown term means no counts, never a zero', async () => {
  const fails = [
    async () => new Response('busy', { status: 429 }),
    async () => answer(0, { errorlist: { phrasesnotfound: ['xyzzy'], fieldsnotfound: [] } }),
    async () => new Response(JSON.stringify({ esearchresult: { ERROR: 'Invalid query' } }), { status: 200 }),
    async () => {
      throw new TypeError('fetch failed');
    },
  ];
  for (const fetch of fails) assert.equal(await fetchPubmedCounts('xyzzy[tiab]', 5, { ...options, fetch }), null);
});

test('calls keep to the configured rate', async () => {
  const times = [];
  const fetch = async () => {
    times.push(Date.now());
    return answer(1);
  };
  // Two terms in a burst, 8 requests at 20 a second
  await Promise.all([fetchPubmedCounts('a[tiab]', 5, { ...options, rps: 20, fetch }), fetchPubmedCounts('b[tiab]', 5, { ...options, rps: 20, fetch })]);
  const sorted = times.sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++) assert.ok(sorted[i] - sorted[i - 1] >= 45, `gap ${sorted[i] - sorted[i - 1]} ms`);
});

test('the line reports counts, never efficacy, and drops what it cannot back', () => {
  const line = composePubmedLine('suplemen kolagen', { total: 2057, rct: 1320, systematicReview: 43, metaAnalysis: 31 }, 5, 1);
  assert.equal(line, 'PubMed mencatat 1.320 uji terkontrol acak dan 43 tinjauan sistematis tentang suplemen kolagen dalam 5 tahun terakhir.');
  assert.equal(
    composePubmedLine('ashwagandha', { total: 12, rct: 0, systematicReview: 0, metaAnalysis: 0 }, 5, 1),
    'PubMed belum mencatat uji terkontrol acak atau tinjauan sistematis tentang ashwagandha dalam 5 tahun terakhir.',
  );
  // Nothing at all usually means the query is off: no line
  assert.equal(composePubmedLine('x', { total: 0, rct: 0, systematicReview: 0, metaAnalysis: 0 }, 5, 1), null);
  for (const word of ['terbukti', 'efektif', 'aman', 'menyembuhkan', 'mencegah', 'ampuh']) assert.ok(!line.includes(word), word);
});
