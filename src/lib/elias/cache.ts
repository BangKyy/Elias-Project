import type { NewsContext } from '../gdelt';
import { createAdminClient } from '../supabase/admin';
import type { YouTubeTrends } from '../youtube';
import type { EliasInsight } from './types';

// Free-tier safeguards (50 requests/day on OpenRouter). The cache lives in
// Supabase (elias_insight_cache), so every server instance shares it; what a
// fresh answer costs is counted in the shared request ledger (../modelLedger).
// Without SUPABASE_SECRET_KEY the cache falls back to this process's memory,
// which is only correct for a single server.
// In-flight dedupe stays per instance: a duplicate across instances costs one
// extra call, never a request beyond the ledger's limits.

type Cached = { insight: EliasInsight; model: string; news: NewsContext; youtube: YouTubeTrends; expiresAt: number };
type Payload = Omit<Cached, 'expiresAt'>;

const MAX_ENTRIES = 500;
const memoryCache = new Map<string, Cached>();
// Identical requests already on their way share one upstream call
const inFlight = new Map<string, Promise<unknown>>();

const WIB_OFFSET = 7 * 3_600_000;
const DAY = 86_400_000;

/** Insights follow the daily cycle, so a cached answer lives until midnight WIB. */
function endOfDayInJakarta(now = Date.now()): number {
  return Math.floor((now + WIB_OFFSET) / DAY) * DAY + DAY - WIB_OFFSET;
}

let warnedMemoryOnly = false;
function adminOrWarn() {
  const admin = createAdminClient();
  if (!admin && !warnedMemoryOnly) {
    warnedMemoryOnly = true;
    console.warn('Elias cache: SUPABASE_SECRET_KEY is not set, so the cache is per instance only');
  }
  return admin;
}

function getMemoryInsight(key: string): Cached | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    memoryCache.delete(key);
    return null;
  }
  return entry;
}

function setMemoryInsight(key: string, entry: Cached) {
  // Maps keep insertion order, so the first key is the oldest
  if (memoryCache.size >= MAX_ENTRIES) memoryCache.delete(memoryCache.keys().next().value!);
  memoryCache.set(key, entry);
}

export async function getCachedInsight(key: string): Promise<Cached | null> {
  const local = getMemoryInsight(key);
  if (local) return local;
  const admin = adminOrWarn();
  if (!admin) return null;

  const { data, error } = await admin
    .from('elias_insight_cache')
    .select('payload, expires_at')
    .eq('key', key)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle<{ payload: Payload; expires_at: string }>();
  if (error) {
    // A cache miss only costs a fresh generation, so a read error never fails the request
    console.error('Elias cache: read failed', error.message);
    return null;
  }
  if (!data) return null;
  const entry = { ...data.payload, expiresAt: Date.parse(data.expires_at) };
  // Repeat hits on this instance skip the round trip
  setMemoryInsight(key, entry);
  return entry;
}

export async function setCachedInsight(
  key: string,
  insight: EliasInsight,
  model: string,
  news: NewsContext,
  youtube: YouTubeTrends,
) {
  const expiresAt = endOfDayInJakarta();
  setMemoryInsight(key, { insight, model, news, youtube, expiresAt });
  const admin = adminOrWarn();
  if (!admin) return;

  const payload: Payload = { insight, model, news, youtube };
  const { error } = await admin
    .from('elias_insight_cache')
    .upsert({ key, payload, expires_at: new Date(expiresAt).toISOString() });
  if (error) console.error('Elias cache: write failed', error.message);
}

export function dedupe<T>(key: string, run: () => Promise<T>): Promise<T> {
  const pending = inFlight.get(key) as Promise<T> | undefined;
  if (pending) return pending;
  const promise = run().finally(() => inFlight.delete(key));
  inFlight.set(key, promise);
  return promise;
}
