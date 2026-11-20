import type { Metadata } from 'next';
import AppShell from '@/components/app/AppShell';
import { NotificationSection } from '@/components/profil/ProfileDetailsSections';
import ProfileShell from '@/components/profil/ProfileShell';
import { loadProfilePage } from '../loadProfilePage';

export const metadata: Metadata = {
  title: 'Notifikasi — Elias',
};

/** When the morning email arrives, and whether it comes on quiet days too. */
export default async function NotifikasiPage() {
  const { userId, account, profile, header } = await loadProfilePage();

  return (
    <AppShell userId={userId} account={header}>
      <ProfileShell account={account} profile={profile}>
        <NotificationSection userId={userId} profile={profile} />
      </ProfileShell>
    </AppShell>
  );
}
