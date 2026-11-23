// Everything /profil reads and edits: the personal layer in public.profiles
// and the brand layer in public.brand_profiles, as one record. Email and
// password live in Supabase Auth (auth.users) and are changed through supabase.auth.

/** The personal layer's columns; the brand's come from src/lib/brandProfiles.ts */
export const profileColumns = 'account_type, name, role, notification_time, always_on, created_at';

export type ProfileRecord = {
  /** The brand_profiles row the Brand and Tujuan blocks save into; null if signup left none */
  brandId: string | null;
  account_type: string | null;
  name: string | null;
  role: string | null;
  category: string | null;
  target_market: string | null;
  archetype: string | null;
  location: string | null;
  local_focus: boolean;
  goals: string[];
  /** HH:MM:SS, WIB */
  notification_time: string | null;
  always_on: string;
  created_at: string;
};

/** Auth facts /profil shows next to the profile row. */
export type AccountInfo = {
  userId: string;
  email: string;
  /** Address waiting for its confirmation link, if a change is in progress */
  pendingEmail: string | null;
  /** False for accounts that only sign in through a social provider */
  hasPassword: boolean;
  createdAt: string;
};
