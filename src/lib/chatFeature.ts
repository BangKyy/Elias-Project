/**
 * Whether Chat (MVP 7) is open: always in development, in production only
 * once NEXT_PUBLIC_CHAT_ENABLED=1 is set, which waits for the Privacy and
 * Terms update (docs/MVP.md, MVP 7, step 5). Read at build time, so changing
 * it needs a redeploy. Until then the header shows "Segera", "Tanya Elias"
 * stays hidden and /chat answers 404.
 */
export const chatEnabled = process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_CHAT_ENABLED === '1';

/** A thumbs up or down on one of Elias's replies (docs/MVP.md, Chat feedback). */
export type ChatRating = 1 | -1;

/** Why a reply missed, offered after a thumbs down; the keys match chat_messages.reason. */
export const chatFeedbackReasons = {
  generic: 'Terlalu umum',
  off_brand: 'Tidak sesuai brand',
  wrong_facts: 'Salah fakta',
  unanswered: 'Tidak menjawab',
} as const;
export type ChatFeedbackReason = keyof typeof chatFeedbackReasons;

/** A message as the chat screen shows it; id is null until the server has saved it. */
export type ChatMessage = {
  id: number | null;
  role: 'user' | 'elias';
  content: string;
  rating: ChatRating | null;
  reason: ChatFeedbackReason | null;
};

/** Where "Tanya Elias" on a card leads: a new conversation about that card. */
export function newChatHref(insightId: string): string {
  return `/chat/baru?kartu=${encodeURIComponent(insightId)}`;
}
