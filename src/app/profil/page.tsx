import type { Metadata } from 'next';
import AppShell from '@/components/app/AppShell';
import { DeleteAccountSection, EmailSection } from '@/components/profil/AccountSections';
import { BrandSection, GoalsSection, PersonalSection } from '@/components/profil/ProfileDetailsSections';
import ProfileShell from '@/components/profil/ProfileShell';
import { loadProfilePage } from './loadProfilePage';

export const metadata: Metadata = {
  title: 'Profil — Elias',
};

/** Who you are and your brand, the email you sign in with, and deleting the account. */
export default async function ProfilPage() {
  const { userId, account, profile, header } = await loadProfilePage();

  return (
    <AppShell userId={userId} account={header}>
      <ProfileShell account={account} profile={profile}>
        <PersonalSection userId={userId} profile={profile} />
        <BrandSection userId={userId} profile={profile} />
        <GoalsSection userId={userId} profile={profile} />
        <EmailSection account={account} />
        <DeleteAccountSection account={account} />
      </ProfileShell>
    </AppShell>
  );
}
