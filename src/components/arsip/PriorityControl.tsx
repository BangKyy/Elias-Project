'use client';

import { priorityLabels, type ArchivePriority } from '@/lib/archive';
import LabelSelect from './LabelSelect';

// Text colour, the "Actived" (selected) background per Status Labels/Priority,
// and the Dropdown/Prioritas trigger while open on that priority
const styles: Record<ArchivePriority | 'none', { tone: string; surface: string; openTrigger: string }> = {
  none: { tone: 'text-disabled-content', surface: 'bg-disabled-surface', openTrigger: 'border-disabled-surface' },
  low: { tone: 'text-success-content', surface: 'bg-green-50', openTrigger: 'border-success-content bg-green-50' },
  medium: { tone: 'text-warning-default', surface: 'bg-yellow-50', openTrigger: 'border-warning-default bg-yellow-50' },
  high: { tone: 'text-primary', surface: 'bg-primary-surface', openTrigger: 'border-primary bg-primary-surface' },
};

// Lowest first, as the design lists them
const options = (['none', 'low', 'medium', 'high'] as const).map((value) => ({
  value,
  label: value === 'none' ? 'Tanpa prioritas' : priorityLabels[value],
  ...styles[value],
  unset: value === 'none',
}));

/**
 * Visible to everyone; editable only by account holders (AR-3). Guests get
 * `onLocked`, which opens the signup prompt instead of an error.
 */
export default function PriorityControl({
  priority,
  itemTitle,
  editable,
  onChange,
  onLocked,
}: {
  priority: ArchivePriority | null;
  itemTitle: string;
  editable: boolean;
  onChange: (priority: ArchivePriority | null) => void;
  onLocked: () => void;
}) {
  return (
    <LabelSelect
      label={`Prioritas: ${itemTitle}`}
      value={priority ?? 'none'}
      options={options}
      onChange={(value) => onChange(value === 'none' ? null : value)}
      onLocked={editable ? undefined : onLocked}
    />
  );
}
