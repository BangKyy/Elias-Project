// Everything /profil reads and edits in public.profiles. Email and password
// live in Supabase Auth (auth.users) and are changed through supabase.auth.

export const profileColumns =
  'account_type, name, role, category, target_market, archetype, location, local_focus, goals, notification_time, always_on, created_at';

export type ProfileRecord = {
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
