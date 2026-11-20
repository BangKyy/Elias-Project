'use client';

import { CheckCircle, CircleDashed, Clock, type Icon } from '@phosphor-icons/react';
import { statusLabels, type ArchiveStatus } from '@/lib/archive';
import LabelSelect from './LabelSelect';

// Each status has its own icon shape, so the label reads the same under
// colour-blind simulation (AR-2)
// `surface` backs the label in its "Actived" (selected) variant; `openTrigger`
// is the Dropdown/Eksekusi trigger while open on that status
export const statusStyles: Record<ArchiveStatus, { icon: Icon; tone: string; surface: string; openTrigger: string }> = {
  not_started: { icon: CircleDashed, tone: 'text-disabled-content', surface: 'bg-disabled-surface', openTrigger: 'border-disabled-surface' },
  in_progress: { icon: Clock, tone: 'text-warning-default', surface: 'bg-warning-tint', openTrigger: 'border-warning-main bg-yellow-50' },
  executed: { icon: CheckCircle, tone: 'text-success-content', surface: 'bg-success-surface', openTrigger: 'border-success bg-green-50' },
};

export function StatusIcon({ status, size = 16 }: { status: ArchiveStatus; size?: number }) {
  const IconComponent = statusStyles[status].icon;
  return <IconComponent size={size} aria-hidden className="shrink-0" />;
}

const options = (Object.keys(statusLabels) as ArchiveStatus[]).map((status) => ({
  value: status,
  label: statusLabels[status],
  tone: statusStyles[status].tone,
  surface: statusStyles[status].surface,
  openTrigger: statusStyles[status].openTrigger,
  unset: status === 'not_started',
  icon: <StatusIcon status={status} />,
}));

/** Changes the status in place, without opening a detail view (AR-2). */
export default function StatusControl({
  status,
  itemTitle,
  onChange,
}: {
  status: ArchiveStatus;
  itemTitle: string;
  onChange: (status: ArchiveStatus) => void;
}) {
  return <LabelSelect label={`Status: ${itemTitle}`} value={status} options={options} onChange={onChange} />;
}
