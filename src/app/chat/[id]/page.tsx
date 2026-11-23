import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import AppShell from '@/components/app/AppShell';
import BerandaBackdrop from '@/components/beranda/BerandaBackdrop';
import ChatView from '@/components/chat/ChatView';
import { chatEnabled } from '@/lib/chatFeature';
import { chatThreadLimit, type CardSnapshot, type ChatTurn } from '@/lib/elias/chat';
import { headerAccount } from '@/lib/headerAccount';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Chat — Elias',
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** One saved conversation. RLS only returns the user's own, so anyone else's id is a 404 (DM-6). */
export default async function ChatThreadPage({ params }: { params: Promise<{ id: string }> }) {
  if (!chatEnabled) notFound();
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: thread }, { data: messages }] = await Promise.all([
    supabase.from('chat_threads').select('id, card_snapshot').eq('id', id).maybeSingle<{ id: string; card_snapshot: CardSnapshot }>(),
    supabase.from('chat_messages').select('role, content').eq('thread_id', id).order('id').returns<ChatTurn[]>(),
  ]);
  if (!thread) notFound();

  return (
    <AppShell userId={user?.id ?? null} account={await headerAccount(supabase, user)} backdrop={<BerandaBackdrop topGlow={false} />}>
      <ChatView
        threadId={thread.id}
        insightId={thread.card_snapshot.insightId}
        card={{ title: thread.card_snapshot.title, verdict: thread.card_snapshot.verdict }}
        initialMessages={messages ?? []}
        threadLimit={chatThreadLimit}
      />
    </AppShell>
  );
}
