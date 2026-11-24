// PubMed E-utilities ESearch: result counts only (retmax=0), never records or
// abstracts. Server only. The one module that knows ESearch's answer.
//
// Checked on 24 Nov 2026: `("last 5 years"[dp])` matches the documented
// datetype=pdat&reldate filter (59,390 vs 59,359 for "collagen"), and the
// "randomized controlled trial", "systematic review" and "meta-analysis"
// publication types ([pt]) are recognised. An unknown word does not count as
// zero: ESearch lists it under errorlist.phrasesnotfound, and that query is
// treated as broken.
//
// NCBI asks for at most 3 requests a second without a key and 10 with one,
// and for a registered `tool` and developer `email` on every request. Calls
// are spaced here per instance. No imports: scripts/evidence.test.mjs runs
// this file directly with a stubbed fetch.

const ENDPOINT = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
const TIMEOUT_MS = 8_000;

export type PubmedCounts = { total: number; rct: number; systematicReview: number; metaAnalysis: number };

export type PubmedOptions = {
  tool: string;
  email: string;
  apiKey?: string;
  /** Requests per second; 3 without a key, up to 10 with one */
  rps: number;
  fetch?: typeof fetch;
};

const types = {
  total: '',
  rct: ' AND "randomized controlled trial"[pt]',
  systematicReview: ' AND "systematic review"[pt]',
  metaAnalysis: ' AND "meta-analysis"[pt]',
} as const;

/** The four queries sent for a term: all results and each publication type, in the window. */
export function pubmedQueries(term: string, years: number): Record<keyof PubmedCounts, string> {
  const base = `(${term}) AND ("last ${years} years"[dp])`;
  return Object.fromEntries(Object.entries(types).map(([key, suffix]) => [key, `${base}${suffix}`])) as Record<keyof PubmedCounts, string>;
}

let nextSlot = 0;

/** Waits for this instance's next free slot at `rps` requests a second. */
async function takeSlot(rps: number) {
  const now = Date.now();
  const slot = Math.max(now, nextSlot);
  nextSlot = slot + Math.ceil(1000 / Math.max(rps, 0.1));
  if (slot > now) await new Promise((resolve) => setTimeout(resolve, slot - now));
}

async function count(query: string, options: PubmedOptions): Promise<number | null> {
  await takeSlot(options.rps);
  const params = new URLSearchParams({ db: 'pubmed', term: query, retmode: 'json', retmax: '0', tool: options.tool, email: options.email });
  if (options.apiKey) params.set('api_key', options.apiKey);
  try {
    const response = await (options.fetch ?? fetch)(`${ENDPOINT}?${params}`, { cache: 'no-store', signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) {
      console.warn('PubMed answered', response.status);
      return null;
    }
    const result = ((await response.json()) as { esearchresult?: Record<string, unknown> }).esearchresult;
    const errors = result?.errorlist as Record<string, unknown[]> | undefined;
    if (!result || result.ERROR || (errors && Object.values(errors).some((list) => Array.isArray(list) && list.length))) {
      console.warn('PubMed did not understand the query', JSON.stringify(result?.ERROR ?? errors).slice(0, 200));
      return null;
    }
    const total = Number(result.count);
    return Number.isInteger(total) && total >= 0 ? total : null;
  } catch (error) {
    console.warn('PubMed failed', error instanceof Error ? error.name : error);
    return null;
  }
}

/** The counts for a term over the last `years`, or null when any of the four queries failed. Never throws. */
export async function fetchPubmedCounts(term: string, years: number, options: PubmedOptions): Promise<PubmedCounts | null> {
  const queries = pubmedQueries(term, years);
  const counts: Partial<PubmedCounts> = {};
  // One after another: the slots space them anyway, and a failure stops the rest
  for (const key of Object.keys(queries) as (keyof PubmedCounts)[]) {
    const value = await count(queries[key], options);
    if (value === null) return null;
    counts[key] = value;
  }
  return counts as PubmedCounts;
}
