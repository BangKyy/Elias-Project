'use client';

import { useState, type ReactNode } from 'react';
import { SignOut } from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';

type SignOutButtonProps = {
  /** Where to land once signed out */
  redirectTo?: string;
  className?: string;
  /** Defaults to the "Keluar" label with its icon */
  children?: ReactNode;
};

/** Ends the session, then navigates. By default a "Keluar" button styled like BackLink. */
export default function SignOutButton({
  redirectTo = '/login',
  className = 'group flex w-fit items-center gap-1.5 text-lg text-txt-black disabled:opacity-50 md:gap-2.5 md:text-xl',
  children,
}: SignOutButtonProps) {
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    await createClient().auth.signOut();
    // A full load: the router would replay pages it prefetched for the signed-in user
    window.location.assign(redirectTo);
  }

  return (
    <button type="button" onClick={signOut} disabled={pending} className={className}>
      {children ?? (
        <>
          <SignOut size={28} className="text-stone transition-transform group-hover:-translate-x-0.5" />
          Keluar
        </>
      )}
    </button>
  );
}
