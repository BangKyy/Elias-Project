import type { BrandCategory } from './brandCategories';
import { truncate } from './text';

// GitHub's official REST Search API: the most-starred repositories created in
// the last 7 days, a signal of what developers are rushing to. Server only,
// no key needed. Only tech-adjacent brands get it.
//
// As checked on 19 Nov 2026: /search/repositories?q=created:>DATE&sort=stars
// answers without a key, 10 searches a minute per IP (X-RateLimit-* headers),
// with each repository's topics. GITHUB_TOKEN, a free personal token with no
// scopes, raises that to 30 a minute; nothing else changes. The top of the
// list is global and mixed: AI agent tooling next to Chinese-language
// automation scripts and credential tools, so the reader still judges what a
// brand can use. Forks and archived repositories are left out, and so are
// repositories below MIN_STARS, which are noise this early.
//
// The list moves over hours, not minutes, so an answer is kept for an hour;
// after a rate limit nothing is asked until GitHub's reset time. A failure
// never fails the caller.

const ENDPOINT = 'https://api.github.com/search/repositories';
const WINDOW_DAYS = 7;
const MIN_STARS = 50;
const MAX_REPOS = 15;
const MAX_TOPICS = 6;
const CACHE_TTL_MS = 3_600_000;
// Used when GitHub gives no reset time
const COOLDOWN_MS = 60_000;
const USER_AGENT = 'elias-trends/0.1 (daily trend research for Indonesian creative teams)';

export interface GitHubTrendItem {
  id: number;
  /** "owner/name" */
  fullName: string;
  /** Empty when the repository has none */
  description: string;
  stars: number;
  /** Main language, empty when GitHub detected none */
  language: string;
  topics: string[];
  url: string;
}

export type GitHubTrends =
  | { status: 'ok'; /** Repositories created after this day (ISO date) */ since: string; repos: GitHubTrendItem[] }
  | { status: 'rate_limited' | 'error'; since: string; repos: [] };

interface ApiRepository {
  id?: unknown;
  full_name?: unknown;
  description?: unknown;
  stargazers_count?: unknown;
  language?: unknown;
  topics?: unknown;
  html_url?: unknown;
}

/** Brands that build on, sell or teach software: tech, edtech, fintech. */
export const techAdjacentCategories: readonly BrandCategory[] = ['technology', 'education', 'finance'];

export const isTechAdjacent = (category: string | null): boolean =>
  techAdjacentCategories.some((id) => id === category);

let cached: { trends: GitHubTrends; expiresAt: number } | null = null;
let coolDownUntil = 0;

/** "★ 4.131 · Rust · topik: cli, codex" for prompts. */
export function repoFacts(repo: GitHubTrendItem): string {
  return [
    `★ ${repo.stars.toLocaleString('id-ID')}`,
    repo.language,
    repo.topics.length ? `topik: ${repo.topics.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

/** "1. owner/name (★ 4.131 · Rust) — description" lines, or a note when there are none. */
export function formatGitHubTrends(trends: GitHubTrends): string {
  if (trends.status !== 'ok' || !trends.repos.length) return 'Data GitHub tidak tersedia saat ini.';
  return trends.repos
    .map((repo, i) => `${i + 1}. ${repo.fullName} (${repoFacts(repo)})${repo.description ? ` — ${repo.description}` : ''}`)
    .join('\n');
}

/** The search response's repositories; null when it isn't a search response. */
export function parseRepositories(data: unknown): GitHubTrendItem[] | null {
  const items = (data as { items?: unknown } | null)?.items;
  if (!Array.isArray(items)) return null;
  return (items as ApiRepository[]).flatMap((repo) => {
    const { id, full_name: fullName, stargazers_count: stars, html_url: url } = repo;
    if (typeof id !== 'number' || typeof fullName !== 'string' || typeof stars !== 'number') return [];
    // Rendered as links, so only GitHub's own pages get through
    if (typeof url !== 'string' || !url.startsWith('https://github.com/')) return [];
    return [
      {
        id,
        fullName,
        description: typeof repo.description === 'string' ? truncate(repo.description.replace(/\s+/g, ' ').trim(), 200) : '',
        stars,
        language: typeof repo.language === 'string' ? repo.language : '',
        topics: Array.isArray(repo.topics)
          ? repo.topics.filter((topic): topic is string => typeof topic === 'string').slice(0, MAX_TOPICS)
          : [],
        url,
      },
    ];
  });
}

/** When GitHub allows the next search, from its reset header (epoch seconds). */
function resetAt(headers: Headers): number {
  const reset = Number(headers.get('x-ratelimit-reset'));
  return Number.isFinite(reset) && reset > 0 ? reset * 1000 : Date.now() + COOLDOWN_MS;
}

/** The most-starred new repositories of the last week. Never throws. */
export async function fetchGitHubTrends(): Promise<GitHubTrends> {
  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString().slice(0, 10);
  if (cached && cached.expiresAt > Date.now()) return cached.trends;
  if (Date.now() < coolDownUntil) return { status: 'rate_limited', since, repos: [] };

  const token = process.env.GITHUB_TOKEN;
  try {
    const response = await fetch(
      `${ENDPOINT}?${new URLSearchParams({
        q: `created:>${since} stars:>=${MIN_STARS} fork:false archived:false`,
        sort: 'stars',
        order: 'desc',
        per_page: String(MAX_REPOS),
      })}`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': USER_AGENT,
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(10_000),
      },
    );
    // GitHub answers a spent limit with 403 or 429 and no remaining searches
    if (response.status === 429 || (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0')) {
      coolDownUntil = resetAt(response.headers);
      console.warn('GitHub search rate-limited until', new Date(coolDownUntil).toISOString());
      return { status: 'rate_limited', since, repos: [] };
    }
    if (!response.ok) {
      // 401 means a wrong GITHUB_TOKEN
      console.error('GitHub search returned', response.status);
      return { status: 'error', since, repos: [] };
    }
    const repos = parseRepositories(await response.json());
    if (!repos) {
      console.error('GitHub search answer was not a repository list');
      return { status: 'error', since, repos: [] };
    }
    const trends: GitHubTrends = { status: 'ok', since, repos };
    cached = { trends, expiresAt: Date.now() + CACHE_TTL_MS };
    return trends;
  } catch (error) {
    console.error('GitHub search failed', error);
    return { status: 'error', since, repos: [] };
  }
}
