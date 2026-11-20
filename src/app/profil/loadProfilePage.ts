import { redirect } from 'next/navigation';
import { headerAccount } from '@/lib/headerAccount';
import { profileColumns, type AccountInfo, type ProfileRecord } from '@/lib/profile';
import { createClient } from '@/lib/supabase/server';

/**
 * Everything the account pages (/profil, /profil/notifikasi,
 * /profil/kata-sandi) read: the auth user, their profile row, and the
 * header's account panel.
 */
export async function loadProfilePage() {
  // The proxy only lets signed-in users with finished onboarding through
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile, error } = await supabase
    .from('profiles')
    .select(profileColumns)
    .eq('id', user.id)
    .maybeSingle<ProfileRecord>();
  if (error) console.error('Profile could not be read', error);
  // Every account gets a row at signup; without one there is nothing to edit yet
  if (!profile) redirect('/onboarding/profile');

  const account: AccountInfo = {
    userId: user.id,
    email: user.email ?? '',
    pendingEmail: user.new_email ?? null,
    hasPassword: user.identities?.some((identity) => identity.provider === 'email') ?? true,
    createdAt: user.created_at,
  };

  return { userId: user.id, account, profile, header: await headerAccount(supabase, user) };
}
