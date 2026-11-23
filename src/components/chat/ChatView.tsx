'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CircleNotch, PaperPlaneRight, TrashSimple } from '@phosphor-icons/react';
import type { ChatResponse } from '@/app/api/chat/route';
import { useArchive } from '@/lib/archive';
import type { ChatFeedbackReason, ChatMessage, ChatRating } from '@/lib/chatFeature';
import type { Verdict } from '@/lib/insights/types';
import { createClient } from '@/lib/supabase/client';
import { FormMessage, type FormStatus } from '../auth/fields';
import VerdictTab from '../beranda/VerdictTab';
import ReplyActions from './ReplyActions';
import ReplyText from './ReplyText';

const MESSAGE_MAX = 1000;

// Starting points for an empty conversation; a tap fills the box, nothing is sent yet
const suggestions = [
  'Angle apa yang paling cocok untuk brand kami?',
  'Format apa yang sebaiknya kami pakai hari ini?',
  'Apa risikonya kalau kami ikut tren ini?',
];

const primaryButton =
  'flex items-center justify-center gap-2 rounded-[4px] bg-primary px-4 py-2.5 text-sm font-semibold text-bg-white transition-colors hover:enabled:bg-ember disabled:cursor-not-allowed disabled:bg-primary-subtle';
const outlineButton =
  'flex items-center justify-center gap-2 rounded-[4px] border border-primary px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary-tint';

const noop = () => () => {};

/** Device storage only exists after hydration; until then the Arsip is unknown, not empty. */
function useHydrated() {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}

/** What the page knows about the card; null when only the browser's Arsip has it. */
export type ChatCard = { title: string; verdict: Verdict | null };

type ChatViewProps = {
  /** The saved conversation, or null for a new one on `insightId` */
  threadId: string | null;
  insightId: string | null;
  card: ChatCard | null;
  initialMessages: ChatMessage[];
  /** The user's messages allowed per conversation (ELIAS_CHAT_THREAD_LIMIT) */
  threadLimit: number;
};

/**
 * One conversation with Elias about one card (MVP 7). The first message opens
 * the thread on the server, then the page moves to its address. A card no
 * longer on Beranda comes from this device's Arsip and is sent along with the
 * first message.
 */
export default function ChatView({ threadId, insightId, card, initialMessages, threadLimit }: ChatViewProps) {
  const router = useRouter();
  const { items } = useArchive();
  const hydrated = useHydrated();
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<FormStatus>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // A card that left Beranda is only in this device's Arsip
  const saved = !card && insightId ? items.find((item) => item.insightId === insightId) : undefined;
  const shown: ChatCard | null = card ?? (saved ? { title: saved.title, verdict: saved.verdict ?? null } : null);
  const used = messages.filter((message) => message.role === 'user').length;
  const left = Math.max(threadLimit - used, 0);
  const canSend = draft.trim() !== '' && draft.length <= MESSAGE_MAX && left > 0 && !sending && shown !== null;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, sending]);

  async function send(event?: FormEvent) {
    event?.preventDefault();
    if (!canSend) return;
    const message = draft.trim();
    setSending(true);
    setStatus(null);
    setMessages((current) => [...current, { id: null, role: 'user', content: message, rating: null, reason: null }]);
    setDraft('');

    let result: ChatResponse;
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(threadId ? { threadId, message } : { insightId, card: saved, message }),
      });
      result = (await response.json()) as ChatResponse;
    } catch {
      result = { ok: false, error: { code: 'upstream', message: 'Elias belum bisa dihubungi. Periksa koneksi lalu coba lagi.' } };
    }
    setSending(false);

    if (!result.ok) {
      // Nothing was saved: take the message back into the box so it can be sent again
      setMessages((current) => current.slice(0, -1));
      setDraft(message);
      setStatus({ tone: 'error', text: result.error.message });
      return;
    }
    setMessages((current) => [...current, { id: result.messageId, role: 'elias', content: result.reply, rating: null, reason: null }]);
    // The first message opened the thread: give the conversation its own address
    if (!threadId) router.replace(`/chat/${result.threadId}`);
  }

  // Shown at once; the old rating comes back if the save fails. RLS only lets
  // the thread's owner rate, and only the rating columns (chat_feedback migration)
  async function rate(id: number, rating: ChatRating | null, reason: ChatFeedbackReason | null) {
    const before = messages.find((message) => message.id === id);
    if (!before) return;
    const apply = (next: Pick<ChatMessage, 'rating' | 'reason'>) =>
      setMessages((current) => current.map((message) => (message.id === id ? { ...message, ...next } : message)));
    apply({ rating, reason });
    const { error } = await createClient().from('chat_messages').update({ rating, reason }).eq('id', id);
    if (error) {
      apply({ rating: before.rating, reason: before.reason });
      setStatus({ tone: 'error', text: 'Penilaian gagal disimpan. Coba lagi.' });
    }
  }

  async function deleteThread() {
    if (!threadId) return;
    setDeleting(true);
    const { error } = await createClient().from('chat_threads').delete().eq('id', threadId);
    if (error) {
      setDeleting(false);
      setConfirmDelete(false);
      setStatus({ tone: 'error', text: 'Percakapan gagal dihapus. Coba lagi.' });
      return;
    }
    router.push('/chat');
    router.refresh();
  }

  if (!shown) {
    // Waiting for the Arsip to load before saying the card is gone
    if (!hydrated) return null;
    return (
      <section data-animate="page-item" className="flex max-w-2xl flex-col gap-4 pb-16">
        <h1 className="text-2xl font-bold">Kartu ini tidak ditemukan</h1>
        <p className="text-md text-gray-600">
          Kartu di Beranda hanya tersedia 5 hari. Simpan kartu ke Arsip agar tetap bisa kamu tanyakan ke Elias.
        </p>
        <div className="flex flex-wrap gap-2.5">
          <Link href="/" className={outlineButton}>
            Ke Beranda
          </Link>
          <Link href="/arsip" className={outlineButton}>
            Ke Arsip
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div data-animate="page-item" className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-16">
      <div className="flex flex-col gap-4">
        <Link href="/chat" className="flex w-fit items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-txt-black">
          <ArrowLeft size={16} aria-hidden />
          Semua percakapan
        </Link>
        <div className="flex flex-col gap-3">
          <p className="font-mono text-xs font-bold tracking-wide text-gray-600 uppercase">Tanya Elias soal kartu ini</p>
          {shown.verdict && (
            <div className="-ml-2">
              <VerdictTab verdict={shown.verdict} />
            </div>
          )}
          <h1 className="text-xl font-bold md:text-2xl">{shown.title}</h1>
          <p className="text-xs text-gray-600">
            Elias hanya membahas kartu ini. Pesan disimpan 30 hari dan diproses model AI melalui OpenRouter, jadi jangan tulis
            informasi rahasia.
          </p>
        </div>
      </div>

      <ol aria-label="Percakapan" aria-live="polite" className="flex flex-col gap-4">
        {messages.map((message, i) => (
          <li
            key={i}
            className={
              message.role === 'user'
                ? 'max-w-[85%] self-end rounded-2xl rounded-br-sm bg-primary-tint px-4 py-3 text-md break-words whitespace-pre-line text-txt-black'
                : 'flex max-w-[85%] flex-col gap-1.5 self-start rounded-2xl rounded-bl-sm bg-txt-black px-4 py-3 text-paper'
            }
          >
            {message.role === 'elias' ? (
              <>
                <span className="font-mono text-xs font-bold text-primary uppercase">Elias</span>
                <ReplyText text={message.content} />
              </>
            ) : (
              message.content
            )}
            {message.role === 'elias' && (
              <ReplyActions
                content={message.content}
                rating={message.rating}
                reason={message.reason}
                onRate={message.id === null ? undefined : (rating, reason) => rate(message.id!, rating, reason)}
              />
            )}
          </li>
        ))}
        {sending && (
          <li className="flex items-center gap-2 self-start rounded-2xl rounded-bl-sm bg-neutral-100 px-4 py-3 text-sm text-gray-600">
            <CircleNotch size={16} weight="bold" aria-hidden className="motion-safe:animate-spin" />
            Elias sedang menulis… model gratis kadang butuh sampai satu menit.
          </li>
        )}
      </ol>
      <div ref={endRef} />

      {messages.length === 0 && !sending && (
        <ul aria-label="Contoh pertanyaan" className="flex flex-wrap gap-2">
          {suggestions.map((text) => (
            <li key={text}>
              <button
                type="button"
                onClick={() => setDraft(text)}
                className="rounded-full border border-disabled-surface px-3 py-1.5 text-sm text-gray-600 transition-colors hover:border-txt-black hover:text-txt-black"
              >
                {text}
              </button>
            </li>
          ))}
        </ul>
      )}

      <FormMessage status={status} />

      {left > 0 ? (
        <form onSubmit={send} className="flex flex-col gap-2">
          <label htmlFor="chat-message" className="sr-only">
            Pesan untuk Elias
          </label>
          <textarea
            id="chat-message"
            rows={3}
            value={draft}
            maxLength={MESSAGE_MAX}
            disabled={sending}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send();
            }}
            placeholder="Tanya soal angle, format, copy, atau langkah hari ini…"
            className="w-full resize-y rounded-lg border border-disabled-surface px-3 py-2 text-md outline-none placeholder:text-disabled-content focus:border-primary disabled:bg-neutral-50"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-gray-600">
              Sisa {left} pesan di percakapan ini · {draft.length}/{MESSAGE_MAX} · <strong>Ctrl+Enter</strong> untuk kirim
            </p>
            <button type="submit" disabled={!canSend} aria-busy={sending} className={primaryButton}>
              <PaperPlaneRight size={16} aria-hidden />
              Kirim
            </button>
          </div>
        </form>
      ) : (
        <p className="rounded-lg bg-neutral-100 px-4 py-3 text-sm text-gray-600">
          Percakapan ini sudah mencapai {threadLimit} pesan. Mulai percakapan baru dari kartunya di Beranda atau Arsip.
        </p>
      )}

      {threadId &&
        (confirmDelete ? (
          <div role="group" aria-label="Konfirmasi hapus" className="flex flex-wrap items-center gap-2.5">
            <p className="text-sm text-gray-600">Hapus percakapan ini beserta semua pesannya?</p>
            <button type="button" onClick={() => setConfirmDelete(false)} disabled={deleting} className={outlineButton}>
              Batal
            </button>
            <button type="button" onClick={deleteThread} disabled={deleting} className={primaryButton}>
              <TrashSimple size={16} aria-hidden />
              {deleting ? 'Menghapus…' : 'Hapus percakapan'}
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} className={`${outlineButton} w-fit`}>
            <TrashSimple size={16} aria-hidden />
            Hapus percakapan
          </button>
        ))}
    </div>
  );
}
