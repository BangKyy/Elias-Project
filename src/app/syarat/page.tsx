import type { Metadata } from 'next';
import AppShell from '@/components/app/AppShell';
import LegalPage, { P } from '@/components/legal/LegalPage';
import { termsSections, termsSummary } from '@/components/legal/termsContent';
import { headerAccount } from '@/lib/headerAccount';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Syarat & Ketentuan — Elias',
};

export default async function SyaratPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <AppShell userId={user?.id ?? null} account={await headerAccount(supabase, user)}>
      <LegalPage
        href="/syarat"
        title="Syarat & Ketentuan"
        intro={<P>Aturan memakai Elias: apa yang Elias lakukan, apa yang perlu kamu jaga, dan batas tanggung jawab kami.</P>}
        summary={termsSummary}
        sections={termsSections}
      />
    </AppShell>
  );
}
