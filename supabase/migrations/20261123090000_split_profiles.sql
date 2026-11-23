-- MVP 4 (DM-1 to DM-4): user → workspace → brand_profile. profiles keeps the
-- personal layer (who the user is, how they want the morning email); the
-- brand's answers that shape Elias's calls move to brand_profiles, so memory
-- such as chat history can be keyed to brand_profile_id (DM-4).
--
-- Step 1 of 2. The old brand columns stay on profiles so the deployed app
-- keeps working until the code that reads brand_profiles is live; they are
-- dropped by 20261123100000_drop_profile_brand_columns.sql. Apply this, deploy,
-- then apply that one. Brand edits made through the old code in between are
-- not copied over.

-- Created silently at signup (DM-1). Only the owner for now; members arrive
-- with workspace_invite (DM-7)
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index workspaces_owner_id_idx on public.workspaces (owner_id);

comment on table public.workspaces is 'One per account, created at signup; owns the brand profile (DM-1).';

-- One per workspace, capped in app logic only (DM-2): the app reads the
-- oldest. Same checks the columns had on profiles
create table public.brand_profiles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  category text constraint brand_profiles_category_check check (category in (
    'beauty', 'fashion', 'food_beverage', 'health_wellness', 'sports', 'arts',
    'entertainment', 'technology', 'education', 'travel', 'home_living',
    'automotive', 'finance', 'parenting', 'politics'
  )),
  target_market text constraint brand_profiles_target_market_check check (target_market in (
    'gen_z', 'millennials', 'gen_x', 'students', 'young_professionals',
    'parents', 'smb', 'enterprise', 'general'
  )),
  archetype text constraint brand_profiles_archetype_check check (archetype in (
    'innocent', 'explorer', 'sage', 'hero', 'outlaw', 'magician',
    'everyman', 'lover', 'jester', 'caregiver', 'creator', 'ruler'
  )),
  location text,
  local_focus boolean not null default false,
  goals text[] not null default '{}' constraint brand_profiles_goals_check check (cardinality(goals) <= 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index brand_profiles_workspace_id_idx on public.brand_profiles (workspace_id);

comment on table public.brand_profiles is 'The brand layer: answers that shape Elias''s recommendations (DM-2, DM-3).';
comment on column public.brand_profiles.goals is 'Selected goals; goals[1] is the one primary goal.';

create trigger brand_profiles_set_updated_at
  before update on public.brand_profiles
  for each row execute function public.set_updated_at();

-- Whether the signed-in user may touch this brand. The one check every table
-- keyed to brand_profile_id uses in its policies (chat history included), so
-- no row of one brand is ever served for another (DM-6)
create function public.can_access_brand(p_brand_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.brand_profiles b
    join public.workspaces w on w.id = b.workspace_id
    where b.id = p_brand_profile_id and w.owner_id = (select auth.uid())
  );
$$;

revoke execute on function public.can_access_brand(uuid) from public, anon;
grant execute on function public.can_access_brand(uuid) to authenticated;

alter table public.workspaces enable row level security;
alter table public.brand_profiles enable row level security;

create policy "Owners can read their workspaces"
  on public.workspaces for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "Owners can read their brand profiles"
  on public.brand_profiles for select
  to authenticated
  using (public.can_access_brand(id));

create policy "Owners can update their brand profiles"
  on public.brand_profiles for update
  to authenticated
  using (public.can_access_brand(id))
  with check (public.can_access_brand(id));

-- Rows come from the signup trigger, never from clients. Only the answers are
-- editable: moving a brand to another workspace is not
revoke all on public.workspaces from anon, authenticated;
grant select on public.workspaces to authenticated;
revoke all on public.brand_profiles from anon, authenticated;
grant select on public.brand_profiles to authenticated;
grant update (category, target_market, archetype, location, local_focus, goals) on public.brand_profiles to authenticated;

-- Every existing account gets its workspace and brand, carrying its answers
insert into public.workspaces (owner_id)
select id from public.profiles;

insert into public.brand_profiles (workspace_id, category, target_market, archetype, location, local_focus, goals)
select w.id, p.category, p.target_market, p.archetype, p.location, p.local_focus, p.goals
from public.profiles p
join public.workspaces w on w.owner_id = p.id;

-- Signup now creates all three rows
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workspace_id uuid;
begin
  insert into public.profiles (id, account_type)
  values (new.id, nullif(new.raw_user_meta_data ->> 'account_type', ''));
  insert into public.workspaces (owner_id) values (new.id) returning id into v_workspace_id;
  insert into public.brand_profiles (workspace_id) values (v_workspace_id);
  return new;
end;
$$;

-- The finished-onboarding check spanned both layers. The personal half stays a
-- check on profiles; the brand half moves to a trigger, since a check can't
-- read another table
alter table public.profiles drop constraint onboarding_complete;
alter table public.profiles add constraint onboarding_complete check (
  onboarding_completed_at is null or (
    name is not null
    and role is not null
    and notification_time is not null
  )
);

create function public.check_onboarding_brand()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.onboarding_completed_at is not null and old.onboarding_completed_at is null and not exists (
    select 1
    from public.brand_profiles b
    join public.workspaces w on w.id = b.workspace_id
    where w.owner_id = new.id
      and b.category is not null
      and b.archetype is not null
      and (b.location is not null or b.local_focus)
      and cardinality(b.goals) > 0
  ) then
    raise exception 'The brand profile is not complete yet'
      using errcode = '23514', constraint = 'onboarding_complete';
  end if;
  return new;
end;
$$;

create trigger profiles_check_onboarding_brand
  before update of onboarding_completed_at on public.profiles
  for each row execute function public.check_onboarding_brand();
