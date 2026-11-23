'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Copy, ThumbsDown, ThumbsUp } from '@phosphor-icons/react';
import { chatFeedbackReasons, type ChatFeedbackReason, type ChatRating } from '@/lib/chatFeature';

type ReplyActionsProps = {
  /** The reply's text, for copying */
  content: string;
  rating: ChatRating | null;
  reason: ChatFeedbackReason | null;
  /** Absent when the reply wasn't saved: it can be copied but not rated */
  onRate?: (rating: ChatRating | null, reason: ChatFeedbackReason | null) => void;
};

const thumbs = [
  { value: 1, label: 'Membantu', Icon: ThumbsUp },
  { value: -1, label: 'Kurang membantu', Icon: ThumbsDown },
] as const;

const iconButton = 'rounded-[4px] p-1 transition-colors';
// How long "Tersalin" stays before the copy icon comes back
const COPIED_MS = 2000;

/**
 * Under one of Elias's replies: copy it, and rate it (docs/MVP.md, Chat
 * feedback). Tapping the chosen thumb again takes the rating back; a thumbs
 * down offers an optional reason. Nothing here reaches the model.
 */
export default function ReplyActions({ content, rating, reason, onRate }: ReplyActionsProps) {
  const [copied, setCopied] = useState<'done' | 'failed' | null>(null);
  const timer = useRef<number>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied('done');
    } catch {
      // No clipboard access, e.g. permission denied or an insecure context
      setCopied('failed');
    }
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(null), COPIED_MS);
  }

  return (
    <div className="mt-1 flex flex-col gap-2">
      <div role="group" aria-label="Aksi balasan" className="-ml-1 flex items-center gap-0.5">
        <button
          type="button"
          onClick={copy}
          aria-label={copied === 'done' ? 'Balasan tersalin' : 'Salin balasan'}
          title={copied === 'done' ? 'Tersalin' : 'Salin balasan'}
          className={`${iconButton} ${copied === 'done' ? 'text-primary' : 'text-gray-400 hover:text-paper'}`}
        >
          {copied === 'done' ? <Check size={16} weight="bold" aria-hidden /> : <Copy size={16} aria-hidden />}
        </button>
        {onRate &&
          thumbs.map(({ value, label, Icon }) => {
            const chosen = rating === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={chosen}
                aria-label={label}
                title={label}
                onClick={() => onRate(chosen ? null : value, null)}
                className={`${iconButton} ${chosen ? 'text-primary' : 'text-gray-400 hover:text-paper'}`}
              >
                <Icon size={16} weight={chosen ? 'fill' : 'regular'} aria-hidden />
              </button>
            );
          })}
        <span aria-live="polite" className="ml-1 text-xs text-gray-400">
          {copied === 'done' ? 'Tersalin' : copied === 'failed' ? 'Gagal menyalin, salin manual.' : ''}
        </span>
      </div>
      {onRate && rating === -1 && (
        <div role="group" aria-label="Apa yang kurang" className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-gray-400">Apa yang kurang?</span>
          {(Object.keys(chatFeedbackReasons) as ChatFeedbackReason[]).map((key) => {
            const chosen = reason === key;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={chosen}
                onClick={() => onRate(-1, chosen ? null : key)}
                className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                  chosen ? 'border-primary bg-primary text-bg-white' : 'border-gray-600 text-gray-300 hover:border-paper hover:text-paper'
                }`}
              >
                {chatFeedbackReasons[key]}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
