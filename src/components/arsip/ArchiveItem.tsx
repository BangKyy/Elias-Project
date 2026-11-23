'use client';

import { useState } from 'react';
import { NotePencil, TrashSimple } from '@phosphor-icons/react';
import type { ArchivedTrend, ArchivePriority, ArchiveStatus } from '@/lib/archive';
import { savedOn } from '@/lib/archiveQuery';
import { formatDate } from '@/lib/dates';
import { parseBrief } from '@/lib/elias/brief';
import { sources } from '@/lib/insights/types';
import VerdictTab from '../beranda/VerdictTab';
import AskEliasLink from '../chat/AskEliasLink';
import NoteBox from './NoteBox';
import NoteEditor from './NoteEditor';
import PriorityControl from './PriorityControl';
import StatusControl from './StatusControl';

type ArchiveItemProps = {
  item: ArchivedTrend;
  canSetPriority: boolean;
  /** Signed in with Chat open: shows Tanya Elias (MVP 7) */
  canChat: boolean;
  onStatus: (status: ArchiveStatus) => void;
  onPriority: (priority: ArchivePriority | null) => void;
  onNote: (notes: string) => void;
  onRemove: () => void;
  onPriorityLocked: () => void;
};

// Same chips as the Beranda card's label row
const chip = 'flex h-[27px] items-center bg-primary-tint px-3 font-mono text-xs font-medium text-primary uppercase';
const primaryButton =
  'flex items-center justify-center gap-2 rounded-[4px] bg-primary px-3 py-2 text-xs font-semibold text-bg-white transition-colors hover:bg-ember';
const outlineButton =
  'flex items-center justify-center gap-2 rounded-[4px] border border-primary px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary-tint';

export default function ArchiveItem({
  item,
  canSetPriority,
  canChat,
  onStatus,
  onPriority,
  onNote,
  onRemove,
  onPriorityLocked,
}: ArchiveItemProps) {
  const [editingNotes, setEditingNotes] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  // Entries saved before the verdict was stored still carry it in their brief
  const verdict = item.verdict ?? (item.notes ? parseBrief(item.notes)?.decision : null);

  return (
    <article className="@container relative flex flex-col gap-6 rounded-xl bg-bg-white px-8 pt-[72px] pb-8 shadow-card">
      <div className="absolute top-5 -left-2 flex max-w-[calc(100%+0.5rem)] items-start gap-2.5">
        {verdict && <VerdictTab verdict={verdict} />}
        {/* One line, since the row hangs over the card's top edge; a long category truncates */}
        <ul aria-label="Sumber dan kategori" className="flex min-w-0 gap-[5px]">
          <li className={`${chip} shrink-0`}>{sources[item.source].label}</li>
          <li className={`${chip} min-w-0`} title={item.category}>
            <span className="truncate">{item.category}</span>
          </li>
        </ul>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2.5">
          <h2 className="text-2xl font-semibold">{item.title}</h2>
          {item.tags.length > 0 && (
            <ul aria-label="Tag" className="flex flex-wrap gap-[5px]">
              {item.tags.map((tag) => (
                <li key={tag} className="bg-primary-tint px-2 py-1 font-mono text-[10px] leading-[15px] font-medium text-primary">
                  {tag}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Side by side once both labels fit in full ("SEDANG DIKERJAKAN" needs ~210px) */}
        <div className="flex flex-col gap-3 @[26rem]:flex-row">
          <StatusControl status={item.status} itemTitle={item.title} onChange={onStatus} />
          <PriorityControl
            priority={item.priority}
            itemTitle={item.title}
            editable={canSetPriority}
            onChange={onPriority}
            onLocked={onPriorityLocked}
          />
        </div>
      </div>

      {(item.notes || item.reaction) && <NoteBox notes={item.notes} reaction={item.reaction ?? null} />}

      <div className="mt-auto flex flex-col-reverse gap-3 @sm:flex-row @sm:items-center @sm:gap-2.5">
        <p className="flex-1 text-xs text-disabled-content">
          Disimpan <time dateTime={item.savedAt}>{formatDate(savedOn(item), { month: 'short' })}</time>
        </p>
        {confirmRemove ? (
          <div className="flex items-center justify-between gap-2.5" role="group" aria-label="Konfirmasi hapus">
            <button type="button" onClick={() => setConfirmRemove(false)} className={outlineButton}>
              Batal
            </button>
            <button type="button" onClick={onRemove} className={primaryButton}>
              <TrashSimple size={16} aria-hidden />
              Hapus dari Arsip
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {canChat && <AskEliasLink insightId={item.insightId} />}
            <button type="button" onClick={() => setEditingNotes(true)} className={primaryButton}>
              <NotePencil size={16} aria-hidden />
              {item.notes ? 'Sunting Catatan' : 'Tambah Catatan'}
            </button>
            <button type="button" onClick={() => setConfirmRemove(true)} className={outlineButton}>
              <TrashSimple size={16} aria-hidden />
              Hapus
            </button>
          </div>
        )}
      </div>

      {editingNotes && <NoteEditor item={item} onSave={onNote} onClose={() => setEditingNotes(false)} />}
    </article>
  );
}
