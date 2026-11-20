import type { Metadata } from 'next';
import AppShell from '@/components/app/AppShell';
import LegalPage, { P } from '@/components/legal/LegalPage';
import { privacySections, privacySummary } from '@/components/legal/privacyContent';
import { headerAccount } from '@/lib/headerAccount';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Kebijakan Privasi — Elias',
};

export default async function PrivasiPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <AppShell userId={user?.id ?? null} account={await headerAccount(supabase, user)}>
      <LegalPage
        href="/privasi"
        title="Kebijakan Privasi"
        intro={<P>Data apa yang Elias simpan, ke mana data itu pergi, berapa lama disimpan, dan cara kamu mengaturnya.</P>}
        summary={privacySummary}
        sections={privacySections}
      />
    </AppShell>
  );
}
