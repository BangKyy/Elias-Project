// Open Food Facts snapshot refresh (docs/MVP.md, Open Food Facts). Runs in
// GitHub Actions (.github/workflows/off-refresh.yml), never in a web route:
// the CSV dump is 1.5 GB compressed (the JSONL 13.8 GB, 23 Nov 2026), far past
// Vercel's function limits. Streamed line by line, so neither disk nor memory
// holds the file.
//
// Keeps counts for watchlist tags only (src/lib/sources/off/watchlist.json)
// and writes them to off_derived through public.off_replace_snapshot. No
// product row, brand or image leaves aggregate(). OFF's API is not used: its
// terms allow production calls only one per real user scan.
//
// Env: OFF_USER_AGENT ("Elias/1.0 (contact email)", required by OFF),
// NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY; optional OFF_CSV_URL,
// OFF_COUNTRY_TAG (en:indonesia). `--dry-run` prints the aggregate instead.

import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';
import { pathToFileURL } from 'node:url';
import { createGunzip } from 'node:zlib';

const CSV_URL = 'https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz';
const COUNTRY_TAG = 'en:indonesia';
// Checked against the dump of 23 Nov 2026; a missing one means the schema moved
export const REQUIRED_COLUMNS = ['countries_tags', 'categories_tags', 'labels_tags', 'nutriscore_grade'];
const GRADES = new Set(['a', 'b', 'c', 'd', 'e']);

export function readWatchlist(path = new URL('../src/lib/sources/off/watchlist.json', import.meta.url)) {
  const entries = JSON.parse(readFileSync(path, 'utf8')).entries;
  return {
    categories: new Set(entries.map((entry) => entry.category)),
    labels: new Set(entries.flatMap((entry) => (entry.label ? [entry.label] : []))),
    pairs: new Set(entries.flatMap((entry) => (entry.label ? [`${entry.category}\t${entry.label}`] : []))),
  };
}

/**
 * Counts per watchlist tag and pair over the dump's lines (header first).
 * Throws when a required column is missing. Never returns a product row.
 */
export async function aggregate(lines, watchlist, country = COUNTRY_TAG) {
  let col = null;
  let products = 0;
  const tags = new Map();
  const pairs = new Map();
  const count = (key, type, grade) => {
    const stat = tags.get(key) ?? { tag: key.slice(key.indexOf('\t') + 1), tag_type: type, n: 0, nutriscore: {} };
    stat.n += 1;
    stat.nutriscore[grade] = (stat.nutriscore[grade] ?? 0) + 1;
    tags.set(key, stat);
  };

  for await (const line of lines) {
    if (!col) {
      const header = line.split('\t');
      const missing = REQUIRED_COLUMNS.filter((name) => !header.includes(name));
      if (missing.length) throw new Error(`OFF dump is missing columns: ${missing.join(', ')}`);
      col = Object.fromEntries(REQUIRED_COLUMNS.map((name) => [name, header.indexOf(name)]));
      continue;
    }
    if (!line) continue;
    const fields = line.split('\t');
    if (!(fields[col.countries_tags] ?? '').split(',').includes(country)) continue;
    products += 1;
    const raw = fields[col.nutriscore_grade] ?? '';
    const grade = GRADES.has(raw) ? raw : 'unknown';
    const categories = (fields[col.categories_tags] ?? '').split(',').filter((tag) => watchlist.categories.has(tag));
    const labels = (fields[col.labels_tags] ?? '').split(',').filter((tag) => watchlist.labels.has(tag));
    for (const tag of new Set(categories)) count(`category\t${tag}`, 'category', grade);
    for (const tag of new Set(labels)) count(`label\t${tag}`, 'label', grade);
    for (const category of new Set(categories)) {
      for (const label of new Set(labels)) {
        const key = `${category}\t${label}`;
        if (watchlist.pairs.has(key)) pairs.set(key, (pairs.get(key) ?? 0) + 1);
      }
    }
  }
  if (!col) throw new Error('OFF dump was empty');

  return {
    products,
    tags: [...tags.values()],
    pairs: [...pairs].map(([key, n]) => {
      const [category, label] = key.split('\t');
      return { category, label, n };
    }),
  };
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const userAgent = process.env.OFF_USER_AGENT;
  if (!userAgent) throw new Error('OFF_USER_AGENT is not set (OFF asks for "AppName/Version (contact email)")');
  const url = process.env.OFF_CSV_URL || CSV_URL;

  const started = Date.now();
  const response = await fetch(url, { headers: { 'User-Agent': userAgent } });
  if (!response.ok || !response.body) throw new Error(`OFF dump answered ${response.status}`);
  console.log('OFF dump of', response.headers.get('last-modified'), `${(Number(response.headers.get('content-length')) / 1e9).toFixed(2)} GB`);
  const lines = createInterface({ input: Readable.fromWeb(response.body).pipe(createGunzip()), crlfDelay: Infinity });
  const snapshot = await aggregate(lines, readWatchlist(), process.env.OFF_COUNTRY_TAG || COUNTRY_TAG);
  console.log(
    `${snapshot.products} Indonesian products, ${snapshot.tags.length} tags, ${snapshot.pairs.length} pairs in ${Math.round((Date.now() - started) / 1000)} s`,
  );

  if (dryRun) {
    console.log(JSON.stringify(snapshot, null, 1));
    return;
  }
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!base || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are needed to store the snapshot');
  const { createClient } = await import('@supabase/supabase-js');
  const admin = createClient(base, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await admin.rpc('off_replace_snapshot', { p_tags: snapshot.tags, p_pairs: snapshot.pairs });
  if (error) throw new Error(`Storing the snapshot failed: ${error.message}`);
  console.log('Snapshot stored');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
