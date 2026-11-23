import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchBrandProfile } from '../brandProfiles';
import type { BrandContext } from './types';

export type ProfileRow = {
  brandId: string;
  role: string | null;
  category: string | null;
  archetype: string | null;
  target_market: string | null;
  location: string | null;
  local_focus: boolean;
  goals: string[];
  notification_time: string | null;
  always_on: string;
};

type PersonalRow = Pick<ProfileRow, 'role' | 'notification_time' | 'always_on'>;

/** The user's personal layer and brand together; null without both. */
export async function fetchProfile(supabase: SupabaseClient, userId: string): Promise<ProfileRow | null> {
  const [{ data: personal, error }, brand] = await Promise.all([
    supabase.from('profiles').select('role, notification_time, always_on').eq('id', userId).maybeSingle<PersonalRow>(),
    fetchBrandProfile(supabase, userId),
  ]);
  // A failed read renders the guest feed, so say why (e.g. a column whose migration isn't applied)
  if (error) console.error('Profile could not be read', error);
  if (personal && !brand) console.error('Profile has no brand profile', userId);
  if (!personal || !brand) return null;
  const { id: brandId, ...answers } = brand;
  return { ...personal, ...answers, brandId };
}

/** Keyed to the brand profile, so its cache and memory never mix with another brand's (DM-4, DM-6). */
export function brandContextFor(profile: ProfileRow): BrandContext {
  return {
    id: profile.brandId,
    category: profile.category,
    archetype: profile.archetype,
    targetMarket: profile.target_market,
    location: profile.location,
    localFocus: profile.local_focus,
    goals: profile.goals,
  };
}
