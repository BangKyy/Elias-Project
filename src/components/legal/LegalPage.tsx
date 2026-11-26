import type { ReactNode } from 'react';
import Link from 'next/link';
import { CaretDown } from '@phosphor-icons/react/dist/ssr';
import { LEGAL_CONTACT_EMAIL, LEGAL_EFFECTIVE_DATE, LEGAL_INSTAGRAM_URL, PINTEREST_INTEGRATION_LIVE, legalDocs } from '@/lib/legal';

export type LegalSection = { id: string; title: string; content: ReactNode };

/* Prose pieces, so every document reads with the same rhythm */

export function P({ children }: { children: ReactNode }) {
  return <p className="text-md text-neutral-80 [&_strong]:font-semibold [&_strong]:text-txt-black">{children}</p>;
}

export function List({ children }: { children: ReactNode }) {
  return (
    <ul className="flex list-disc flex-col gap-2 pl-5 text-md text-neutral-80 marker:text-primary [&_strong]:font-semibold [&_strong]:text-txt-black">
      {children}
    </ul>
  );
}

/** A named piece of data or a service, in the mono label style */
export function Term({ children }: { children: ReactNode }) {
  return <code className="rounded-sm bg-neutral-100 px-1.5 py-0.5 font-mono text-[0.85em] break-all text-txt-black">{children}</code>;
}

export function ContactLink() {
  return (
    <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="font-semibold break-all text-primary underline-offset-2 hover:underline">
      {LEGAL_CONTACT_EMAIL}
    </a>
  );
}

export function InstagramLink() {
  return (
    <a href={LEGAL_INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="font-semibold break-all text-primary underline-offset-2 hover:underline">
      {LEGAL_INSTAGRAM_URL}
    </a>
  );
}

/**
 * Pinterest in a list of trend sources: named as being integrated, with
 * no data read, until PINTEREST_INTEGRATION_LIVE (BR-5)
 */
export function PinterestSource() {
  return PINTEREST_INTEGRATION_LIVE ? (
    <>Pinterest Trends API</>
  ) : (
    <>Pinterest Trends API (sedang diintegrasikan; sebelum integrasinya aktif, Elias tidak membaca data apa pun dari Pinterest)</>
  );
}

function Toc({ sections }: { sections: LegalSection[] }) {
  return (
    <ol className="flex flex-col gap-2.5">
      {sections.map((section, i) => (
        <li key={section.id}>
          <a href={`#${section.id}`} className="flex gap-3 text-sm text-gray-600 transition-colors hover:text-txt-black">
            <span className="font-mono text-xs leading-5 text-primary">{String(i + 1).padStart(2, '0')}</span>
            {section.title}
          </a>
        </li>
      ))}
    </ol>
  );
}

/**
 * Shared layout of the three legal documents: title and effective date, a
 * short summary, tabs between the documents, then numbered sections with a
 * table of contents (sticky beside them on laptop, folded on mobile).
 */
export default function LegalPage({
  href,
  title,
  intro,
  summary,
  sections,
}: {
  /** This document's path, to mark its tab */
  href: (typeof legalDocs)[number]['href'];
  title: string;
  intro: ReactNode;
  /** The points worth knowing even if nothing else is read */
  summary: ReactNode[];
  sections: LegalSection[];
}) {
  return (
    <div data-animate="page-item" className="flex flex-col gap-8 pb-10 md:gap-10">
      <header className="flex flex-col gap-3">
        <p className="font-mono text-xs font-bold tracking-wide text-gray-600 uppercase">Legal</p>
        <h1 className="max-w-4xl text-2xl font-bold md:text-display-sm laptop:text-display-md">{title}</h1>
        <p className="font-mono text-xs text-disabled-content uppercase">Berlaku sejak {LEGAL_EFFECTIVE_DATE}</p>
        <div className="max-w-3xl text-md text-neutral-80">{intro}</div>
      </header>

      <nav aria-label="Dokumen legal" className="-mb-px flex gap-6 overflow-x-auto border-b border-disabled-surface [scrollbar-width:none]">
        {legalDocs.map((doc) => {
          const current = doc.href === href;
          return (
            <Link
              key={doc.href}
              href={doc.href}
              aria-current={current ? 'page' : undefined}
              className={`-mb-px shrink-0 border-b-2 pb-3 text-md font-semibold whitespace-nowrap transition-colors ${
                current ? 'border-primary text-txt-black' : 'border-transparent text-gray-600 hover:text-txt-black'
              }`}
            >
              {doc.label}
            </Link>
          );
        })}
      </nav>

      <section aria-labelledby="ringkasan" className="flex max-w-3xl flex-col gap-3 border border-primary p-5 md:p-6">
        <h2 id="ringkasan" className="w-fit font-mono text-xs font-bold text-primary uppercase">
          Ringkasan
        </h2>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-md text-neutral-80 marker:text-primary [&_strong]:font-semibold [&_strong]:text-txt-black">
          {summary.map((point, i) => (
            <li key={i}>{point}</li>
          ))}
        </ul>
      </section>

      {/* minmax(0,…) columns, so a wide table scrolls in its own box instead of widening the page */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 laptop:grid-cols-[260px_minmax(0,1fr)] laptop:gap-16">
        <aside className="laptop:sticky laptop:top-28 laptop:self-start">
          {/* Folded on mobile so the text starts right away */}
          <details className="group rounded-md border border-disabled-surface p-4 laptop:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between font-mono text-xs font-bold text-gray-600 uppercase [&::-webkit-details-marker]:hidden">
              Daftar isi
              <CaretDown size={16} aria-hidden className="transition-transform group-open:rotate-180" />
            </summary>
            <div className="mt-4">
              <Toc sections={sections} />
            </div>
          </details>
          <div className="hidden flex-col gap-4 laptop:flex">
            <p className="font-mono text-xs font-bold text-gray-600 uppercase">Daftar isi</p>
            <Toc sections={sections} />
          </div>
        </aside>

        <div className="flex min-w-0 max-w-3xl flex-col">
          {sections.map((section, i) => (
            <section
              key={section.id}
              id={section.id}
              aria-labelledby={`${section.id}-judul`}
              className="flex scroll-mt-28 flex-col gap-4 border-t border-disabled-surface py-8 first:border-t-0 first:pt-0"
            >
              <h2 id={`${section.id}-judul`} className="flex items-baseline gap-3 text-xl font-bold">
                <span className="font-mono text-sm text-primary">{String(i + 1).padStart(2, '0')}</span>
                {section.title}
              </h2>
              {section.content}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
