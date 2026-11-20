import type { Metadata } from 'next';
import AppShell from '@/components/app/AppShell';
import { cookiesSections, cookiesSummary } from '@/components/legal/cookiesContent';
import LegalPage, { P } from '@/components/legal/LegalPage';
import { headerAccount } from '@/lib/headerAccount';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Kebijakan Cookie — Elias',
};

export default async function CookiesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <AppShell userId={user?.id ?? null} account={await headerAccount(supabase, user)}>
      <LegalPage
        href="/cookies"
        title="Kebijakan Cookie"
        intro={<P>Setiap cookie dan data yang Elias simpan di browser kamu, untuk apa, dan berapa lama.</P>}
        summary={cookiesSummary}
        sections={cookiesSections}
      />
    </AppShell>
  );
}
