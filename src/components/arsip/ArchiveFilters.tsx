'use client';

import { useId, useState } from 'react';
import { FunnelSimple, MagnifyingGlass, X } from '@phosphor-icons/react';
import { DropdownField, type SelectOption } from '@/components/auth/fields';
import { priorityLabels, statusLabels, type ArchivePriority, type ArchiveStatus } from '@/lib/archive';
import { activeFilterCount, noFilters, sortLabels, type ArchiveFilters as Filters, type ArchiveSort } from '@/lib/archiveQuery';
import { sources, type SourceId } from '@/lib/insights/types';

// Only sources Elias can query (AR-1). TikTok and Instagram stay listed but
// disabled and labelled, so nobody reads their absence as an oversight
const sourceOptions = (Object.keys(sources) as SourceId[]).filter((id) => sources[id].tier === 1);
const unavailableSources = ['TikTok', 'Instagram'];

// Same box as the shared DropdownField trigger, so the row lines up
const control =
  'h-[62px] w-full rounded-xl border border-disabled-surface bg-white px-4 text-lg text-txt-black outline-none transition-colors focus:border-primary';
// Same as the dropdown's floating label, which sits in the same 22px slot
const fieldLabel = 'pb-1 text-xs font-medium text-disabled-content';

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

function DateInput({ label, value, onChange, min, max }: { label: string; value: string; onChange: (value: string) => void; min?: string; max?: string }) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col">
      <label htmlFor={id} className={fieldLabel}>
        {label}
      </label>
      <input
        id={id}
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className={control}
      />
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
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start">
        <div className="flex min-w-0 flex-1 flex-col">
          <label htmlFor={searchId} className={fieldLabel}>
            Cari
          </label>
          <div className="relative">
            <MagnifyingGlass size={18} weight="light" aria-hidden className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-disabled-content" />
            <input
              id={searchId}
              type="search"
              value={filters.search}
              onChange={(e) => set('search', e.target.value)}
              placeholder="Judul, tag, atau catatan"
              className={`${control} pl-11 placeholder:text-disabled-content`}
            />
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="flex-1 md:w-60 md:flex-none">
            <Select
              label="Urutkan"
              value={sort}
              onChange={(value) => onSort(value as ArchiveSort)}
              options={sorts.map((value) => ({ value, label: sortLabels[value] }))}
            />
          </div>
          <button
            type="button"
            aria-expanded={panelOpen}
            aria-controls={panelId}
            onClick={() => setPanelOpen((open) => !open)}
            className="mt-[22px] flex h-[62px] items-center gap-2 rounded-xl border border-disabled-surface px-4 text-sm font-semibold transition-colors hover:border-txt-black laptop:hidden"
          >
            <FunnelSimple size={18} aria-hidden />
            Filter{active > 0 && <span className="rounded-full bg-primary px-1.5 text-xs text-bg-white">{active}</span>}
          </button>
        </div>
      </div>

      {/* Always open on laptop; a toggle below that keeps the list in view */}
      <div
        id={panelId}
        className={`${panelOpen ? 'grid' : 'hidden'} grid-cols-2 gap-3 md:grid-cols-3 laptop:grid laptop:grid-cols-[repeat(auto-fit,minmax(190px,1fr))]`}
      >
        <Select
          label="Status"
          value={filters.status}
          onChange={(value) => set('status', value as ArchiveStatus | '')}
          options={[
            { value: '', label: 'Semua status' },
            ...(Object.keys(statusLabels) as ArchiveStatus[]).map((value) => ({ value, label: statusLabels[value] })),
          ]}
        />
        <Select
          label="Kategori"
          value={filters.category}
          onChange={(value) => set('category', value)}
          options={[{ value: '', label: 'Semua kategori' }, ...categories.map((category) => ({ value: category, label: category }))]}
        />
        <Select
          label="Sumber"
          value={filters.source}
          onChange={(value) => set('source', value as SourceId | '')}
          options={[
            { value: '', label: 'Semua sumber' },
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
              { value: '', label: 'Semua prioritas' },
              ...(Object.keys(priorityLabels) as ArchivePriority[]).map((value) => ({ value, label: priorityLabels[value] })),
              { value: 'none', label: 'Tanpa prioritas' },
            ]}
          />
        )}
        <DateInput label="Disimpan dari" value={filters.from} max={filters.to || undefined} onChange={(value) => set('from', value)} />
        <DateInput label="Sampai" value={filters.to} min={filters.from || undefined} onChange={(value) => set('to', value)} />
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
