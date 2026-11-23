import type { SupabaseClient } from '@supabase/supabase-js';
import { brandFields, fetchBrandProfile } from './brandProfiles';

type PersonalProgress = {
  name: string | null;
  role: string | null;
  notification_time: string | null;
  onboarding_completed_at: string | null;
};

export type OnboardingProgress = PersonalProgress & {
  category: string | null;
  target_market: string | null;
  archetype: string | null;
  location: string | null;
  local_focus: boolean;
  goals: string[];
};

/**
 * How far a user got through onboarding, from both layers. A finished user
 * costs one read: the brand is only read while onboarding is still open.
 */
export async function fetchOnboardingProgress(supabase: SupabaseClient, userId: string): Promise<OnboardingProgress | null> {
  const { data: personal } = await supabase
    .from('profiles')
    .select('name, role, notification_time, onboarding_completed_at')
    .eq('id', userId)
    .maybeSingle<PersonalProgress>();
  if (!personal) return null;
  const { brandId: _id, ...brand } = brandFields(personal.onboarding_completed_at ? null : await fetchBrandProfile(supabase, userId));
  return { ...personal, ...brand };
}

/** The onboarding page a user should be on, or null once onboarding is finished. */
export function nextOnboardingStep(profile: OnboardingProgress | null): string | null {
  if (profile?.onboarding_completed_at) return null;
  const profileDone =
    profile?.name &&
    profile.role &&
    profile.category &&
    profile.target_market &&
    profile.archetype &&
    (profile.location || profile.local_focus);
  if (!profileDone) return '/onboarding/profile';
  const goalsDone = profile.goals.length > 0 && profile.notification_time;
  return goalsDone ? '/onboarding/survey' : '/onboarding/goals';
}

/** Onboarding pages in order; earlier ones stay reachable through their back links. */
export const onboardingSteps = ['/onboarding/profile', '/onboarding/goals', '/onboarding/survey'];
