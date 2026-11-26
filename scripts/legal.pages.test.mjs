// Legal checks on the rendered pages, signed out, against a running app:
// `npm run build && npm run start`, then `BASE_URL=http://localhost:3000 npm run test:legal-pages`
// (or point BASE_URL at a deployment). Source checks: scripts/legal.test.mjs.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const BASE_URL = (process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
const config = readFileSync(join(import.meta.dirname, '..', 'src/lib/legal.ts'), 'utf8');
const value = (name) => config.match(new RegExp(`export const ${name} = '([^']+)'`))[1];
const EMAIL = value('LEGAL_CONTACT_EMAIL');
const OPERATOR = value('LEGAL_OPERATOR');
const DATE = value('LEGAL_EFFECTIVE_DATE');
const FOOTER = `© 2026 ${OPERATOR}. Elias dikembangkan oleh ${OPERATOR}, agensi kreatif di Yogyakarta, Indonesia.`;

const pages = new Map();
async function page(path) {
  if (!pages.has(path)) {
    // No cookies: a guest, as Pinterest's reviewers are
    const response = await fetch(`${BASE_URL}${path}`, { redirect: 'manual' });
    pages.set(path, { status: response.status, html: await response.text() });
  }
  return pages.get(path);
}

const entities = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", nbsp: ' ', copy: '©', ldquo: '“', rdquo: '”', rsquo: '’' };
/** The page's visible text: scripts and styles (the RSC payload among them) and tags removed. */
const text = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#?\w+);/g, (match, name) => entities[name] ?? match)
    .replace(/\s+/g, ' ');

const withFooter = ['/signup', '/login', '/privasi', '/syarat', '/cookies', '/arsip', '/en/privacy'];

test('/en/privacy answers 200 to a guest, in English, and may be indexed', async () => {
  const { status, html } = await page('/en/privacy');
  assert.equal(status, 200);
  assert.match(html, /<div[^>]*\blang="en"/);
  assert.doesNotMatch(html, /noindex/i);
  assert.match(text(html), /Elias Privacy Policy/);
});

test('nothing links to /en/privacy: navigation, footer, signup, legal pages', async () => {
  for (const path of withFooter) assert.doesNotMatch((await page(path)).html, /href="[^"]*\/en\/privacy/, path);
});

test('every page with a footer carries the Sumur Creative line, and the main navigation keeps its three routes (NV-1)', async () => {
  for (const path of withFooter) assert.ok(text((await page(path)).html).includes(FOOTER), path);
  const nav = (await page('/arsip')).html.match(/<nav aria-label="Navigasi utama"[\s\S]*?<\/nav>/)?.[0] ?? '';
  const routes = [...nav.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
  assert.ok(routes.length <= 3, `navigation routes: ${routes.join(', ')}`);
  for (const route of routes) assert.ok(['/', '/arsip', '/chat'].includes(route), route);
});

test('/privasi and /syarat name Sumur Creative, the contact email and Pinterest as being integrated', async () => {
  for (const path of ['/privasi', '/syarat']) {
    const visible = text((await page(path)).html);
    assert.ok(visible.includes(OPERATOR), `${path}: operator`);
    assert.ok(visible.includes(EMAIL), `${path}: email`);
    assert.ok(visible.includes('Pinterest Trends API (sedang diintegrasikan; sebelum integrasinya aktif, Elias tidak membaca data apa pun dari Pinterest)'), `${path}: Pinterest`);
  }
});

test('while the integration is off, no page says Elias reads Pinterest data, in either language', async () => {
  const claims = ['Elias memakai Pinterest Trends API', 'Elias uses the Pinterest Trends API'];
  for (const path of ['/privasi', '/syarat', '/en/privacy']) {
    const visible = text((await page(path)).html);
    for (const claim of claims) assert.ok(!visible.includes(claim), `${path}: "${claim}"`);
  }
  assert.ok(text((await page('/en/privacy')).html).includes('Until that integration is live, Elias reads no data from Pinterest.'));
  assert.ok(text((await page('/privasi')).html).includes('Sebelum integrasi itu aktif, Elias tidak membaca data apa pun dari Pinterest.'));
});

test('the Indonesian legal pages keep the voice: no emoji, no exclamation marks', async () => {
  for (const path of ['/privasi', '/syarat', '/cookies']) {
    const visible = text((await page(path)).html);
    // Emoji_Presentation, not Extended_Pictographic: © in the footer and ® in MEDLINE®/PubMed® are symbols, not emoji
    assert.doesNotMatch(visible, /\p{Emoji_Presentation}/u, `${path}: emoji`);
    assert.doesNotMatch(visible, /!/, `${path}: exclamation mark`);
  }
});

test('one "last updated" date on /privasi, /syarat and /en/privacy', async () => {
  assert.ok(text((await page('/privasi')).html).includes(`Berlaku sejak ${DATE}`));
  assert.ok(text((await page('/syarat')).html).includes(`Berlaku sejak ${DATE}`));
  assert.ok(text((await page('/en/privacy')).html).includes(`Last updated: ${DATE}`));
});

test('on /signup, "Ketentuan Layanan" goes to /syarat and "Kebijakan Privasi" to /privasi', async () => {
  const { html } = await page('/signup');
  assert.match(html, /<a[^>]*href="\/syarat"[^>]*>\s*Ketentuan Layanan\s*<\/a>/);
  assert.match(html, /<a[^>]*href="\/privasi"[^>]*>\s*Kebijakan Privasi\s*<\/a>/);
  assert.ok(text(html).includes('Dengan melanjutkan, kamu menyetujui Ketentuan Layanan dan Kebijakan Privasi Elias.'));
});

test('Pinterest appears on no guest app page', async () => {
  for (const path of ['/signup', '/login', '/arsip']) assert.doesNotMatch(text((await page(path)).html), /pinterest/i, path);
});
