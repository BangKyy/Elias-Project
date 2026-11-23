'use client';

import { useMemo, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { statusLabels, useArchive, type ArchiveStatus } from '@/lib/archive';
import { noFilters, queryArchive, type ArchiveFilters as Filters, type ArchiveSort } from '@/lib/archiveQuery';
import { sampleArchive } from '@/lib/insights/mockArchive';
import AccountPrompt from './AccountPrompt';
import ArchiveFilters from './ArchiveFilters';
import ArchiveItem from './ArchiveItem';
import Pagination from './Pagination';
import { StatusIcon } from './StatusControl';
import MasonryGrid from '../beranda/MasonryGrid';
import MotionText from '../motion/MotionText';

const noop = () => () => {};

/** Device storage only exists after hydration; until then the archive is unknown, not empty. */
function useHydrated() {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}

export default function ArchiveView({ showSampleLoader }: { showSampleLoader: boolean }) {
  const hydrated = useHydrated();
  const archive = useArchive();
  const { items, canSetPriority } = archive;
  const [filters, setFilters] = useState<Filters>(noFilters);
  const [sort, setSort] = useState<ArchiveSort>('newest');
  const [page, setPage] = useState(1);
  const [promptOpen, setPromptOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const categories = useMemo(() => [...new Set(items.map((item) => item.category))].sort((a, b) => a.localeCompare(b, 'id')), [items]);
  const result = queryArchive(items, filters, sort, page);
  const counts = (Object.keys(statusLabels) as ArchiveStatus[]).map(
    (status) => [status, items.filter((item) => item.status === status).length] as const,
  );
  const executed = counts.find(([status]) => status === 'executed')?.[1] ?? 0;

  function changeFilters(next: Filters) {
    setFilters(next);
    setPage(1);
  }

  function goToPage(next: number) {
    setPage(next);
    listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const empty = hydrated && items.length === 0;

  return (
    <div data-animate="page-item" className="flex flex-col gap-8">
      <section className="flex flex-col gap-[18px]">
        {/* Opens with the execution count, Elias's primary metric (Ch. 5) */}
        <h1 className="text-display-lg font-bold md:text-display-2xl">
          {hydrated && !empty && <span className="mr-3 inline-block bg-primary px-3 text-txt-white md:mr-[18px]">{executed}</span>}
          <MotionText
            as="span"
            effect="scramble"
            delay={0.2}
            text={!hydrated ? ' ' : empty ? 'Belum ada tren tersimpan.' : `dari ${items.length} Tren Sudah Dieksekusi`}
          />
        </h1>
        {empty ? (
          <p className="text-md text-neutral-600">Kembali ke Beranda dan simpan <strong>satu yang layak ditindaklanjuti</strong>.</p>
        ) : (
          hydrated && (
            <ul aria-label="Jumlah per status" className="flex flex-wrap gap-2.5">
              {counts.map(([status, count]) => (
                <li
                  key={status}
                  className="flex items-center gap-2.5 border border-primary px-3 py-1.5 font-mono text-xs font-bold text-primary uppercase"
                >
                  <StatusIcon status={status} />
                  {count} {statusLabels[status]}
                </li>
              ))}
            </ul>
          )
        )}
        {!canSetPriority && hydrated && (
          <p className="text-sm text-gray-600">
            Arsip ini tersimpan <strong>di perangkat ini saja</strong>. Prioritas tersedia untuk pemilik akun.{' '}
            <Link href="/signup" className="font-semibold text-txt-black underline underline-offset-2">
              Buat akun
            </Link>
          </p>
        )}
      </section>

      {empty && showSampleLoader && (
        <button
          type="button"
          onClick={() => archive.seed(sampleArchive())}
          className="w-fit rounded-md border border-disabled-surface px-4 py-3 text-sm font-semibold transition-colors hover:border-txt-black"
        >
          Muat data contoh (prototipe)
        </button>
      )}

      {/* Shown even on an empty archive so the controls are learnable before the first save */}
      {hydrated && (
        <ArchiveFilters
          filters={filters}
          sort={sort}
          categories={categories}
          showPriority={canSetPriority}
          onFilters={changeFilters}
          onSort={(next) => {
            setSort(next);
            setPage(1);
          }}
        />
      )}

      {hydrated && items.length > 0 && (
        <div ref={listRef} className="flex scroll-mt-28 flex-col gap-8">
          <p aria-live="polite" className="sr-only">
            {result.total > 0 && (
              <>
                Menampilkan{' '}
                <strong>
                  {result.first}–{result.last}
                </strong>{' '}
                dari <strong>{result.total}</strong> tren
              </>
            )}
          </p>

          {result.total === 0 ? (
            <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-disabled-surface p-6 md:p-10">
              <p className="text-xl font-semibold">Tidak ada tren yang cocok dengan filter ini.</p>
              <p className="text-md text-neutral-600"><strong>Hapus satu filter</strong> atau <strong>ubah kata kunci</strong> untuk memperluas hasil.</p>
              <button
                type="button"
                onClick={() => changeFilters(noFilters)}
                className="rounded-md border border-disabled-surface px-4 py-2.5 text-sm font-semibold transition-colors hover:border-txt-black"
              >
                Hapus semua filter
              </button>
            </div>
          ) : (
            <MasonryGrid>
              {result.items.map((item) => (
                <ArchiveItem
                  key={item.insightId}
                  item={item}
                  canSetPriority={canSetPriority}
                  onStatus={(status) => archive.setStatus(item.insightId, status)}
                  onPriority={(priority) => archive.setPriority(item.insightId, priority)}
                  onNote={(notes) => archive.setNotes(item.insightId, notes)}
                  onRemove={() => archive.remove(item.insightId)}
                  onPriorityLocked={() => setPromptOpen(true)}
                />
              ))}
            </MasonryGrid>
          )}

          <Pagination page={result.page} pageCount={result.pageCount} onPage={goToPage} />
        </div>
      )}

      <AccountPrompt open={promptOpen} onClose={() => setPromptOpen(false)} />
    </div>
  );
}
