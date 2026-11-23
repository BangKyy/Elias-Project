'use client';

import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { CircleNotch } from '@phosphor-icons/react';
import { missingBrandMessage } from '@/lib/brandProfiles';
import { createClient } from '@/lib/supabase/client';
import { errorMessage } from '@/lib/supabase/errors';
import { FormMessage, type FormStatus } from '../auth/fields';

const primaryButton =
  'flex w-fit items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-md font-semibold text-bg-white transition-[background-color,filter] hover:enabled:brightness-95 disabled:cursor-not-allowed disabled:bg-primary-subtle';
const secondaryButton =
  'flex w-fit items-center justify-center gap-2 rounded-lg border border-disabled-surface px-5 py-3 text-md font-semibold text-txt-black transition-colors hover:enabled:border-txt-black disabled:cursor-not-allowed disabled:opacity-50';

/**
 * One block of /profil: what it is on the left (laptop), its form on the
 * right. Each block saves on its own, so a mistake in one never blocks another.
 */
export default function ProfileSection({
  id,
  title,
  description,
  tone = 'default',
  children,
}: {
  id: string;
  title: string;
  description: ReactNode;
  tone?: 'default' | 'danger';
  children: ReactNode;
}) {
  const headingId = useId();
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className="grid scroll-mt-28 gap-5 border-t border-disabled-surface py-8 md:py-10 laptop:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] laptop:gap-12"
    >
      <div className="flex flex-col gap-1.5">
        <h2 id={headingId} className={`text-xl font-bold ${tone === 'danger' ? 'text-primary' : 'text-txt-black'}`}>
          {title}
        </h2>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
      <div className="flex min-w-0 flex-col gap-4">{children}</div>
    </section>
  );
}

/**
 * Form body for a section: fields, then its message and Simpan / Batalkan.
 * Simpan only wakes up once something changed; a success note shows until the
 * next edit.
 */
export function SectionForm({
  dirty,
  canSave,
  saving,
  status,
  onSubmit,
  onReset,
  submitLabel = 'Simpan Perubahan',
  savingLabel = 'Menyimpan...',
  children,
}: {
  dirty: boolean;
  /** The values are valid; Simpan also needs `dirty` */
  canSave: boolean;
  saving: boolean;
  status: FormStatus;
  onSubmit: () => void;
  onReset?: () => void;
  submitLabel?: string;
  savingLabel?: string;
  children: ReactNode;
}) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (dirty && canSave && !saving) onSubmit();
  }
  // A success note belongs to the saved values; editing again retires it
  const shown = status?.tone === 'success' && dirty ? null : status;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {children}
      <FormMessage status={shown} />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={!dirty || !canSave || saving} aria-busy={saving} className={primaryButton}>
          {saving && <CircleNotch size={18} weight="bold" aria-hidden className="motion-safe:animate-spin" />}
          {saving ? savingLabel : submitLabel}
        </button>
        {onReset && dirty && !saving && (
          <button type="button" onClick={onReset} className={secondaryButton}>
            Batalkan
          </button>
        )}
      </div>
    </form>
  );
}

/** The row a block saves into: the personal layer (profiles) or the brand layer (brand_profiles). */
export type ProfileTarget = { table: 'profiles' | 'brand_profiles'; id: string | null };

/**
 * Edits a set of columns of one row against a saved baseline. `values` is what
 * the form shows; `saved` moves forward only when the database accepted it.
 */
export function useProfileForm<T extends Record<string, unknown>>(target: ProfileTarget, initial: T, toRow: (values: T) => object) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<FormStatus>(null);
  const dirty = JSON.stringify(values) !== JSON.stringify(saved);

  const set = <K extends keyof T>(key: K, value: T[K]) => setValues((current) => ({ ...current, [key]: value }));

  async function save() {
    if (!target.id) {
      setStatus({ tone: 'error', text: missingBrandMessage });
      return;
    }
    setSaving(true);
    setStatus(null);
    const { error } = await createClient().from(target.table).update(toRow(values)).eq('id', target.id).select('id').single();
    setSaving(false);
    if (error) {
      setStatus({ tone: 'error', text: errorMessage(error) });
      return;
    }
    setSaved(values);
    setStatus({ tone: 'success', text: 'Perubahan tersimpan.' });
    // Beranda and the header read the profile on the server
    router.refresh();
  }

  return { values, set, dirty, saving, status, setStatus, save, reset: () => setValues(saved) };
}
