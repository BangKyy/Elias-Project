import type { Metadata } from 'next';
import AppShell from '@/components/app/AppShell';
import ArchiveView from '@/components/arsip/ArchiveView';
import BerandaBackdrop from '@/components/beranda/BerandaBackdrop';
import { headerAccount } from '@/lib/headerAccount';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Arsip — Elias',
};

export default async function ArsipPage({ searchParams }: { searchParams: Promise<{ contoh?: string }> }) {
  const { contoh } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <AppShell userId={user?.id ?? null} account={await headerAccount(supabase, user)} backdrop={<BerandaBackdrop topGlow={false} />}>
      {/* Prototype switch: offers sample data on an empty archive for review */}
      <ArchiveView showSampleLoader={contoh === '1'} />
    </AppShell>
  );
}
