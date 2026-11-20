import type { SupabaseClient, User } from '@supabase/supabase-js';
import { archetypeDirections } from './archetypes';
import { brandCategoryLabels, isBrandCategory } from './brandCategories';
import { creativeRoleLabels, isCreativeRole } from './creativeRoles';
import { formatDate } from './dates';

/** What the header's account panel shows about the signed-in user. */
export type HeaderAccount = {
  /** Profile name, else the email's local part */
  name: string;
  email: string;
  /** "19 November 2026" */
  joinedOn: string;
  /** Role, archetype and brand category labels, whichever are set */
  persona: string[];
};

/** Reads the header's account facts for a page; null for guests. */
export async function headerAccount(supabase: SupabaseClient, user: User | null): Promise<HeaderAccount | null> {
  if (!user) return null;
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('name, role, archetype, category')
    .eq('id', user.id)
    .maybeSingle<{ name: string | null; role: string | null; archetype: string | null; category: string | null }>();
  // The panel still works without the profile row: email and join date come from Auth
  if (error) console.error('Header account: profile read failed', error.message);

  const email = user.email ?? '';
  const { role, archetype, category } = profile ?? {};
  const persona = [
    isCreativeRole(role) ? creativeRoleLabels[role] : null,
    archetype ? (archetypeDirections[archetype]?.name ?? null) : null,
    isBrandCategory(category) ? brandCategoryLabels[category] : null,
  ].filter((label): label is string => label !== null);

  return {
    name: profile?.name?.trim() || email.split('@')[0] || 'Akun',
    email,
    joinedOn: formatDate(user.created_at.slice(0, 10)),
    persona,
  };
}
