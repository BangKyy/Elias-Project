-- Step 2 of 2 of the profile split (20261123090000_split_profiles.sql).
-- Apply only once the code that reads brand_profiles is deployed: the app
-- before it reads these columns from profiles and breaks without them.

alter table public.profiles
  drop column category,
  drop column target_market,
  drop column archetype,
  drop column location,
  drop column local_focus,
  drop column goals;

comment on table public.profiles is 'The personal layer, one row per user: account type, onboarding answers about the person, morning email settings.';

comment on column public.insights.brand_categories is 'brand_profiles.category ids the trend fits; null on cards stored before tagging.';
comment on column public.insights.audiences is 'brand_profiles.target_market ids the trend reaches; null on cards stored before tagging.';
