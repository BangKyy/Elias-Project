import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, ChatCircleText } from '@phosphor-icons/react/dist/ssr';
import AppShell from '@/components/app/AppShell';
import BerandaBackdrop from '@/components/beranda/BerandaBackdrop';
import { verdicts } from '@/components/beranda/VerdictTab';
import { chatEnabled } from '@/lib/chatFeature';
import { formatDate } from '@/lib/dates';
import type { CardSnapshot } from '@/lib/elias/chat';
import { headerAccount } from '@/lib/headerAccount';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Chat — Elias',
};

type ThreadRow = { id: string; card_snapshot: CardSnapshot; last_message_at: string };

// A WIB calendar date from a UTC timestamp, for formatDate
const wibDay = (timestamp: string) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date(timestamp));

/**
 * The user's conversations with Elias, newest first. A conversation always
 * starts from a card ("Tanya Elias" on Beranda or Arsip), so this page only
 * lists them. Signed-in users only: the proxy sends guests to /login.
 */
export default async function ChatPage() {
  if (!chatEnabled) notFound();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // RLS returns only the user's own threads on their own brand
  const { data, error } = await supabase
    .from('chat_threads')
    .select('id, card_snapshot, last_message_at')
    .order('last_message_at', { ascending: false })
    .limit(50)
    .returns<ThreadRow[]>();
  if (error) console.error('Chat: threads could not be read', error.message);
  const threads = data ?? [];

  return (
    <AppShell userId={user?.id ?? null} account={await headerAccount(supabase, user)} backdrop={<BerandaBackdrop topGlow={false} />}>
      <div data-animate="page-item" className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-16">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold md:text-display-sm">Chat dengan Elias</h1>
          <p className="text-md text-gray-600">
            Tanya lanjut soal satu kartu: angle, format, copy, atau langkah hari ini. Mulai dari tombol <strong>Tanya Elias</strong> di
            kartu Beranda atau Arsip. Percakapan terhapus otomatis 30 hari setelah pesan terakhir.
          </p>
        </div>

        {threads.length === 0 ? (
          <div className="flex flex-col items-start gap-4 rounded-xl bg-bg-white p-6 shadow-card">
            <ChatCircleText size={32} aria-hidden className="text-primary" />
            <p className="text-lg font-semibold">Belum ada percakapan.</p>
            <p className="text-md text-gray-600">Buka kartu yang ingin kamu dalami, lalu pilih Tanya Elias.</p>
            <div className="flex flex-wrap gap-2.5">
              <Link
                href="/"
                className="flex items-center gap-2 rounded-[4px] bg-primary px-3 py-2 text-xs font-semibold text-bg-white transition-colors hover:bg-ember"
              >
                Ke Beranda
              </Link>
              <Link
                href="/arsip"
                className="flex items-center gap-2 rounded-[4px] border border-primary px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary-tint"
              >
                Ke Arsip
              </Link>
            </div>
          </div>
        ) : (
          <ul aria-label="Percakapan" className="flex flex-col gap-3">
            {threads.map(({ id, card_snapshot: card, last_message_at: lastAt }) => {
              const verdict = card.verdict ? verdicts[card.verdict] : null;
              return (
                <li key={id}>
                  <Link
                    href={`/chat/${id}`}
                    className="group flex items-center gap-4 rounded-xl bg-bg-white px-5 py-4 shadow-card transition-colors hover:bg-neutral-50"
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      {verdict && (
                        <span className="flex items-center gap-1 font-mono text-xs font-bold text-primary uppercase">
                          <verdict.icon size={14} weight="fill" aria-hidden />
                          {verdict.label}
                        </span>
                      )}
                      <span className="line-clamp-2 text-md font-semibold">{card.title}</span>
                      <span className="text-xs text-disabled-content">
                        Terakhir <time dateTime={lastAt}>{formatDate(wibDay(lastAt), { month: 'short' })}</time>
                      </span>
                    </div>
                    <ArrowRight size={20} aria-hidden className="shrink-0 text-primary transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
