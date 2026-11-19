import { truncate } from './text';

// Reddit's public RSS (Atom) feeds: what Indonesian subreddits discussed most
// in the last 24 hours. Server only.
//
// As checked on 6 Nov 2026: /r/<name>/top/.rss?t=day answers Atom with each
// post's title, permalink, subreddit, author, time and the start of its body,
// in score order. It carries no score, comment count or flair. Unauthenticated
// feeds are rate-limited hard: a second request a few seconds after the first
// got HTTP 429. So this module asks once an hour at most, identifies itself
// as Reddit asks clients to, backs off after a 429, and never fails the cycle.
//
// By 19 Nov 2026 Reddit answered unauthenticated requests from a home IP with
// 404 (feeds) and 403 (JSON). With REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET
// set, the same listing comes from the OAuth API with an app-only token
// (client_credentials grant); without them the RSS feed is still tried.
//
// r/indonesia is one community: urban, online, often English-speaking. It
// shows what people argue about, not what the country watches.

const CACHE_TTL_MS = 3_600_000;
const COOLDOWN_AFTER_429_MS = 15 * 60_000;
const MAX_POSTS = 15;
const USER_AGENT = 'web:elias-trends:0.1 (daily trend research for Indonesian creative teams)';

/** REDDIT_SUBREDDITS overrides, comma separated ("indonesia,finansial"). */
function subreddits(): string[] {
  const list = (process.env.REDDIT_SUBREDDITS ?? 'indonesia')
    .split(',')
    .map((name) => name.trim().replace(/^r\//i, ''))
    .filter((name) => /^[A-Za-z0-9_]{2,21}$/.test(name));
  return list.length ? list : ['indonesia'];
}

export type RedditPost = {
  title: string;
  /** The post's comments page */
  url: string;
  subreddit: string;
  /** 1-based place in the subreddit's top posts of the day */
  rank: number;
  publishedAt: string | null;
  /** Start of the post's own text, empty for link and image posts */
  excerpt: string;
};

export type RedditTrends =
  | { status: 'ok'; posts: RedditPost[] }
  | { status: 'rate_limited' | 'error'; posts: [] };

let cached: { trends: RedditTrends; key: string; expiresAt: number } | null = null;
let coolDownUntil = 0;
let token: { value: string; expiresAt: number } | null = null;

type Fetched = { posts: Omit<RedditPost, 'rank'>[] } | { failure: 'rate_limited' | 'error' };

const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, name: string) => {
    if (name[0] !== '#') return entities[name.toLowerCase()] ?? match;
    const code = name[1].toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : Number(name.slice(1));
    return Number.isFinite(code) ? String.fromCodePoint(code) : match;
  });
}

const clean = (text: string) => text.replace(/\s+/g, ' ').trim();

/**
 * The body is escaped HTML: the post's own text (inside an "md" div), then a
 * "submitted by /u/… [link] [comments]" footer that says nothing.
 */
function excerptOf(content: string): string {
  const html = decodeEntities(content);
  const body = html.match(/<div class="md">([\s\S]*?)<\/div>/)?.[1] ?? '';
  // Posts often link X or Instagram; a link in the prompt would read as coverage of them (BR-5)
  const text = decodeEntities(body.replace(/<[^>]+>/g, ' ')).replace(/\b(?:https?:\/\/|www\.)\S+/gi, ' ');
  return truncate(clean(text), 240);
}

/** One feed's entries in feed (score) order; null when it isn't an Atom feed. */
export function parseRedditFeed(xml: string): Omit<RedditPost, 'rank'>[] | null {
  if (!xml.includes('<feed')) return null;
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? [];
  return entries.flatMap((entry) => {
    const title = clean(decodeEntities(entry.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? ''));
    const url = decodeEntities(entry.match(/<link href="([^"]+)"/)?.[1] ?? '');
    const subreddit = entry.match(/<category term="([^"]+)"/)?.[1] ?? '';
    // Rendered as links, so only Reddit's own pages get through
    if (!title || !/^https:\/\/(www\.)?reddit\.com\//.test(url)) return [];
    const published = Date.parse(entry.match(/<published>([^<]+)<\/published>/)?.[1] ?? '');
    return [
      {
        title: truncate(title, 200),
        url,
        subreddit,
        publishedAt: Number.isNaN(published) ? null : new Date(published).toISOString(),
        excerpt: excerptOf(entry.match(/<content[^>]*>([\s\S]*?)<\/content>/)?.[1] ?? ''),
      },
    ];
  });
}

type ApiPost = {
  title?: unknown;
  permalink?: unknown;
  subreddit?: unknown;
  created_utc?: unknown;
  selftext?: unknown;
};

/** A listing's posts in listing (score) order; null when it isn't a listing. */
export function parseRedditListing(data: unknown): Omit<RedditPost, 'rank'>[] | null {
  const children = (data as { data?: { children?: unknown } } | null)?.data?.children;
  if (!Array.isArray(children)) return null;
  return children.flatMap((child: { data?: ApiPost }) => {
    const post = child?.data;
    if (typeof post?.title !== 'string' || typeof post.permalink !== 'string') return [];
    const title = clean(post.title);
    // Rendered as links, so only Reddit's own pages get through
    if (!title || !post.permalink.startsWith('/r/')) return [];
    const created = typeof post.created_utc === 'number' ? post.created_utc * 1000 : NaN;
    const selftext = typeof post.selftext === 'string' ? post.selftext : '';
    return [
      {
        title: truncate(title, 200),
        url: `https://www.reddit.com${post.permalink}`,
        subreddit: typeof post.subreddit === 'string' ? post.subreddit : '',
        publishedAt: Number.isNaN(created) ? null : new Date(created).toISOString(),
        // Posts often link X or Instagram; a link in the prompt would read as coverage of them (BR-5)
        excerpt: truncate(clean(selftext.replace(/\b(?:https?:\/\/|www\.)\S+/gi, ' ')), 240),
      },
    ];
  });
}

function rateLimited(source: string): Fetched {
  coolDownUntil = Date.now() + COOLDOWN_AFTER_429_MS;
  console.warn(`Reddit ${source} rate-limited; next try in 15 minutes`);
  return { failure: 'rate_limited' };
}

/** An app-only bearer token, reused until shortly before it expires (a day). */
async function accessToken(clientId: string, clientSecret: string): Promise<string | null> {
  if (token && token.expiresAt > Date.now()) return token.value;
  const response = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
  });
  const body = (await response.json().catch(() => null)) as { access_token?: unknown; expires_in?: unknown } | null;
  if (!response.ok || typeof body?.access_token !== 'string') {
    // 401 means a wrong client id or secret
    console.error('Reddit token request returned', response.status);
    return null;
  }
  const lifetimeS = typeof body.expires_in === 'number' ? body.expires_in : 3600;
  token = { value: body.access_token, expiresAt: Date.now() + (lifetimeS - 60) * 1000 };
  return token.value;
}

async function fetchFromApi(key: string, clientId: string, clientSecret: string): Promise<Fetched> {
  try {
    const bearer = await accessToken(clientId, clientSecret);
    if (!bearer) return { failure: 'error' };
    const response = await fetch(
      `https://oauth.reddit.com/r/${key}/top?${new URLSearchParams({ t: 'day', limit: String(MAX_POSTS), raw_json: '1' })}`,
      {
        headers: { Authorization: `Bearer ${bearer}`, 'User-Agent': USER_AGENT },
        cache: 'no-store',
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (response.status === 429) return rateLimited('API');
    // A revoked or expired token: ask for a new one next time
    if (response.status === 401) token = null;
    if (!response.ok) {
      console.error('Reddit API returned', response.status);
      return { failure: 'error' };
    }
    const posts = parseRedditListing(await response.json());
    if (!posts) {
      console.error('Reddit API answer was not a listing');
      return { failure: 'error' };
    }
    return { posts };
  } catch (error) {
    console.error('Reddit API failed', error);
    return { failure: 'error' };
  }
}

async function fetchFromRss(key: string): Promise<Fetched> {
  let xml: string;
  try {
    const response = await fetch(`https://www.reddit.com/r/${key}/top/.rss?${new URLSearchParams({ t: 'day', limit: String(MAX_POSTS) })}`, {
      headers: { 'User-Agent': USER_AGENT },
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
    if (response.status === 429) return rateLimited('RSS');
    if (!response.ok) {
      console.error('Reddit RSS returned', response.status);
      return { failure: 'error' };
    }
    xml = await response.text();
  } catch (error) {
    console.error('Reddit RSS failed', error);
    return { failure: 'error' };
  }
  const posts = parseRedditFeed(xml);
  if (!posts) {
    console.error('Reddit RSS was not a feed', xml.slice(0, 200));
    return { failure: 'error' };
  }
  return { posts };
}

/**
 * The day's top posts of the configured subreddits, in one request (Reddit
 * joins them with "+"). Never throws.
 */
export async function fetchRedditTrends(): Promise<RedditTrends> {
  const names = subreddits();
  const key = names.join('+');
  if (cached?.key === key && cached.expiresAt > Date.now()) return cached.trends;
  if (Date.now() < coolDownUntil) return { status: 'rate_limited', posts: [] };

  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  const fetched = clientId && clientSecret ? await fetchFromApi(key, clientId, clientSecret) : await fetchFromRss(key);
  if ('failure' in fetched) return { status: fetched.failure, posts: [] };
  const trends: RedditTrends = {
    status: 'ok',
    posts: fetched.posts.slice(0, MAX_POSTS).map((post, i) => ({ ...post, rank: i + 1 })),
  };
  cached = { trends, key, expiresAt: Date.now() + CACHE_TTL_MS };
  return trends;
}
