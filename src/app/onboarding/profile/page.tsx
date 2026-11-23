import type { Metadata } from 'next';
import AuthLayout from '@/components/AuthLayout';
import ProfileForm, { type ProfileAnswers } from '@/components/onboarding/ProfileForm';
import { onboardingFlow } from '@/components/progress/flows';
import StepList from '@/components/progress/StepList';
import { brandFields, fetchBrandProfile } from '@/lib/brandProfiles';
import { randomHeadline, welcomeHeadlines } from '@/lib/heroHeadlines';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Lengkapi Profil — Elias',
};

export default async function OnboardingProfilePage() {
  // The proxy only lets signed-in users here; load what they saved before
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: personal }, brand] = user
    ? await Promise.all([
        supabase.from('profiles').select('name, role').eq('id', user.id).maybeSingle<Pick<ProfileAnswers, 'name' | 'role'>>(),
        fetchBrandProfile(supabase, user.id),
      ])
    : [{ data: null }, null];
  const { brandId, ...answers } = brandFields(brand);
  const initial: ProfileAnswers | null = personal ? { ...personal, ...answers } : null;

  return (
    <AuthLayout
      hero={{
        headline: randomHeadline(welcomeHeadlines),
        body: <>Elias membaca tren dan berita global terbaru, lalu memberi rekomendasi yang sesuai dengan <strong>brand dan peran kamu</strong>.</>,
        angle: '213.3deg',
        children: <StepList flow={onboardingFlow} current={1} />,
      }}
    >
      <ProfileForm initial={initial} brandId={brandId} />
    </AuthLayout>
  );
}
