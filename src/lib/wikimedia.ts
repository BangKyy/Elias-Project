// Wikimedia Pageviews API: the most-read articles on Indonesian Wikipedia,
// a public curiosity signal. Server only, no key.
//
// As checked on 19 Nov 2026: /metrics/pageviews/top/id.wikipedia/all-access/
// YYYY/MM/DD answers without a key with the day's top 1000 articles, counting
// human readers only (not bots). Days are UTC and a day is published some
// hours after it ends, so this module asks for yesterday and falls back to the
// day before while yesterday still answers 404. Wikimedia asks clients to
// identify themselves in the User-Agent. A failure never fails the cycle.
//
// The list mixes in pages that are not articles (the main page, search,
// special and project pages) and articles read by bots Wikimedia didn't catch
// (".at" was #7 on 18 Nov 2026 with 3,637 views); both are dropped. A day's list never changes,
// so a successful answer is kept until the next UTC day.

const PROJECT = 'id.wikipedia';
const MAX_ARTICLES = 20;
const USER_AGENT = 'elias-trends/0.1 (daily trend research for Indonesian creative teams)';

export interface WikimediaTrendItem {
  /** The article title as Wikimedia gives it, with underscores ("Prabowo_Subianto") */
  article: string;
  /** Human page views on that UTC day */
  views: number;
  /** Place in Wikimedia's own list of the day, so not-article pages keep their places */
  rank: number;
  url: string;
}

export type WikimediaTrends =
  | { status: 'ok'; /** The UTC day counted (ISO date) */ date: string; articles: WikimediaTrendItem[] }
  | { status: 'error'; date: null; articles: [] };

interface TopArticle {
  article?: unknown;
  views?: unknown;
  rank?: unknown;
}

interface TopResponse {
  items?: { articles?: TopArticle[] }[];
}

// Namespaces of id.wikipedia, in Indonesian and English, plus talk pages ("Pembicaraan_…")
const notArticles = /^(Istimewa|Special|Spesial|Wikipedia|WP|Berkas|File|Gambar|Kategori|Category|Templat|Template|Portal|Bantuan|Help|Pengguna|User|MediaWiki|Modul|Module|Draf|Draft|Pembicaraan[^:]*|Talk):/i;
const mainPages = new Set(['Halaman_Utama', 'Main_Page', '-']);
// Domain endings (".at"), single characters, bare numbers and symbols: no topic a brand can use
const junk = /^[.\-_]|^.$|^[\p{N}\p{P}\p{S}_]+$/u;
// Adult sites, read mostly by bots and searches that land on the article ("XNXX" was #18 on 18 Nov 2026)
const adult = /xnxx|xvideos|xhamster|pornhub|\bporn|bokep|^xxx/i;

let cached: { trends: WikimediaTrends; day: string } | null = null;

/** "2026/11/18" path and "2026-11-18" ISO date of the UTC day `daysAgo` before now. */
function utcDay(daysAgo: number): { path: string; iso: string } {
  const iso = new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 10);
  return { path: iso.replaceAll('-', '/'), iso };
}

function isArticle(title: string): boolean {
  return !mainPages.has(title) && !notArticles.test(title) && !junk.test(title) && !adult.test(title);
}

/** A day's real articles in Wikimedia's order; null when the answer isn't a top list. */
export function parseTopArticles(data: unknown): WikimediaTrendItem[] | null {
  const articles = (data as TopResponse | null)?.items?.[0]?.articles;
  if (!Array.isArray(articles)) return null;
  return articles.flatMap(({ article, views, rank }) => {
    if (typeof article !== 'string' || typeof views !== 'number' || typeof rank !== 'number') return [];
    if (!isArticle(article)) return [];
    return [{ article, views, rank, url: `https://id.wikipedia.org/wiki/${encodeURIComponent(article)}` }];
  });
}

/** One day's list; 'missing' while Wikimedia hasn't published that day yet. */
async function fetchDay(path: string): Promise<WikimediaTrendItem[] | 'missing' | null> {
  try {
    const response = await fetch(`https://wikimedia.org/api/rest_v1/metrics/pageviews/top/${PROJECT}/all-access/${path}`, {
      headers: { 'User-Agent': USER_AGENT, 'Api-User-Agent': USER_AGENT },
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
    if (response.status === 404) return 'missing';
    if (!response.ok) {
      console.error('Wikimedia pageviews returned', response.status);
      return null;
    }
    const articles = parseTopArticles(await response.json());
    if (!articles) console.error('Wikimedia pageviews answer was not a top list');
    return articles;
  } catch (error) {
    console.error('Wikimedia pageviews failed', error);
    return null;
  }
}

/** The most-read Indonesian Wikipedia articles of the latest published day. Never throws. */
export async function fetchWikimediaTrends(): Promise<WikimediaTrends> {
  const yesterday = utcDay(1);
  if (cached?.day === yesterday.iso) return cached.trends;

  for (const day of [yesterday, utcDay(2)]) {
    const articles = await fetchDay(day.path);
    if (articles === 'missing') continue;
    if (!articles) break;
    const trends: WikimediaTrends = { status: 'ok', date: day.iso, articles: articles.slice(0, MAX_ARTICLES) };
    // The day before is only a stand-in: ask again for yesterday on the next cycle
    if (day === yesterday) cached = { trends, day: day.iso };
    return trends;
  }
  return { status: 'error', date: null, articles: [] };
}
