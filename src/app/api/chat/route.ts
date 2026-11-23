import { NextResponse } from 'next/server';
import { isAuthRetryableFetchError } from '@supabase/supabase-js';
import { creativeRoleFor } from '@/lib/creativeRoles';
import { brandContextFor, fetchProfile } from '@/lib/elias/brandProfile';
import {
  chatPromptVersion,
  chatThreadLimit,
  generateChatReply,
  snapshotFromBrowser,
  snapshotFromInsight,
  type CardSnapshot,
  type ChatError,
  type ChatTurn,
} from '@/lib/elias/chat';
import { readCard } from '@/lib/insights/store';
import { refundModelRequest, takeModelRequest, unanswered } from '@/lib/modelLedger';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

// A slow free model can take over a minute; Vercel Hobby allows up to 300 s
export const maxDuration = 120;

const MESSAGE_MAX = 1000;
// Recent messages sent back to the model with each new one, not the whole thread
const HISTORY_MESSAGES = 8;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ChatResponse =
  /** messageId is the saved reply, for rating it; null when the save failed */
  | { ok: true; threadId: string; reply: string; onTopic: boolean; messageId: number | null }
  | { ok: false; error: ChatError };

function fail(status: number, error: ChatError) {
  return NextResponse.json<ChatResponse>({ ok: false, error }, { status });
}

type ChatBody = { threadId: string | null; insightId: string | null; card: unknown; message: string };

/** A message to an existing thread, or the first one on a card: its id, and its Arsip entry when the card is gone. */
function parseBody(body: unknown): ChatBody | null {
  if (typeof body !== 'object' || body === null) return null;
  const { threadId, insightId, card, message } = body as Record<string, unknown>;
  const text = typeof message === 'string' ? message.trim() : '';
  if (!text || text.length > MESSAGE_MAX) return null;
  const thread = typeof threadId === 'string' && UUID.test(threadId) ? threadId : null;
  const insight = typeof insightId === 'string' && insightId.trim() ? insightId.trim().slice(0, 120) : null;
  if (!thread && !insight && card === undefined) return null;
  return { threadId: thread, insightId: insight, card, message: text };
}

/**
 * POST → Elias's reply to one message about one card (MVP 7). Signed-in users
 * who finished onboarding only; guests get 401 (the proxy leaves /api/ open).
 * The thread and both messages are saved only once Elias has answered, with
 * the secret key: clients can read their threads but never write them.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (isAuthRetryableFetchError(authError)) {
    return fail(503, { code: 'upstream', message: 'Elias belum bisa memeriksa sesi kamu. Periksa koneksi lalu coba lagi.' });
  }
  if (!user) return fail(401, { code: 'unauthorized', message: 'Masuk dulu untuk chat dengan Elias.' });

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    raw = null;
  }
  const body = parseBody(raw);
  if (!body) {
    return fail(400, { code: 'invalid_request', message: `Tulis pesan (maksimal ${MESSAGE_MAX} karakter) untuk kartu yang kamu buka.` });
  }

  const admin = createAdminClient();
  if (!admin) return fail(503, { code: 'not_configured', message: 'Chat Elias belum tersedia di server ini.' });

  const [profile, { data: progress }] = await Promise.all([
    fetchProfile(supabase, user.id),
    supabase.from('profiles').select('onboarding_completed_at').eq('id', user.id).maybeSingle<{ onboarding_completed_at: string | null }>(),
  ]);
  if (!profile || !progress?.onboarding_completed_at) {
    return fail(403, { code: 'incomplete_profile', message: 'Selesaikan profil brand kamu dulu untuk chat dengan Elias.' });
  }
  const role = creativeRoleFor(profile.role);

  // The thread's card: from the thread itself (RLS shows only the user's own),
  // else the stored Beranda card, else the Arsip entry the browser sent
  let threadId: string | null = null;
  let card: CardSnapshot | null;
  if (body.threadId) {
    const { data } = await supabase
      .from('chat_threads')
      .select('id, card_snapshot')
      .eq('id', body.threadId)
      .maybeSingle<{ id: string; card_snapshot: CardSnapshot }>();
    if (!data) return fail(404, { code: 'not_found', message: 'Percakapan ini tidak ditemukan.' });
    threadId = data.id;
    card = data.card_snapshot;
  } else {
    const stored = body.insightId ? await readCard(supabase, body.insightId) : null;
    card = stored ? snapshotFromInsight(stored, role) : snapshotFromBrowser(body.card, body.insightId);
    if (!card) return fail(404, { code: 'not_found', message: 'Kartu ini sudah tidak tersedia. Buka lagi dari Arsip.' });
  }

  let history: ChatTurn[] = [];
  if (threadId) {
    const [{ count }, { data: recent }] = await Promise.all([
      supabase.from('chat_messages').select('id', { count: 'exact', head: true }).eq('thread_id', threadId).eq('role', 'user'),
      supabase
        .from('chat_messages')
        .select('role, content')
        .eq('thread_id', threadId)
        .order('id', { ascending: false })
        .limit(HISTORY_MESSAGES)
        .returns<ChatTurn[]>(),
    ]);
    if ((count ?? 0) >= chatThreadLimit) {
      return fail(429, {
        code: 'thread_limit',
        message: `Percakapan ini sudah mencapai ${chatThreadLimit} pesan. Mulai percakapan baru dari kartunya.`,
      });
    }
    history = (recent ?? []).reverse();
  }

  // Counted in the shared ledger, which keeps the cycle's and the email's share out of reach
  const modelRequest = await takeModelRequest('chat', user.id);
  if (!modelRequest.allowed) {
    return modelRequest.refused === 'user'
      ? fail(429, { code: 'user_limit', message: 'Jatah chat kamu untuk hari ini sudah habis.', retryAfter: modelRequest.retryAfter })
      : fail(429, {
          code: 'daily_limit',
          message: 'Chat Elias untuk hari ini sudah penuh. Coba lagi setelah kuota direset.',
          retryAfter: modelRequest.retryAfter,
        });
  }

  const generated = await generateChatReply({ role, brand: brandContextFor(profile), card, history, message: body.message });
  if (!generated.ok) {
    // Rejected before reaching a model: don't count it against the user
    if (unanswered(generated.status)) await refundModelRequest(modelRequest);
    return fail(generated.status, generated.error);
  }

  // Saved only now, so a failed call leaves no empty thread behind
  if (!threadId) {
    const { data, error } = await admin
      .from('chat_threads')
      .insert({ brand_profile_id: profile.brandId, user_id: user.id, insight_id: card.insightId, card_snapshot: card })
      .select('id')
      .single<{ id: string }>();
    if (error || !data) {
      console.error('Chat: thread could not be saved', error);
      return fail(500, { code: 'upstream', message: 'Balasan Elias gagal disimpan. Coba kirim lagi.' });
    }
    threadId = data.id;
  }
  // The reply keeps its model and prompt version, so its rating can be traced back
  const { data: saved, error: saveError } = await admin
    .from('chat_messages')
    .insert([
      { thread_id: threadId, role: 'user', content: body.message },
      { thread_id: threadId, role: 'elias', content: generated.reply, model: generated.model, prompt_version: chatPromptVersion },
    ])
    .select('id, role')
    .returns<{ id: number; role: 'user' | 'elias' }[]>();
  // The reply still reaches the user; only the history misses this turn
  if (saveError) console.error('Chat: messages could not be saved', saveError);
  const messageId = saved?.find((message) => message.role === 'elias')?.id ?? null;

  return NextResponse.json<ChatResponse>({ ok: true, threadId, reply: generated.reply, onTopic: generated.onTopic, messageId });
}
