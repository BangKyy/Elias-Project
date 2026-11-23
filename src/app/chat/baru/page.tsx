import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import AppShell from '@/components/app/AppShell';
import BerandaBackdrop from '@/components/beranda/BerandaBackdrop';
import ChatView from '@/components/chat/ChatView';
import { chatEnabled } from '@/lib/chatFeature';
import { chatThreadLimit } from '@/lib/elias/chat';
import { headerAccount } from '@/lib/headerAccount';
import { readCard } from '@/lib/insights/store';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Tanya Elias — Elias',
};

/**
 * A new conversation on the card in `?kartu=`, from "Tanya Elias". A card
 * still on Beranda is read here; an older one only lives in the browser's
 * Arsip, so ChatView finds it there. Nothing is saved until the first reply.
 */
export default async function NewChatPage({ searchParams }: { searchParams: Promise<{ kartu?: string }> }) {
  if (!chatEnabled) notFound();
  const { kartu } = await searchParams;
  const insightId = kartu?.trim().slice(0, 120);
  if (!insightId) redirect('/chat');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const stored = await readCard(supabase, insightId);

  return (
    <AppShell userId={user?.id ?? null} account={await headerAccount(supabase, user)} backdrop={<BerandaBackdrop topGlow={false} />}>
      <ChatView
        threadId={null}
        insightId={insightId}
        card={stored ? { title: stored.signal, verdict: stored.verdict } : null}
        initialMessages={[]}
        threadLimit={chatThreadLimit}
      />
    </AppShell>
  );
}
