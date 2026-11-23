import Link from 'next/link';
import { ChatCircleText } from '@phosphor-icons/react/dist/ssr';
import { newChatHref } from '@/lib/chatFeature';

/**
 * "Tanya Elias" on a card (Beranda) or a saved trend (Arsip): opens a new
 * conversation about it (MVP 7). Callers show it only to signed-in users
 * while Chat is open (chatEnabled).
 */
export default function AskEliasLink({ insightId }: { insightId: string }) {
  return (
    <Link
      href={newChatHref(insightId)}
      className="flex items-center gap-2 rounded-[4px] border border-primary px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary-tint"
    >
      <ChatCircleText size={16} aria-hidden />
      Tanya Elias
    </Link>
  );
}
