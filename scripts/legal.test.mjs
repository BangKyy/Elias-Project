// Legal source checks (docs/MVP.md, legal pages): the operator's details are
// defined once in src/lib/legal.ts, nothing links to /en/privacy, the English
// policy's copy stays in its own module (LN-1), and Pinterest is named only on
// the legal pages while its integration isn't live (BR-5). No server needed;
// the rendered pages are checked by scripts/legal.pages.test.mjs.
// `npm run test:legal`
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { test } from 'node:test';

const root = join(import.meta.dirname, '..');
const rel = (path) => relative(root, path).split(sep).join('/');

/** Every file under these folders, except dependencies and build output. */
function files(...dirs) {
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      if (['node_modules', '.next', '.git', '.vercel'].includes(name)) continue;
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.(tsx?|mjs|js|json|ya?ml|sql|css)$/.test(name)) out.push(path);
    }
  };
  for (const dir of dirs) walk(join(root, dir));
  return out;
}

const code = files('src', 'scripts', 'supabase', '.github').filter((path) => !path.endsWith('legal.test.mjs') && !path.endsWith('legal.pages.test.mjs'));
const read = (path) => readFileSync(path, 'utf8');
// Code comments may name things (a "Pinterest-style grid"); only code and copy count
const withoutComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const legalConfig = 'src/lib/legal.ts';

test('the email, operator, Instagram URL and date are defined once, in the legal config', () => {
  const config = read(join(root, legalConfig));
  for (const name of ['LEGAL_CONTACT_EMAIL', 'LEGAL_OPERATOR', 'LEGAL_INSTAGRAM_URL', 'LEGAL_EFFECTIVE_DATE']) {
    const value = config.match(new RegExp(`export const ${name} = '([^']+)'`))?.[1];
    assert.ok(value, `${name} in ${legalConfig}`);
    const elsewhere = code.filter((path) => rel(path) !== legalConfig && read(path).includes(value)).map(rel);
    assert.deepEqual(elsewhere, [], `${name} (${value}) is written out again`);
  }
});

test('Pinterest stays "being integrated": the flag is off', () => {
  assert.match(read(join(root, legalConfig)), /export const PINTEREST_INTEGRATION_LIVE = false;/);
});

test('nothing in the app links to /en/privacy', () => {
  // The proxy has to let guests through to it; its own module only names it in a comment
  const allowed = ['src/proxy.ts', 'src/components/legal/privacyEnContent.tsx', 'src/app/en/privacy/page.tsx', legalConfig];
  const linking = code.filter((path) => !allowed.includes(rel(path)) && read(path).includes('/en/privacy')).map(rel);
  assert.deepEqual(linking, []);
  for (const path of allowed) assert.ok(!/href=\{?["'`]\/en\/privacy/.test(read(join(root, path))), `${path} links to /en/privacy`);
});

test('the English policy copy lives only in its own module (LN-1)', () => {
  const english = ['Elias Privacy Policy', 'Who manages your data', 'Last updated', 'Elias is integrating the Pinterest Trends API', 'How long we keep data'];
  const module = 'src/components/legal/privacyEnContent.tsx';
  for (const phrase of english) {
    assert.ok(read(join(root, module)).includes(phrase), `${phrase} in ${module}`);
    const elsewhere = code.filter((path) => rel(path) !== module && read(path).includes(phrase)).map(rel);
    assert.deepEqual(elsewhere, [], `"${phrase}" outside ${module}`);
  }
});

test('Pinterest is named only on the legal pages: no source picker, card or detail (BR-5)', () => {
  const legal = [legalConfig, 'src/components/legal/LegalPage.tsx', 'src/components/legal/privacyContent.tsx', 'src/components/legal/termsContent.tsx', 'src/components/legal/privacyEnContent.tsx'];
  const naming = files('src').filter((path) => !legal.includes(rel(path)) && /pinterest/i.test(withoutComments(read(path)))).map(rel);
  assert.deepEqual(naming, []);
});
