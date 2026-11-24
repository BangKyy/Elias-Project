import { fetchNewsdataHeadlines, searchNewsdata } from './newsdata';
import { searchGoogleNews, type FeedArticle } from './newsFeeds';
import { truncate } from './text';

// GDELT DOC 2.0: free news context for a trend keyword. Server only.
//
// By 19 Nov 2026 GDELT refused this IP for most of the day (429 after 12
// seconds, or no connection within 10), so a keyword lookup GDELT fails or
// finds nothing for is asked of Google News RSS instead, then of newsdata.io
// (fetchNewsContext). newsdata.io also stands in for the cycle's headlines
// (fetchIndonesiaHeadlines). Its articles are 12 to 48 hours old, so it
// comes last and says so (provider 'newsdata').
//
// Rate limit, as observed on 2 Nov 2026: GDELT asks for one request every 5
// seconds per IP and answers faster callers with HTTP 429 and a plain-text
// "Please limit requests…" body. After a short burst it kept refusing the same
// IP for more than three minutes, and a refusal itself took up to 12 seconds.
// So this module spaces calls itself, backs off for five minutes after any
// 429, and never lets a GDELT problem fail the insight: it degrades to a note.

const ENDPOINT = 'https://api.gdeltproject.org/api/v2/doc/doc';
const MIN_INTERVAL_MS = 5_500;
const COOLDOWN_AFTER_429_MS = 300_000;
const CACHE_TTL_MS = 3_600_000;
const MAX_CACHE_ENTRIES = 300;
const MAX_WAIT_MS = 6_000;
const MAX_ARTICLES = 3;
// A user waits on a trend's news context; the daily cycle can wait longer, and
// on 19 Nov 2026 GDELT took 13 seconds even to refuse a request
const TIMEOUT_MS = 10_000;
const CYCLE_TIMEOUT_MS = 20_000;

export const GDELT_BUSY_NOTE =
  'Konteks berita sedang sibuk (rate limit GDELT). Menganalisis berdasarkan konteks tren platform.';

export type NewsArticle = { domain: string; title: string; url: string; seenAt: string | null };

export type NewsProvider = 'gdelt' | 'google_news' | 'newsdata';

export type NewsContext = {
  status: 'ok' | 'empty' | 'rate_limited' | 'error' | 'skipped';
  /** Who answered; absent means GDELT (contexts cached before 19 Nov 2026) */
  provider?: NewsProvider;
  /** The query sent to GDELT, null when skipped */
  query: string | null;
  articles: NewsArticle[];
  /** "1. [domain.com] Article Title" lines, or a note when there are none */
  summary: string;
};

type GdeltArticle = { url?: unknown; title?: unknown; domain?: unknown; seendate?: unknown };

// Successful and empty answers only; failures are never cached
const cache = new Map<string, { context: NewsContext; expiresAt: number }>();
let nextSlot = 0;
let coolDownUntil = 0;

/**
 * GDELT matches every word of a plain query, so a whole trend sentence finds
 * nothing. Keep letters, digits, spaces and hyphens; quote multi-word phrases.
 */
export function toGdeltQuery(keyword: string): string | null {
  const cleaned = keyword
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60)
    .trim();
  // GDELT rejects very short terms
  if (cleaned.length < 3) return null;
  return cleaned.includes(' ') ? `"${cleaned}"` : cleaned;
}

function formatSummary(articles: NewsArticle[]): string {
  return articles.map((article, i) => `${i + 1}. [${article.domain}] ${article.title}`).join('\n');
}

/** "20261102T041500Z" → ISO string */
function parseSeenDate(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const m = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  return m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z` : null;
}

function parseArticles(text: string, maxArticles: number): NewsArticle[] | null {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null) return null;
  // An empty result comes back as {}
  const raw = (data as { articles?: unknown }).articles;
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) return null;
  return (raw as GdeltArticle[])
    .filter(
      (a) =>
        typeof a.title === 'string' &&
        a.title.trim() &&
        typeof a.domain === 'string' &&
        // Rendered as links, so only plain web URLs get through
        typeof a.url === 'string' &&
        /^https?:\/\//i.test(a.url),
    )
    .slice(0, maxArticles)
    .map((a) => ({
      domain: a.domain as string,
      title: truncate((a.title as string).replace(/\s+/g, ' ').trim(), 200),
      url: a.url as string,
      seenAt: parseSeenDate(a.seendate),
    }));
}

const busy = (query: string): NewsContext => ({ status: 'rate_limited', query, articles: [], summary: GDELT_BUSY_NOTE });

/**
 * Up to three news headlines from the last 24 hours for a keyword. Never
 * throws; every failure becomes a context the prompt can still use.
 */
/** One keyword, or several of which any may match ("(matcha OR "es teh")"). */
function toGdeltAnyQuery(keywords: string[]): string | null {
  const terms = [...new Set(keywords.map(toGdeltQuery).filter((term): term is string => term !== null))];
  if (terms.length <= 1) return terms[0] ?? null;
  return `(${terms.join(' OR ')})`;
}

const fromFeed = (found: FeedArticle[]): NewsArticle[] =>
  found.map((article) => ({ domain: article.outlet, title: article.title, url: article.url, seenAt: article.publishedAt }));

/**
 * News for a trend's keywords: GDELT first, Google News when GDELT is busy,
 * fails or finds nothing (it covers Indonesian outlets better), and
 * newsdata.io's last 48 hours when Google fails or finds nothing too. Never
 * throws.
 */
export async function fetchNewsContext(keywords: string | string[]): Promise<NewsContext> {
  const query = toGdeltAnyQuery(typeof keywords === 'string' ? [keywords] : keywords);
  if (!query) {
    return { status: 'skipped', query: null, articles: [], summary: 'Tidak ada kata kunci berita untuk tren ini.' };
  }
  const gdelt = await fetchArticles(query, MAX_ARTICLES, 'datedesc', TIMEOUT_MS);
  if (gdelt.status === 'ok') return gdelt;

  const found = await searchGoogleNews(query, MAX_ARTICLES);
  if (found?.length) {
    const articles = fromFeed(found);
    return { status: 'ok', provider: 'google_news', query, articles, summary: formatSummary(articles) };
  }

  const older = await searchNewsdata(query, MAX_ARTICLES);
  if (older?.length) {
    const articles = fromFeed(older);
    return { status: 'ok', provider: 'newsdata', query, articles, summary: formatSummary(articles) };
  }
  // Every source failed: GDELT's note says why there is no news
  if (!found && !older) return gdelt;
  return found
    ? { status: 'empty', provider: 'google_news', query, articles: [], summary: 'Tidak ada liputan berita untuk kata kunci ini dalam 24 jam terakhir.' }
    : { status: 'empty', provider: 'newsdata', query, articles: [], summary: 'Tidak ada liputan berita untuk kata kunci ini dalam 48 jam terakhir.' };
}

/**
 * The most relevant Indonesian news of the last 24 hours, for the daily
 * cycle; newsdata.io's top outlets of 12 to 48 hours ago when GDELT has none.
 */
export async function fetchIndonesiaHeadlines(maxArticles = 15): Promise<NewsContext> {
  const query = 'sourcecountry:indonesia';
  const gdelt = await fetchArticles(query, maxArticles, 'hybridrel', CYCLE_TIMEOUT_MS);
  if (gdelt.status === 'ok') return gdelt;
  const found = await fetchNewsdataHeadlines();
  if (!found?.length) return gdelt;
  const articles = fromFeed(found.slice(0, maxArticles));
  return { status: 'ok', provider: 'newsdata', query: null, articles, summary: formatSummary(articles) };
}

async function fetchArticles(
  query: string,
  maxArticles: number,
  sort: 'datedesc' | 'hybridrel',
  timeoutMs: number,
): Promise<NewsContext> {
  const cacheKey = `${query}:${maxArticles}:${sort}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.context;

  const now = Date.now();
  if (now < coolDownUntil) return busy(query);
  // Reserve the next free slot; give up rather than keep a user waiting long
  const slot = Math.max(now, nextSlot);
  if (slot - now > MAX_WAIT_MS) return busy(query);
  nextSlot = slot + MIN_INTERVAL_MS;
  if (slot > now) await new Promise((resolve) => setTimeout(resolve, slot - now));

  const url = `${ENDPOINT}?${new URLSearchParams({
    query,
    mode: 'artlist',
    maxrecords: String(maxArticles),
    format: 'json',
    timespan: '24h',
    sort,
  })}`;

  let status: number;
  let text: string;
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      // Cached in memory below instead of the Next data cache, which could
      // also keep a 429 body for the full hour
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
    });
    status = response.status;
    // Raw text first: errors arrive as plain text, not JSON
    text = await response.text();
  } catch (error) {
    // The cause tells a timeout (TimeoutError) from a refused or slow connection (UND_ERR_CONNECT_TIMEOUT)
    console.error('GDELT failed', error instanceof Error ? ((error.cause as { code?: string } | undefined)?.code ?? error.name) : error);
    // An unreachable GDELT stays unreachable for a while: back off as after a
    // 429, so the next lookups go straight to Google News instead of waiting
    coolDownUntil = Date.now() + COOLDOWN_AFTER_429_MS;
    return { status: 'error', query, articles: [], summary: 'Konteks berita tidak bisa diambil saat ini.' };
  }

  if (status === 429 || text.includes('Please limit requests')) {
    coolDownUntil = Date.now() + COOLDOWN_AFTER_429_MS;
    return busy(query);
  }

  const articles = status === 200 ? parseArticles(text, maxArticles) : null;
  if (!articles) {
    console.error('GDELT returned an unexpected response', status, text.slice(0, 200));
    return { status: 'error', query, articles: [], summary: 'Konteks berita tidak bisa diambil saat ini.' };
  }

  const context: NewsContext = articles.length
    ? { status: 'ok', query, articles, summary: formatSummary(articles) }
    : { status: 'empty', query, articles, summary: 'Tidak ada liputan berita global untuk kata kunci ini dalam 24 jam terakhir.' };
  // Maps keep insertion order, so the first key is the oldest
  if (cache.size >= MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value!);
  cache.set(cacheKey, { context, expiresAt: Date.now() + CACHE_TTL_MS });
  return context;
}
