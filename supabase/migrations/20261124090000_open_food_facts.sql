-- Open Food Facts as a context source for Food & Beverage cards (docs/MVP.md,
-- Open Food Facts). Never a card trigger.
--
-- off_derived holds aggregates of Indonesian products built from the OFF dump
-- (scripts/off-refresh.mjs), only for the curated watchlist
-- (src/lib/sources/off/watchlist.json): counts and Nutri-Score grades per
-- tag, never a product row, brand or image. OFF is ODbL share-alike, so this
-- schema is never joined with any other: the functions below read or write
-- off_derived alone, and only the server calls them, with the secret key.
-- What leaves it is one composed sentence per card, in
-- public.insight_off_context.

create schema off_derived;
revoke all on schema off_derived from public, anon, authenticated;
grant usage on schema off_derived to service_role;

-- Products carrying a watchlist tag, with their Nutri-Score grades
create table off_derived.tag_stats (
  tag text not null,
  tag_type text not null constraint tag_stats_tag_type_check check (tag_type in ('category', 'label')),
  n integer not null constraint tag_stats_n_check check (n >= 0),
  -- { "a": 12, "b": 30, …, "unknown": 40 }
  nutriscore jsonb not null default '{}',
  refreshed_at timestamptz not null,
  primary key (tag_type, tag)
);

-- Products carrying both a watchlist category and a watchlist label
create table off_derived.pair_stats (
  category text not null,
  label text not null,
  n integer not null constraint pair_stats_n_check check (n >= 0),
  refreshed_at timestamptz not null,
  primary key (category, label)
);

comment on schema off_derived is 'Open Food Facts aggregates (ODbL). Never joined with any other schema.';
comment on table off_derived.tag_stats is 'Indonesian OFF products per watchlist tag; replaced whole on every refresh.';
comment on table off_derived.pair_stats is 'Indonesian OFF products per watchlist category and label pair; replaced whole on every refresh.';

alter table off_derived.tag_stats enable row level security;
alter table off_derived.pair_stats enable row level security;
revoke all on off_derived.tag_stats, off_derived.pair_stats from public, anon, authenticated;
grant select, insert, delete on off_derived.tag_stats, off_derived.pair_stats to service_role;

-- Replaces the snapshot in one transaction, so a reader never sees half of
-- it. p_tags: [{ tag, tag_type, n, nutriscore }]; p_pairs: [{ category, label, n }]
create function public.off_replace_snapshot(p_tags jsonb, p_pairs jsonb)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_now timestamptz := now();
begin
  -- "where true": calls over the API run under pg-safeupdate, which refuses a bare DELETE
  delete from off_derived.pair_stats where true;
  delete from off_derived.tag_stats where true;
  insert into off_derived.tag_stats (tag, tag_type, n, nutriscore, refreshed_at)
    select t.tag, t.tag_type, t.n, coalesce(t.nutriscore, '{}'), v_now
    from jsonb_to_recordset(p_tags) as t (tag text, tag_type text, n integer, nutriscore jsonb);
  insert into off_derived.pair_stats (category, label, n, refreshed_at)
    select p.category, p.label, p.n, v_now
    from jsonb_to_recordset(p_pairs) as p (category text, label text, n integer);
end;
$$;

create function public.off_tag_stats(p_tags text[])
returns table (tag text, tag_type text, n integer, nutriscore jsonb, refreshed_at timestamptz)
language sql
stable
set search_path = ''
as $$
  select s.tag, s.tag_type, s.n, s.nutriscore, s.refreshed_at
  from off_derived.tag_stats s
  where s.tag = any (p_tags);
$$;

create function public.off_pair_stats(p_categories text[], p_labels text[])
returns table (category text, label text, n integer)
language sql
stable
set search_path = ''
as $$
  select p.category, p.label, p.n
  from off_derived.pair_stats p
  where p.category = any (p_categories) and p.label = any (p_labels);
$$;

revoke execute on function public.off_replace_snapshot(jsonb, jsonb) from public, anon, authenticated;
revoke execute on function public.off_tag_stats(text[]) from public, anon, authenticated;
revoke execute on function public.off_pair_stats(text[], text[]) from public, anon, authenticated;
grant execute on function public.off_replace_snapshot(jsonb, jsonb) to service_role;
grant execute on function public.off_tag_stats(text[]) to service_role;
grant execute on function public.off_pair_stats(text[], text[]) to service_role;

-- The one OFF sentence a card carries, written by the daily cycle with the
-- card and never looked up again (BR-6, AR-9). Signed-in users only: the
-- guest feed is Tier 1 only (BR-4). Deleted with its card.
create table public.insight_off_context (
  insight_id text primary key references public.insights (id) on delete cascade,
  line text not null constraint insight_off_context_line_check check (char_length(line) between 1 and 300),
  -- The products the number rests on, shown in the line itself
  sample integer not null constraint insight_off_context_sample_check check (sample > 0),
  -- When the snapshot the line came from was built
  refreshed_at timestamptz not null
);

comment on table public.insight_off_context is 'One Open Food Facts sentence per Food & Beverage card; signed-in users only.';

alter table public.insight_off_context enable row level security;

create policy "Signed-in users can read Open Food Facts lines"
  on public.insight_off_context for select
  to authenticated
  using (true);

revoke insert, update, delete on public.insight_off_context from anon, authenticated;
