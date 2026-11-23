import { createAdminClient } from './supabase/admin';

// The shared request ledger (supabase/migrations/20261123110000_model_request_ledger.sql,
// docs/MVP.md): every OpenRouter request the app makes, counted by kind
// against the one account-wide free quota, so chat can never spend the share
// the daily cycle and the morning email need. Server only.

export type RequestKind = 'cycle' | 'analysis' | 'chat' | 'email';

/** Which limit said no: the account-wide day, the kind's total, or the user's own. */
export type Refusal = 'daily' | 'kind' | 'user';

// OpenRouter's free models allow 50 requests a day per account (1,000 once it
// has bought $10 of credit)
const DAILY_LIMIT = Number(process.env.OPENROUTER_DAILY_LIMIT) || 50;
// Kept for the cycle and the morning email: analysis and chat stop this far short of the total
const RESERVED = Number(process.env.ELIAS_RESERVED_REQUESTS) || 25;

const limits: Record<RequestKind, { perUser: number | null; total: number | null }> = {
  cycle: { perUser: null, total: null },
  email: { perUser: null, total: null },
  analysis: { perUser: Number(process.env.ELIAS_USER_DAILY_LIMIT) || 10, total: null },
  chat: { perUser: Number(process.env.ELIAS_CHAT_DAILY_LIMIT) || 5, total: Number(process.env.ELIAS_CHAT_TOTAL_LIMIT) || 15 },
};

const reservedKinds: RequestKind[] = ['cycle', 'email'];

export type ModelRequest = {
  kind: RequestKind;
  userId: string | null;
  allowed: boolean;
  refused: Refusal | null;
  /** Seconds until the refusing limit resets; 0 when allowed */
  retryAfter: number;
  /** The ledger row, or null when this instance counted it in memory */
  id: number | null;
};

const WIB_OFFSET = 7 * 3_600_000;
const DAY = 86_400_000;
// OpenRouter's quota day starts at 00:00 UTC (07:00 WIB); user limits follow the WIB day
const quotaDayStart = (now: number) => Math.floor(now / DAY) * DAY;
const userDayStart = (now: number) => Math.floor((now + WIB_OFFSET) / DAY) * DAY - WIB_OFFSET;

function retryAfter(refused: Refusal | null, now: number): number {
  if (!refused) return 0;
  const resetsAt = (refused === 'user' ? userDayStart(now) : quotaDayStart(now)) + DAY;
  return Math.ceil((resetsAt - now) / 1000);
}

// Without the secret key, or when the database can't be reached, each
// instance counts on its own, the same limits in memory
const memory: { kind: RequestKind; userId: string | null; at: number }[] = [];

function takeInMemory(kind: RequestKind, userId: string | null, now: number): Refusal | null {
  while (memory.length && memory[0].at < now - 2 * DAY) memory.shift();
  const today = memory.filter((entry) => entry.at >= quotaDayStart(now));
  const { perUser, total } = limits[kind];
  if (today.length >= DAILY_LIMIT - (reservedKinds.includes(kind) ? 0 : RESERVED)) return 'daily';
  if (total !== null && today.filter((entry) => entry.kind === kind).length >= total) return 'kind';
  if (
    perUser !== null &&
    userId !== null &&
    memory.filter((entry) => entry.kind === kind && entry.userId === userId && entry.at >= userDayStart(now)).length >= perUser
  ) {
    return 'user';
  }
  memory.push({ kind, userId, at: now });
  return null;
}

let warnedMemoryOnly = false;

/** Records one request before it is made; not allowed once a limit is reached. */
export async function takeModelRequest(kind: RequestKind, userId: string | null = null): Promise<ModelRequest> {
  const now = Date.now();
  const { perUser, total } = limits[kind];
  const admin = createAdminClient();
  if (admin) {
    const { data, error } = await admin
      .rpc('take_model_request', {
        p_kind: kind,
        p_user_id: userId,
        p_daily_limit: DAILY_LIMIT,
        p_reserved: RESERVED,
        p_kind_limit: total,
        p_user_limit: perUser,
      })
      .single<{ request_id: number | null; refused: Refusal | null }>();
    if (!error && data) {
      return { kind, userId, allowed: !data.refused, refused: data.refused, retryAfter: retryAfter(data.refused, now), id: data.request_id };
    }
    // Rather than locking everyone out, e.g. before the ledger's migration is applied
    console.error('Model ledger: take failed, counting in memory', error?.message);
  } else if (!warnedMemoryOnly) {
    warnedMemoryOnly = true;
    console.warn('Model ledger: SUPABASE_SECRET_KEY is not set, so requests are counted per instance only');
  }
  const refused = takeInMemory(kind, userId, now);
  return { kind, userId, allowed: !refused, refused, retryAfter: retryAfter(refused, now), id: null };
}

/** Whether a failed call never reached a model (rejected or unavailable), so its request goes back. */
export const unanswered = (status: number) => status === 429 || status === 503;

/** Gives a request back, to wherever it was counted. */
export async function refundModelRequest(request: ModelRequest) {
  if (!request.allowed) return;
  if (request.id !== null) {
    const { error } = (await createAdminClient()?.rpc('refund_model_request', { p_request_id: request.id })) ?? {};
    if (error) console.error('Model ledger: refund failed', error.message);
    return;
  }
  const index = memory.findLastIndex((entry) => entry.kind === request.kind && entry.userId === request.userId);
  if (index >= 0) memory.splice(index, 1);
}
