import type { SupabaseClient } from '@supabase/supabase-js';

// The brand layer (supabase/migrations/20261123090000_split_profiles.sql):
// user → workspace → brand_profile. profiles keeps the personal layer.
//
// Every read joins the workspace and filters on its owner, not only on RLS, so
// a brand stays its owner's even through the admin client (DM-6).

export type BrandProfileRow = {
  id: string;
  category: string | null;
  target_market: string | null;
  archetype: string | null;
  location: string | null;
  local_focus: boolean;
  goals: string[];
};

/** Shown when signup left no brand row to save into; a reload reads it again. */
export const missingBrandMessage = 'Profil brand kamu belum siap. Muat ulang halaman ini, lalu coba lagi.';

const brandColumns = 'id, category, target_market, archetype, location, local_focus, goals';

/** The user's brand: the oldest one in their workspaces, since there is one per workspace (DM-2). */
export async function fetchBrandProfile(supabase: SupabaseClient, userId: string): Promise<BrandProfileRow | null> {
  const { data, error } = await supabase
    .from('brand_profiles')
    .select(`${brandColumns}, workspaces!inner(owner_id)`)
    .eq('workspaces.owner_id', userId)
    .order('created_at')
    .limit(1)
    .maybeSingle<BrandProfileRow & { workspaces: unknown }>();
  if (error) console.error('Brand profile could not be read', error);
  if (!data) return null;
  const { workspaces: _owner, ...brand } = data;
  return brand;
}

/**
 * The brand's answers under the column names profiles used, so a page can
 * keep one record for both layers; empty answers when there is no brand row.
 */
export function brandFields(brand: BrandProfileRow | null) {
  return {
    brandId: brand?.id ?? null,
    category: brand?.category ?? null,
    target_market: brand?.target_market ?? null,
    archetype: brand?.archetype ?? null,
    location: brand?.location ?? null,
    local_focus: brand?.local_focus ?? false,
    goals: brand?.goals ?? [],
  };
}

/** Whether the brand belongs to the user; null when that can't be checked right now. */
export async function ownsBrand(supabase: SupabaseClient, userId: string, brandId: string): Promise<boolean | null> {
  const { data, error } = await supabase
    .from('brand_profiles')
    .select('id, workspaces!inner(owner_id)')
    .eq('id', brandId)
    .eq('workspaces.owner_id', userId)
    .maybeSingle();
  // Not a uuid at all: certainly not theirs
  if (error?.code === '22P02') return false;
  if (error) {
    console.error('Brand ownership could not be checked', error);
    return null;
  }
  return Boolean(data);
}

/** All of the user's brand ids, for clearing what is keyed to them. */
export async function brandIdsOf(supabase: SupabaseClient, userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('brand_profiles')
    .select('id, workspaces!inner(owner_id)')
    .eq('workspaces.owner_id', userId)
    .returns<{ id: string }[]>();
  if (error) console.error('Brand ids could not be read', error);
  return (data ?? []).map((row) => row.id);
}
