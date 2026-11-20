'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { CaretDown, CaretUp } from '@phosphor-icons/react';

export type LabelOption<T extends string> = {
  value: T;
  label: string;
  /** Text colour of the label; its icon and the selected bar follow it */
  tone: string;
  icon?: ReactNode;
  /** Background of the "Actived" variant */
  surface?: string;
  /** Trigger border and background while the list is open on this value */
  openTrigger?: string;
  /** The "nothing chosen yet" value (Belum dieksekusi, Tanpa prioritas): its row stays plain when selected */
  unset?: boolean;
};

/**
 * The design's Status Labels/Eksekusi and Status Labels/Priority: optional
 * icon, then the name in bold mono capitals, in the status's own colour.
 * `active` is the "Actived" variant: on its `surface`, led by a bar in that
 * colour (3px on its own, 4px as a dropdown row). `padding` is the
 * component's own 12×6px; a dropdown row uses 12px all round, and the
 * trigger, which pads it already, none.
 */
export function StatusLabel({
  label,
  tone,
  icon,
  surface = '',
  bar = 'w-[3px]',
  active = false,
  padding = 'px-3 py-1.5',
  className = '',
}: {
  label: string;
  tone: string;
  icon?: ReactNode;
  surface?: string;
  bar?: string;
  active?: boolean;
  padding?: string;
  className?: string;
}) {
  return (
    <span className={`flex min-w-0 items-stretch ${tone} ${active ? surface : ''} ${className}`}>
      {active && <span aria-hidden className={`shrink-0 bg-current ${bar}`} />}
      <span className={`flex min-w-0 items-center gap-2.5 font-mono text-xs font-bold uppercase ${padding}`}>
        {icon}
        <span className="truncate">{label}</span>
      </span>
    </span>
  );
}

/**
 * The Arsip card's Dropdown/Eksekusi and Dropdown/Prioritas: a bordered
 * trigger showing the current label, opening the options in a list beneath
 * it. Once a value is chosen the trigger takes its colours, open or closed,
 * and that value's row in the list is its "Actived" label, full width.
 * `onLocked`, when given, replaces opening the list (guests and priority, AR-3).
 */
export default function LabelSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  onLocked,
}: {
  /** Accessible name, e.g. "Status: <trend>" */
  label: string;
  value: T;
  options: LabelOption<T>[];
  onChange: (value: T) => void;
  onLocked?: () => void;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  function close(refocus = true) {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLButtonElement>('[aria-selected="true"] button')?.focus();
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open]);

  function onListKey(e: KeyboardEvent<HTMLUListElement>) {
    if (e.key === 'Escape' || e.key === 'Tab') {
      if (e.key === 'Escape') e.preventDefault();
      return close(e.key === 'Escape');
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const buttons = Array.from(listRef.current?.querySelectorAll('button') ?? []);
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = (at + (e.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next]?.focus();
  }

  const Caret = open ? CaretUp : CaretDown;

  return (
    // Raised while open so the list covers the card content below it
    <div ref={rootRef} className={`relative min-w-0 flex-1 ${open ? 'z-20' : ''}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => (onLocked ? onLocked() : setOpen(!open))}
        onKeyDown={(e) => {
          if (!onLocked && !open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={`flex w-full items-center justify-between gap-3 rounded-md border px-4 py-3 transition-colors outline-none focus-visible:border-primary ${
          // A chosen value keeps the active look once the list closes; only
          // the unset one goes back to the plain box with its hover
          (open || !selected.unset) && selected.openTrigger
            ? selected.openTrigger
            : 'border-disabled-surface bg-bg-white hover:border-txt-black'
        }`}
      >
        <StatusLabel {...selected} padding="" />
        <Caret size={18} weight="light" aria-hidden className="shrink-0 text-disabled-content" />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={label}
          onKeyDown={onListKey}
          className="absolute inset-x-0 top-full mt-2.5 flex flex-col overflow-hidden rounded-md border border-disabled-surface bg-bg-white"
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            const highlighted = isSelected && !option.unset;
            return (
              <li key={option.value} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    close();
                  }}
                  className={`flex w-full text-left transition-colors outline-none ${
                    // The selected row keeps its tint, so focus shows as an inset ring there
                    highlighted ? 'focus-visible:ring-2 focus-visible:ring-txt-black focus-visible:ring-inset' : 'hover:bg-neutral-100 focus-visible:bg-neutral-100'
                  }`}
                >
                  <StatusLabel {...option} active={highlighted} bar="w-1" padding="p-3" className="w-full" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
