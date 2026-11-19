import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import AppShell from '@/components/app/AppShell';
import ProfileView from '@/components/profil/ProfileView';
import { profileColumns, type ProfileRecord } from '@/lib/profile';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Profil — Elias',
};

export default async function ProfilPage() {
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

  return (
    <AppShell userId={user.id}>
      <ProfileView
        account={{
          userId: user.id,
          email: user.email ?? '',
          pendingEmail: user.new_email ?? null,
          hasPassword: user.identities?.some((identity) => identity.provider === 'email') ?? true,
          createdAt: user.created_at,
        }}
        profile={profile}
      />
    </AppShell>
  );
}
