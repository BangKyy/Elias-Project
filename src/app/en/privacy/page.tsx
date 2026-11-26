import type { Metadata } from 'next';
import AppShell from '@/components/app/AppShell';
import { PrivacyEn, privacyEnTitle } from '@/components/legal/privacyEnContent';
import { headerAccount } from '@/lib/headerAccount';
import { createClient } from '@/lib/supabase/server';

// Public and indexable for Pinterest's reviewers, but linked from nowhere in
// the app (LN-1); the URL is only given in the Pinterest Developer form
export const metadata: Metadata = {
  title: `${privacyEnTitle} — Elias`,
};

export default async function EnPrivacyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <AppShell userId={user?.id ?? null} account={await headerAccount(supabase, user)}>
      <PrivacyEn />
    </AppShell>
  );
}
