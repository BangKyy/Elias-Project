'use client';

import { useState } from 'react';
import { CaretDown, CaretLeft, CaretRight } from '@phosphor-icons/react';

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
// Weeks start on Sunday, as in the design
const weekdays = ['Mg', 'Sn', 'Sl', 'Rb', 'Km', 'Jm', 'Sb'];
// How many years back the year picker reaches
const YEARS_BACK = 5;

const pad = (n: number) => String(n).padStart(2, '0');
/** Calendar date as "YYYY-MM-DD", the format the archive filters store */
const iso = (year: number, month: number, day: number) => `${year}-${pad(month + 1)}-${pad(day)}`;

function today() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth(), iso: iso(now.getFullYear(), now.getMonth(), now.getDate()) };
}

type Cell = { day: number; date: string; inMonth: boolean };

/** The month's days, padded with the neighbouring months' days to whole weeks. */
function monthCells(year: number, month: number): Cell[] {
  const offset = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const previousDays = new Date(year, month, 0).getDate();
  const cells: Cell[] = [];
  for (let i = offset; i > 0; i--) {
    const day = previousDays - i + 1;
    cells.push({ day, date: iso(month === 0 ? year - 1 : year, (month + 11) % 12, day), inMonth: false });
  }
  for (let day = 1; day <= days; day++) cells.push({ day, date: iso(year, month, day), inMonth: true });
  for (let day = 1; cells.length % 7; day++) cells.push({ day, date: iso(month === 11 ? year + 1 : year, (month + 1) % 12, day), inMonth: false });
  return cells;
}

const iconButton = 'flex shrink-0 items-center justify-center rounded-full p-2 text-txt-black transition-colors hover:bg-neutral-100';
const selectBox =
  'relative flex min-w-0 flex-1 items-center rounded-lg border border-neutral-300 bg-white focus-within:border-primary';

/**
 * The design's "Calendar-open" panel for Arsip's Rentang waktu filter: month
 * and year pickers between arrows, then the month as a grid. The first click
 * sets the start, the second the end (swapped if it's earlier); a third
 * starts over. Start and end are red, the days between grey.
 */
export default function RangeCalendar({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  /** `done` once both ends are picked; both empty when cleared */
  onChange: (from: string, to: string, done: boolean) => void;
}) {
  const now = today();
  const opened = from || to;
  const [view, setView] = useState(() =>
    opened ? { year: Number(opened.slice(0, 4)), month: Number(opened.slice(5, 7)) - 1 } : { year: now.year, month: now.month },
  );
  const years = Array.from({ length: YEARS_BACK + 1 }, (_, i) => now.year - YEARS_BACK + i);
  if (!years.includes(view.year)) years.unshift(view.year);
  const cells = monthCells(view.year, view.month);

  function shift(by: number) {
    const index = view.year * 12 + view.month + by;
    setView({ year: Math.floor(index / 12), month: index % 12 });
  }

  function pick(date: string) {
    if (!from || to) return onChange(date, '', false);
    if (date < from) return onChange(date, from, true);
    onChange(from, date, true);
  }

  return (
    <div className="flex flex-col items-center rounded-md border border-neutral-300 bg-white p-4">
      <div className="flex w-full items-center gap-4">
        <button type="button" onClick={() => shift(-1)} aria-label="Bulan sebelumnya" className={iconButton}>
          <CaretLeft size={20} weight="bold" aria-hidden />
        </button>
        <div className="flex min-w-0 flex-1 gap-2">
          <label className={selectBox}>
            <span className="sr-only">Bulan</span>
            <select
              value={view.month}
              onChange={(e) => setView({ ...view, month: Number(e.target.value) })}
              className="w-full cursor-pointer appearance-none bg-transparent py-1.5 pr-7 pl-1.5 text-sm text-txt-black outline-none"
            >
              {months.map((name, i) => (
                <option key={name} value={i}>
                  {name}
                </option>
              ))}
            </select>
            <CaretDown size={16} aria-hidden className="pointer-events-none absolute right-1.5" />
          </label>
          <label className={selectBox}>
            <span className="sr-only">Tahun</span>
            <select
              value={view.year}
              onChange={(e) => setView({ ...view, year: Number(e.target.value) })}
              className="w-full cursor-pointer appearance-none bg-transparent py-1.5 pr-7 pl-1.5 text-sm text-txt-black outline-none"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <CaretDown size={16} aria-hidden className="pointer-events-none absolute right-1.5" />
          </label>
        </div>
        <button type="button" onClick={() => shift(1)} aria-label="Bulan berikutnya" className={iconButton}>
          <CaretRight size={20} weight="bold" aria-hidden />
        </button>
      </div>

      <table className="mt-4 border-separate border-spacing-px" aria-label={`${monthNames[view.month]} ${view.year}`}>
        <thead>
          <tr>
            {weekdays.map((day) => (
              <th key={day} scope="col" className="text-center text-xs font-normal text-neutral-500">
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: cells.length / 7 }, (_, week) => (
            <tr key={week}>
              {cells
                .slice(week * 7, week * 7 + 7)
                .map(({ day, date, inMonth }) => {
                  const end = date === from || date === to;
                  const between = Boolean(from && to) && date > from && date < to;
                  return (
                    <td key={date} className="p-0">
                      {inMonth ? (
                        <button
                          type="button"
                          onClick={() => pick(date)}
                          aria-pressed={end || between}
                          aria-label={`${day} ${monthNames[view.month]} ${view.year}`}
                          aria-current={date === now.iso ? 'date' : undefined}
                          className={`flex size-10 items-center justify-center rounded-lg text-md transition-colors outline-none focus-visible:ring-2 focus-visible:ring-txt-black ${
                            end
                              ? 'bg-primary text-neutral-100'
                              : between
                                ? 'bg-neutral-100 text-txt-black hover:bg-neutral-200'
                                : `text-txt-black hover:bg-neutral-100 ${date === now.iso ? 'font-semibold' : ''}`
                          }`}
                        >
                          {day}
                        </button>
                      ) : (
                        // Neighbouring months' days, shown but not pickable
                        <span aria-hidden className="flex size-10 items-center justify-center text-md text-gray-400">
                          {day}
                        </span>
                      )}
                    </td>
                  );
                })}
            </tr>
          ))}
        </tbody>
      </table>

      {(from || to) && (
        <button
          type="button"
          onClick={() => onChange('', '', false)}
          className="mt-2 self-end text-xs font-medium text-gray-600 underline underline-offset-2 hover:text-txt-black"
        >
          Hapus tanggal
        </button>
      )}
    </div>
  );
}
