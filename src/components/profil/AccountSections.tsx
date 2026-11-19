'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CircleNotch, Trash } from '@phosphor-icons/react';
import { forgetAccountArchive } from '@/lib/archive';
import { forgetCachedInsights } from '@/lib/elias/client';
import type { AccountInfo } from '@/lib/profile';
import { createClient } from '@/lib/supabase/client';
import { errorMessage } from '@/lib/supabase/errors';
import {
  EmailField,
  FormMessage,
  meetsPasswordRules,
  PasswordField,
  PasswordRequirements,
  type FormStatus,
} from '../auth/fields';
import ProfileSection, { SectionForm } from './ProfileSection';

/** Email change: Supabase sends a confirmation link; the old address works until it is opened. */
export function EmailSection({ account }: { account: AccountInfo }) {
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(account.pendingEmail);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<FormStatus>(null);
  const next = email.trim().toLowerCase();
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next) && next !== account.email.toLowerCase();

  async function submit() {
    setSaving(true);
    setStatus(null);
    const { error } = await createClient().auth.updateUser(
      { email: next },
      { emailRedirectTo: `${window.location.origin}/auth/callback?next=/profil` },
    );
    setSaving(false);
    if (error) {
      setStatus({ tone: 'error', text: errorMessage(error) });
      return;
    }
    setPending(next);
    setEmail('');
    setStatus({
      tone: 'success',
      text: `Tautan konfirmasi dikirim ke ${next}. Email lama tetap dipakai sampai tautan itu dibuka.`,
    });
  }

  return (
    <ProfileSection id="email" title="Email" description="Alamat untuk masuk dan untuk menerima email pagi dari Elias.">
      <dl className="flex flex-col gap-1 text-sm">
        <dt className="text-xs font-medium text-disabled-content">Email saat ini</dt>
        <dd className="text-md font-semibold break-all text-txt-black">{account.email}</dd>
        {pending && (
          <dd className="text-sm text-gray-600">
            Menunggu konfirmasi untuk <strong className="break-all">{pending}</strong>.
          </dd>
        )}
      </dl>
      <SectionForm
        dirty={email.trim() !== ''}
        canSave={valid}
        saving={saving}
        status={status}
        onSubmit={submit}
        submitLabel="Ganti Email"
        savingLabel="Mengirim..."
      >
        <EmailField
          rounded="xl"
          value={email}
          onChange={setEmail}
          hint="Email baru. Kami kirim tautan konfirmasi ke alamat ini."
        />
      </SectionForm>
    </ProfileSection>
  );
}

/**
 * Change password. The current one is checked by signing in with it first,
 * so an unattended open session can't be used to take over the account.
 */
export function PasswordSection({ account }: { account: AccountInfo }) {
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<FormStatus>(null);
  const needsCurrent = account.hasPassword;

  async function submit() {
    setSaving(true);
    setStatus(null);
    const supabase = createClient();
    if (needsCurrent) {
      const { error } = await supabase.auth.signInWithPassword({ email: account.email, password: current });
      if (error) {
        setSaving(false);
        setStatus({
          tone: 'error',
          text: error.code === 'invalid_credentials' ? 'Kata sandi saat ini salah.' : errorMessage(error),
        });
        return;
      }
    }
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      setStatus({ tone: 'error', text: errorMessage(error) });
      return;
    }
    setCurrent('');
    setPassword('');
    setStatus({ tone: 'success', text: 'Kata sandi diperbarui. Pakai kata sandi baru saat masuk berikutnya.' });
  }

  return (
    <ProfileSection
      id="kata-sandi"
      title="Kata Sandi"
      description={
        needsCurrent
          ? 'Masukkan kata sandi saat ini untuk menggantinya.'
          : 'Akun ini masuk lewat akun sosial. Buat kata sandi agar bisa masuk dengan email juga.'
      }
    >
      <SectionForm
        dirty={current !== '' || password !== ''}
        canSave={(!needsCurrent || current !== '') && meetsPasswordRules(password)}
        saving={saving}
        status={status}
        onSubmit={submit}
        submitLabel={needsCurrent ? 'Ganti Kata Sandi' : 'Buat Kata Sandi'}
      >
        {needsCurrent && (
          <PasswordField
            label="Kata Sandi Saat Ini"
            value={current}
            onChange={setCurrent}
            hint="Kata sandi yang kamu pakai untuk masuk sekarang."
            autoComplete="current-password"
          />
        )}
        <PasswordField
          label="Kata Sandi Baru"
          value={password}
          onChange={setPassword}
          hint="Harus berbeda dari kata sandi sebelumnya."
          autoComplete="new-password"
        />
        <PasswordRequirements value={password} />
      </SectionForm>
      {needsCurrent && (
        <p className="text-sm text-gray-600">
          Lupa kata sandi saat ini?{' '}
          {/* Recovery starts signed out, so the proxy ends this session on the way in */}
          <Link href="/forgot-password" className="font-semibold text-primary hover:underline">
            Pulihkan lewat email
          </Link>{' '}
          (kamu akan keluar dulu).
        </p>
      )}
    </ProfileSection>
  );
}

const CONFIRM_WORD = 'HAPUS';

/** Permanent delete: the auth user, the profile row with it, and this device's archive. */
export function DeleteAccountSection({ account }: { account: AccountInfo }) {
  const router = useRouter();
  const confirmId = useId();
  const [confirm, setConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [status, setStatus] = useState<FormStatus>(null);
  const confirmed = confirm.trim().toUpperCase() === CONFIRM_WORD;

  async function deleteAccount() {
    if (!confirmed || deleting) return;
    setDeleting(true);
    setStatus(null);
    let message = 'Akun gagal dihapus. Periksa koneksi lalu coba lagi.';
    try {
      const response = await fetch('/api/account', { method: 'DELETE' });
      const body = (await response.json().catch(() => null)) as { ok: boolean; message?: string } | null;
      if (response.ok && body?.ok) {
        forgetAccountArchive(account.userId);
        forgetCachedInsights();
        // The session's user no longer exists; this only clears the cookies
        await createClient().auth.signOut({ scope: 'local' }).catch(() => undefined);
        router.push('/signup');
        router.refresh();
        return;
      }
      if (body?.message) message = body.message;
    } catch {
      // Network failure: keep the generic message
    }
    setDeleting(false);
    setStatus({ tone: 'error', text: message });
  }

  return (
    <ProfileSection
      id="hapus-akun"
      title="Hapus Akun"
      tone="danger"
      description="Menghapus akun, profil, dan brand kamu secara permanen. Tren yang tersimpan di Arsip perangkat ini ikut dihapus. Tindakan ini tidak bisa dibatalkan."
    >
      <div className="flex flex-col gap-1">
        <label htmlFor={confirmId} className="text-xs font-medium text-disabled-content">
          Ketik <strong className="font-mono text-txt-black">{CONFIRM_WORD}</strong> untuk konfirmasi
        </label>
        <input
          id={confirmId}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          className="w-full rounded-xl border border-disabled-surface p-4 font-mono text-lg text-txt-black outline-none transition-colors focus:border-primary md:max-w-xs"
        />
      </div>
      <FormMessage status={status} />
      <button
        type="button"
        onClick={deleteAccount}
        disabled={!confirmed || deleting}
        aria-busy={deleting}
        className="flex w-fit items-center gap-2 rounded-lg border border-primary px-5 py-3 text-md font-semibold text-primary transition-colors hover:enabled:bg-primary hover:enabled:text-bg-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {deleting ? (
          <CircleNotch size={18} weight="bold" aria-hidden className="motion-safe:animate-spin" />
        ) : (
          <Trash size={18} aria-hidden />
        )}
        {deleting ? 'Menghapus...' : 'Hapus Akun Permanen'}
      </button>
    </ProfileSection>
  );
}
