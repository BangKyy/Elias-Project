// Open Food Facts checks before SOURCE_OFF_ENABLED (docs/MVP.md checklist):
// only watchlist aggregates are stored, never product rows, and a sample
// under the threshold yields no line. `npm run test:off`
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { composeOffLine, matchEntries } from '../src/lib/sources/off/compose.ts';
import { aggregate, readWatchlist, REQUIRED_COLUMNS } from './off-refresh.mjs';

const header = ['code', 'product_name', 'brands', ...REQUIRED_COLUMNS].join('\t');
const row = (name, countries, categories, labels, grade) => ['1', name, 'Merek X', countries, categories, labels, grade].join('\t');
const watchlist = { categories: new Set(['en:beverages']), labels: new Set(['en:halal']), pairs: new Set(['en:beverages\ten:halal']) };

test('keeps counts for watchlist tags of Indonesian products only, never a product row', async () => {
  const snapshot = await aggregate(
    [
      header,
      row('Teh A', 'en:indonesia', 'en:beverages,en:teas', 'en:halal,en:vegan', 'b'),
      row('Teh B', 'en:indonesia,en:malaysia', 'en:beverages', '', 'not-applicable'),
      row('Tea C', 'en:france', 'en:beverages', 'en:halal', 'a'),
      row('Kopi', 'en:indonesia', 'en:coffees', 'en:halal', 'c'),
    ],
    watchlist,
  );
  assert.equal(snapshot.products, 3);
  assert.deepEqual(snapshot.tags.map((t) => t.tag).sort(), ['en:beverages', 'en:halal']);
  assert.deepEqual(snapshot.tags.find((t) => t.tag === 'en:beverages'), { tag: 'en:beverages', tag_type: 'category', n: 2, nutriscore: { b: 1, unknown: 1 } });
  assert.deepEqual(snapshot.pairs, [{ category: 'en:beverages', label: 'en:halal', n: 1 }]);
  // Nothing of a product itself: no names, brands or codes anywhere in the output
  const out = JSON.stringify(snapshot);
  for (const leak of ['Teh A', 'Merek X', 'en:teas', 'en:vegan', 'en:coffees']) assert.ok(!out.includes(leak), leak);
  for (const stat of snapshot.tags) assert.deepEqual(Object.keys(stat).sort(), ['n', 'nutriscore', 'tag', 'tag_type']);
});

test('refuses a dump whose schema moved', async () => {
  await assert.rejects(aggregate(['code\tcountries_tags\tcategories_tags', row('x', 'en:indonesia', '', '', '')], watchlist), /missing columns: labels_tags, nutriscore_grade/);
});

test('the shipped watchlist only names namespaced OFF tags', () => {
  const { categories, labels } = readWatchlist();
  assert.ok(categories.size > 0);
  for (const tag of [...categories, ...labels]) assert.match(tag, /^[a-z]{2}:[\p{L}\p{N}-]+$/u, tag);
});

const labelEntry = { id: 't', match: ['teh'], category: 'en:beverages', categoryName: 'minuman', label: 'en:halal', labelName: 'halal' };
const gradeEntry = { id: 'g', match: ['camilan'], category: 'en:snacks', categoryName: 'camilan' };

test('below the sample threshold there is no line', () => {
  assert.equal(composeOffLine(labelEntry, { n: 29, nutriscore: {} }, 10, 30), null);
  assert.equal(composeOffLine(gradeEntry, { n: 100, nutriscore: { a: 10, d: 10, unknown: 80 } }, null, 30), null);
  assert.equal(composeOffLine(labelEntry, null, null, 30), null);
});

test('no line on a weak number: fewer than 5 products with the label', () => {
  assert.equal(composeOffLine(labelEntry, { n: 120, nutriscore: {} }, 0, 30), null);
  assert.equal(composeOffLine(labelEntry, { n: 120, nutriscore: {} }, 4, 30), null);
});

test('the line carries its sample size and names Open Food Facts', () => {
  assert.deepEqual(composeOffLine(labelEntry, { n: 1200, nutriscore: {} }, 216, 30), {
    line: 'Dari 1.200 produk minuman Indonesia di Open Food Facts, 18% berlabel halal.',
    sample: 1200,
  });
  assert.deepEqual(composeOffLine(gradeEntry, { n: 90, nutriscore: { a: 5, b: 10, c: 10, d: 5, e: 10, unknown: 50 } }, null, 30), {
    line: 'Dari 40 produk camilan Indonesia di Open Food Facts yang punya Nutri-Score, 38% bernilai A atau B dan 38% bernilai D atau E.',
    sample: 40,
  });
});

test('trends match the watchlist on whole words only', () => {
  assert.deepEqual(matchEntries([labelEntry, gradeEntry], ['teh tarik', 'minuman'], 'Video teh tarik naik').map((e) => e.id), ['t']);
  assert.deepEqual(matchEntries([labelEntry], ['tehnik'], 'Tehnik editing baru'), []);
  // Watchlist order is kept, so a broader entry can take over when the first has no line
  assert.deepEqual(matchEntries([gradeEntry, labelEntry], ['teh', 'camilan'], '').map((e) => e.id), ['g', 't']);
});
