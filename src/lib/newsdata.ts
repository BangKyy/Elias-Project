import type { FeedArticle } from './newsFeeds';
import { truncate } from './text';

// newsdata.io /latest: Indonesian outlets in Indonesian (country=id,
// language=id). Server only: reads NEWSDATA_API_KEY.
//
// As checked on 24 Nov 2026 on the free plan: 200 credits a day, one credit
// per request of up to 10 articles, 60 requests per 15 minutes. Every article
// arrives exactly 12 hours after it was published and nothing is older than
// 48 hours, so this is never today's news: it backs up GDELT (../gdelt), it
// does not lead. Newest-first answers cover only a few minutes (ten articles
// from 16.17 to 16.20 UTC), so headlines ask for top-ranked outlets in a set
// of categories, which spread over about two hours. `q` also matches article
// bodies and found "matcha" in none of its titles; `qInMeta` keeps to title,
// description and keywords.
//
// Credits: every answer carries X-API-Limit-Remaining, the account's own
// count, so all instances read the same number without a ledger. Elias stops
// once NEWS_DAILY_CREDIT_CAP credits of the day are spent, keyword lookups
// CYCLE_RESERVE short of that so the daily cycle always has some left. The
// docs don't say when the day's credits renew, so a stop is rechecked every
// RECHECK_MS. Errors cost no credit. A failure never fails the caller.

const ENDPOINT = 'https://newsdata.io/api/1/latest';
const DAILY_CREDITS = 200;
const CAP = Math.min(Number(process.env.NEWS_DAILY_CREDIT_CAP) || 150, DAILY_CREDITS);
const CYCLE_RESERVE = 20;
const RECHECK_MS = 3 * 3_600_000;
const CACHE_TTL_MS = 3_600_000;
// After a rate limit, when newsdata gives no reset time
const COOLDOWN_MS = 300_000;
// A refused key or parameter stays refused: ask again an hour later
const CONFIG_COOLDOWN_MS = 3_600_000;
const TIMEOUT_MS = 10_000;
const MAX_HEADLINES = 15;
// On 24 Nov 2026 one regional outlet filled 7 of 15 headlines
const MAX_PER_OUTLET = 3;
// Free plan: at most 5 values per list filter
const HEADLINE_CATEGORIES = ['business,entertainment,lifestyle,technology,food', 'sports,health,tourism,education,environment'];
const SKIPPED_FIELDS = 'content,ai_summary,keywords,creator,video_url,image_url,source_icon,sentiment_stats,ai_region,ai_org';
// The cycle may spend down to the cap; keyword lookups stop CYCLE_RESERVE earlier
type Use = 'cycle' | 'lookup';

type Article = {
  title?: unknown;
  link?: unknown;
  description?: unknown;
  pubDate?: unknown;
  source_name?: unknown;
  source_id?: unknown;
  duplicate?: unknown;
};

let remaining: { credits: number; at: number } | null = null;
let coolDownUntil = 0;
let warnedNoKey = false;
const cache = new Map<string, { articles: FeedArticle[]; expiresAt: number }>();
const inFlight = new Map<string, Promise<FeedArticle[] | null>>();

/** Whether `use` may spend a credit now, by the last count any answer gave. */
function mayCall(use: Use, now: number): boolean {
  if (now < coolDownUntil) return false;
  if (!remaining) return true;
  const floor = DAILY_CREDITS - CAP + (use === 'lookup' ? CYCLE_RESERVE : 0);
  // Below the floor the count may have renewed since: look again after a while
  return remaining.credits > floor || now - remaining.at >= RECHECK_MS;
}

/** "2026-11-23 16:20:00" in the UTC newsdata answers with, as ISO. */
function parsePubDate(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const time = Date.parse(`${value.replace(' ', 'T')}Z`);
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

// A link in the prompt could read as coverage of X or Instagram (BR-5)
const plain = (text: string) => text.replace(/\b(?:https?:\/\/|www\.)\S+/gi, ' ').replace(/\s+/g, ' ').trim();

function parseArticles(data: unknown): FeedArticle[] | null {
  if (typeof data !== 'object' || data === null) return null;
  const { status, results } = data as { status?: unknown; results?: unknown };
  if (status !== 'success' || !Array.isArray(results)) return null;
  return (results as Article[]).flatMap((article) => {
    const publishedAt = parsePubDate(article.pubDate);
    const title = typeof article.title === 'string' ? plain(article.title) : '';
    // Rendered as links, so only plain web URLs get through
    if (!title || !publishedAt || article.duplicate === true || typeof article.link !== 'string' || !/^https?:\/\//i.test(article.link)) {
      return [];
    }
    const outlet = typeof article.source_name === 'string' ? article.source_name : typeof article.source_id === 'string' ? article.source_id : 'newsdata.io';
    const summary = typeof article.description === 'string' ? plain(article.description) : '';
    return [
      {
        title: truncate(title, 200),
        url: article.link,
        outlet: truncate(outlet, 60),
        kind: 'local' as const,
        publishedAt,
        summary: summary === title ? '' : truncate(summary, 200),
      },
    ];
  });
}

/** One request's articles, or null when it was skipped or failed. Never throws. */
async function request(params: Record<string, string>, use: Use): Promise<FeedArticle[] | null> {
  const key = process.env.NEWSDATA_API_KEY;
  if (!key) {
    if (!warnedNoKey) console.warn('newsdata.io: NEWSDATA_API_KEY is not set, so it is skipped');
    warnedNoKey = true;
    return null;
  }
  const url = `${ENDPOINT}?${new URLSearchParams({ country: 'id', language: 'id', removeduplicate: '1', excludefield: SKIPPED_FIELDS, ...params })}`;
  const hit = cache.get(url);
  if (hit && hit.expiresAt > Date.now()) return hit.articles;
  const running = inFlight.get(url);
  if (running) return running;
  if (!mayCall(use, Date.now())) return null;

  const pending = (async () => {
    let response: Response;
    let data: unknown;
    try {
      response = await fetch(url, {
        // In the header, so the key stays out of URLs and logs
        headers: { 'X-ACCESS-KEY': key },
        cache: 'no-store',
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      data = await response.json().catch(() => null);
    } catch (error) {
      console.warn('newsdata.io failed', error instanceof Error ? error.name : error);
      return null;
    }

    const credits = Number(response.headers.get('X-API-Limit-Remaining'));
    if (response.headers.has('X-API-Limit-Remaining') && Number.isFinite(credits)) remaining = { credits, at: Date.now() };

    const articles = response.ok ? parseArticles(data) : null;
    if (articles) {
      cache.set(url, { articles, expiresAt: Date.now() + CACHE_TTL_MS });
      return articles;
    }
    const code = (data as { results?: { code?: unknown } } | null)?.results?.code;
    if (code === 'ApiLimitExceeded' || code === 'ApiKeyLimitExceeded') {
      remaining = { credits: 0, at: Date.now() };
    } else if (response.status === 429) {
      const reset = Number(response.headers.get('X-RateLimit-Reset')) * 1000;
      coolDownUntil = reset > Date.now() ? reset : Date.now() + COOLDOWN_MS;
    } else if (response.status >= 400 && response.status < 500) {
      coolDownUntil = Date.now() + CONFIG_COOLDOWN_MS;
    }
    console.error('newsdata.io returned', response.status, typeof code === 'string' ? code : '');
    return null;
  })().finally(() => inFlight.delete(url));
  inFlight.set(url, pending);
  return pending;
}

/**
 * The most relevant articles of the last 48 hours for a query in GDELT's
 * syntax ("(matcha OR "es teh")"), which newsdata reads the same way; null
 * when it was skipped or failed. The last backup for keyword news (../gdelt).
 */
export async function searchNewsdata(query: string, max: number): Promise<FeedArticle[] | null> {
  // newsdata refuses a query over 100 characters
  if (query.length > 100) return null;
  const articles = await request({ qInMeta: query, sort: 'relevancy' }, 'lookup');
  return articles && articles.slice(0, max);
}

/**
 * Top-ranked Indonesian outlets' articles across brand-relevant categories,
 * newest first, the same story once: two credits, for the daily cycle when
 * GDELT has no headlines. Null when neither request answered.
 */
export async function fetchNewsdataHeadlines(): Promise<FeedArticle[] | null> {
  const answers = await Promise.all(HEADLINE_CATEGORIES.map((category) => request({ category, prioritydomain: 'top' }, 'cycle')));
  if (answers.every((articles) => articles === null)) return null;
  const seen = new Set<string>();
  const perOutlet = new Map<string, number>();
  return answers
    .flatMap((articles) => articles ?? [])
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .filter((article) => {
      const key = article.title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
      const count = perOutlet.get(article.outlet) ?? 0;
      if (seen.has(key) || count >= MAX_PER_OUTLET) return false;
      seen.add(key);
      perOutlet.set(article.outlet, count + 1);
      return true;
    })
    .slice(0, MAX_HEADLINES);
}
