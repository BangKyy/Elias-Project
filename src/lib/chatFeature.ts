/**
 * Whether Chat (MVP 7) is open: always in development, in production only
 * once NEXT_PUBLIC_CHAT_ENABLED=1 is set, which waits for the Privacy and
 * Terms update (docs/MVP.md, MVP 7, step 5). Read at build time, so changing
 * it needs a redeploy. Until then the header shows "Segera", "Tanya Elias"
 * stays hidden and /chat answers 404.
 */
export const chatEnabled = process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_CHAT_ENABLED === '1';

/** Where "Tanya Elias" on a card leads: a new conversation about that card. */
export function newChatHref(insightId: string): string {
  return `/chat/baru?kartu=${encodeURIComponent(insightId)}`;
}
