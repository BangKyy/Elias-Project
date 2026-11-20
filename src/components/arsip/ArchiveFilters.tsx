'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { CalendarDots, FunnelSimple, MagnifyingGlass, X } from '@phosphor-icons/react';
import { CompactLabel, compactBox, DropdownField, type SelectOption } from '@/components/auth/fields';
import { priorityLabels, statusLabels, type ArchivePriority, type ArchiveStatus } from '@/lib/archive';
import { activeFilterCount, noFilters, sortLabels, type ArchiveFilters as Filters, type ArchiveSort } from '@/lib/archiveQuery';
import { sources, type SourceId } from '@/lib/insights/types';
import RangeCalendar from './RangeCalendar';

// Only sources Elias can query (AR-1). TikTok and Instagram stay listed but
// disabled and labelled, so nobody reads their absence as an oversight
const sourceOptions = (Object.keys(sources) as SourceId[]).filter((id) => sources[id].tier === 1);
const unavailableSources = ['TikTok', 'Instagram'];

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
}) {
  return (
    <div className="min-w-0">
      <DropdownField
        compact
        label={label}
        name={label}
        value={value}
        onChange={onChange}
        options={options}
        hint=""
        sheetTitle={`Pilih ${label}`}
      />
    </div>
  );
}

/** "2026-11-20" → "20/11/26" */
const shortDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(2, 4)}`;

/**
 * The design's one "Rentang waktu" field: shows the saved-on range and opens
 * the range calendar (Calendar-open) underneath it.
 */
function DateRangeField({ from, to, onChange }: { from: string; to: string; onChange: (from: string, to: string) => void }) {
  const triggerId = useId();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const empty = !from && !to;

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative min-w-0 ${open ? 'z-20' : ''}`}>
      <CompactLabel htmlFor={triggerId}>Rentang waktu</CompactLabel>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
        className={`${compactBox} flex w-full items-center justify-between gap-3 text-left outline-none ${
          open ? 'border-primary' : 'border-disabled-surface focus-visible:border-primary'
        }`}
      >
        <span className={`truncate ${empty ? 'text-disabled-content' : 'text-txt-black'}`}>
          {empty ? 'dd/mm/yy' : `${from ? shortDate(from) : '…'} – ${to ? shortDate(to) : '…'}`}
        </span>
        <CalendarDots size={16} aria-hidden className="shrink-0 text-disabled-content" />
      </button>

      {open && (
        <div
          id={panelId}
          role="group"
          aria-label="Rentang tanggal disimpan"
          className="absolute top-full right-0 mt-2.5 w-[318px] max-w-[calc(100vw-2rem)]"
        >
          <RangeCalendar
            from={from}
            to={to}
            onChange={(nextFrom, nextTo, done) => {
              onChange(nextFrom, nextTo);
              // A finished range closes the panel, back on the field
              if (done) {
                setOpen(false);
                triggerRef.current?.focus();
              }
            }}
          />
        </div>
      )}
    </div>
  );
}

type ArchiveFiltersProps = {
  filters: Filters;
  sort: ArchiveSort;
  categories: string[];
  /** Guests can't use the priority filter or sort (AR-8) */
  showPriority: boolean;
  onFilters: (filters: Filters) => void;
  onSort: (sort: ArchiveSort) => void;
};

export default function ArchiveFilters({ filters, sort, categories, showPriority, onFilters, onSort }: ArchiveFiltersProps) {
  const searchId = useId();
  const panelId = useId();
  const [panelOpen, setPanelOpen] = useState(false);
  const active = activeFilterCount(filters);
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => onFilters({ ...filters, [key]: value });
  const sorts = (Object.keys(sortLabels) as ArchiveSort[]).filter((value) => showPriority || value !== 'priority');

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-2.5">
        <div className="min-w-0">
          <CompactLabel htmlFor={searchId}>Cari</CompactLabel>
          <div className={`${compactBox} flex items-center gap-3 border-disabled-surface transition-colors focus-within:border-primary`}>
            <MagnifyingGlass size={16} aria-hidden className="shrink-0 text-disabled-content" />
            <input
              id={searchId}
              type="search"
              value={filters.search}
              onChange={(e) => set('search', e.target.value)}
              placeholder="Masukkan judul, tag, atau catatan"
              className="min-w-0 flex-1 bg-transparent text-txt-black outline-none placeholder:text-disabled-content"
            />
          </div>
        </div>
        <div className="flex items-end gap-2.5">
          <div className="min-w-0 flex-1">
            <Select
              label="Urutkan"
              value={sort}
              onChange={(value) => onSort(value as ArchiveSort)}
              options={sorts.map((value) => ({ value, label: sortLabels[value] }))}
            />
          </div>
          {/* Phones only; tablet and up keep the filters open */}
          <button
            type="button"
            aria-expanded={panelOpen}
            aria-controls={panelId}
            onClick={() => setPanelOpen((open) => !open)}
            className={`${compactBox} flex shrink-0 items-center gap-3 border-disabled-surface text-disabled-content transition-colors hover:border-txt-black md:hidden`}
          >
            <FunnelSimple size={16} aria-hidden />
            Filters
            {active > 0 && <span className="rounded-full bg-primary px-1.5 text-xs text-bg-white">{active}</span>}
          </button>
        </div>
      </div>

      <div
        id={panelId}
        className={`${panelOpen ? 'grid' : 'hidden'} grid-cols-2 gap-2.5 md:grid md:auto-cols-fr md:grid-flow-col md:grid-cols-none`}
      >
        <Select
          label="Status"
          value={filters.status}
          onChange={(value) => set('status', value as ArchiveStatus | '')}
          options={[
            { value: '', label: 'Semua Status' },
            ...(Object.keys(statusLabels) as ArchiveStatus[]).map((value) => ({ value, label: statusLabels[value] })),
          ]}
        />
        <Select
          label="Kategori"
          value={filters.category}
          onChange={(value) => set('category', value)}
          options={[{ value: '', label: 'Semua Kategori' }, ...categories.map((category) => ({ value: category, label: category }))]}
        />
        <Select
          label="Sumber"
          value={filters.source}
          onChange={(value) => set('source', value as SourceId | '')}
          options={[
            { value: '', label: 'Semua Sumber' },
            ...sourceOptions.map((id) => ({ value: id, label: sources[id].label })),
            ...unavailableSources.map((label) => ({ value: label, label, description: 'Belum tersedia', disabled: true })),
          ]}
        />
        {showPriority && (
          <Select
            label="Prioritas"
            value={filters.priority}
            onChange={(value) => set('priority', value as ArchivePriority | 'none' | '')}
            options={[
              { value: '', label: 'Semua Prioritas' },
              ...(Object.keys(priorityLabels) as ArchivePriority[]).map((value) => ({ value, label: priorityLabels[value] })),
              { value: 'none', label: 'Tanpa prioritas' },
            ]}
          />
        )}
        {/* Full width on phones, where it ends the two-column grid on its own */}
        <div className="col-span-2 min-w-0 md:col-span-1">
          <DateRangeField from={filters.from} to={filters.to} onChange={(from, to) => onFilters({ ...filters, from, to })} />
        </div>
      </div>

      {active > 0 && (
        <button
          type="button"
          onClick={() => onFilters({ ...noFilters, search: filters.search })}
          className="flex w-fit items-center gap-1 text-sm font-medium text-gray-600 transition-colors hover:text-txt-black"
        >
          <X size={16} aria-hidden />
          Hapus {active} filter
        </button>
      )}
    </div>
  );
}
