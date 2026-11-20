import type { Metadata } from 'next';
import AppShell from '@/components/app/AppShell';
import { PasswordSection } from '@/components/profil/AccountSections';
import ProfileShell from '@/components/profil/ProfileShell';
import { loadProfilePage } from '../loadProfilePage';

export const metadata: Metadata = {
  title: 'Lupa Kata Sandi — Elias',
};

/** Change the password, or recover it by email when the current one is forgotten. */
export default async function KataSandiPage() {
  const { userId, account, profile, header } = await loadProfilePage();

  return (
    <AppShell userId={userId} account={header}>
      <ProfileShell account={account} profile={profile}>
        <PasswordSection account={account} />
      </ProfileShell>
    </AppShell>
  );
}
