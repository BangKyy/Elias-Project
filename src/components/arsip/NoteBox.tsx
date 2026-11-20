'use client';

import { Fragment, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { CaretDown, ThumbsDown, ThumbsUp } from '@phosphor-icons/react';
import type { ArchiveReaction } from '@/lib/archive';
import { parseBrief, type ParsedBrief } from '@/lib/elias/brief';

const reactionLabels: Record<ArchiveReaction, { label: string; icon: typeof ThumbsUp; className: string }> = {
  like: { label: 'Disukai', icon: ThumbsUp, className: 'text-success' },
  dislike: { label: 'Tidak disukai', icon: ThumbsDown, className: 'text-primary' },
};

const sectionLabel = 'font-mono text-xs text-disabled-content uppercase';
const toggleButton =
  'flex w-fit items-center gap-2 rounded-[4px] border border-txt-white px-3 py-2 text-xs font-medium text-txt-white transition-colors hover:border-primary hover:text-primary';

// "Label: value" and "Heading:" lines in a typed note. Short labels only, so
// an ordinary sentence with a colon stays plain
const LABEL = /^([^:\n]{1,40}):(\s|$)/;

/** `**text**` typed in the editor, shown bold; the markers themselves are hidden. */
function inline(text: string, key: string): ReactNode[] {
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? <strong key={`${key}-${i}`}>{part}</strong> : part));
}

/** A typed note with its labels in bold. The saved text stays plain, so search reads the same. */
function formatNote(notes: string): ReactNode[] {
  const lines = notes.split('\n');
  return lines.map((line, i) => {
    const key = String(i);
    const label = !line.includes('://') ? LABEL.exec(line) : null;
    const content = label ? (
      <Fragment key={key}>
        <strong>{label[1]}:</strong>
        {inline(line.slice(label[1].length + 1), key)}
      </Fragment>
    ) : (
      <Fragment key={key}>{inline(line, key)}</Fragment>
    );
    return i < lines.length - 1 ? <Fragment key={`${key}-line`}>{content}{'\n'}</Fragment> : content;
  });
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className={sectionLabel}>{label}</p>
      {children}
    </div>
  );
}

/** The brief's parts under its headline, in the design's order. */
function BriefDetails({ brief }: { brief: ParsedBrief }) {
  const why = brief.why && (
    <div className="flex flex-col">
      <p className={sectionLabel}>Why</p>
      <p className="text-sm text-txt-white">{brief.why}</p>
    </div>
  );
  return (
    <>
      {brief.soWhat && (
        <Section label="So what">
          <p className="text-md text-txt-white">{brief.soWhat}</p>
        </Section>
      )}
      {brief.format && (
        <Section label="Format">
          <p className="text-md text-txt-white">{brief.format}</p>
        </Section>
      )}
      {brief.angle && (
        <Section label="Angle">
          <p className="text-md text-txt-white">{brief.angle}</p>
        </Section>
      )}
      {brief.steps.length > 0 && (
        <Section label="Langkah">
          <ol className="list-decimal text-md text-txt-white">
            {brief.steps.map((step) => (
              <li key={step} className="ms-6">
                {step}
              </li>
            ))}
          </ol>
        </Section>
      )}
      {(brief.copy || why) && <div className="h-px shrink-0 bg-disabled-content" />}
      {brief.copy ? (
        <div className="flex flex-col gap-2.5">
          <p className="text-md font-bold text-txt-white">Saran Copy</p>
          <dl className="flex flex-col gap-2.5 rounded-[4px] border border-disabled-content p-4">
            {(
              [
                ['Hook', brief.copy.hook],
                ['Caption', brief.copy.caption],
                ['CTA', brief.copy.cta],
              ] as const
            ).map(([label, text]) => (
              <div key={label} className="flex flex-col">
                <dt className={sectionLabel}>{label}</dt>
                <dd className="text-sm text-txt-white">{text}</dd>
              </div>
            ))}
          </dl>
          {why}
        </div>
      ) : (
        why
      )}
      {brief.extra && (
        <Section label="Catatan tambahan">
          <p className="text-md break-words whitespace-pre-line text-txt-white [&_strong]:font-bold">{formatNote(brief.extra)}</p>
        </Section>
      )}
    </>
  );
}

/**
 * A saved trend's note on its Arsip card: the design's AI Trend Response
 * Box in its "Note" variant. A brief saved from an Elias analysis shows its
 * headline and folds the rest behind "Buka"; a typed note folds to four lines.
 */
export default function NoteBox({ notes, reaction }: { notes: string; reaction: ArchiveReaction | null }) {
  const detailsId = useId();
  const text = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const brief = notes ? parseBrief(notes) : null;

  // A typed note is measured while folded, and again when the card's width changes
  useLayoutEffect(() => {
    const element = text.current;
    if (!element || expanded) return;
    const measure = () => setOverflows(element.scrollHeight > element.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [notes, expanded]);

  const shown = reaction ? reactionLabels[reaction] : null;
  const canFold = brief ? true : overflows || expanded;

  return (
    <section aria-label="Catatan" className="flex flex-col gap-2.5 rounded-[4px] bg-txt-black p-5 text-paper">
      <div className="flex items-center justify-between gap-3">
        <h3 className="w-fit border border-primary px-3 py-1.5 font-mono text-xs font-bold text-primary uppercase">Catatan</h3>
        {shown && (
          <p className={`flex items-center gap-1 text-xs font-semibold ${shown.className}`}>
            <shown.icon size={14} weight="fill" aria-hidden />
            {shown.label}
          </p>
        )}
      </div>

      {brief && (
        <>
          <p className="border-l-2 border-primary pl-[18px] text-2xl font-bold text-txt-white">{brief.headline}</p>
          {/* Folds by animating its row from 0fr to 1fr; inert while closed so focus skips it */}
          <div
            id={detailsId}
            inert={!expanded}
            className={`grid transition-[grid-template-rows,margin] duration-300 ease-out motion-reduce:transition-none ${
              expanded ? 'grid-rows-[1fr]' : '-mt-2.5 grid-rows-[0fr]'
            }`}
          >
            <div className="flex min-h-0 flex-col gap-2.5 overflow-hidden">
              <BriefDetails brief={brief} />
            </div>
          </div>
        </>
      )}

      {notes && !brief && (
        <p
          id={detailsId}
          ref={text}
          className={`text-md break-words whitespace-pre-line text-txt-white [&_strong]:font-bold ${expanded ? '' : 'line-clamp-4'}`}
        >
          {formatNote(notes)}
        </p>
      )}

      {canFold && (
        <>
          {!expanded && <div className="h-px shrink-0 bg-disabled-content" />}
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={detailsId}
            onClick={() => setExpanded(!expanded)}
            className={`${toggleButton} self-end`}
          >
            {expanded ? 'Tutup' : 'Buka'}
            <CaretDown size={16} aria-hidden className={`transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </>
      )}
    </section>
  );
}
