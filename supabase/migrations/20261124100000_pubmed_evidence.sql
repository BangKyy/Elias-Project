-- PubMed as an evidence context source for Health & Wellness cards
-- (docs/MVP.md, PubMed). Never a card trigger, never a claim of efficacy.
--
-- evidence_cache holds study counts per curated term (src/lib/sources/evidence/termMap.ts):
-- the query sent and how many results it had, by publication type. Never an
-- abstract, a record or a brand: only terms from the term map leave for NCBI
-- (DM-5). Counts change slowly, so a row is reused for PUBMED_CACHE_TTL_DAYS.
-- Only the server reads or writes it, with the secret key.
--
-- What leaves it is one composed sentence per card, in
-- public.insight_evidence_context, which openFDA can share later.

create schema evidence_cache;
revoke all on schema evidence_cache from public, anon, authenticated;
grant usage on schema evidence_cache to service_role;

create table evidence_cache.pubmed_counts (
  term_key text primary key,
  -- The exact query sent, so a number can be audited and a changed term refetched
  query text not null,
  window_years integer not null constraint pubmed_counts_window_check check (window_years > 0),
  total integer not null constraint pubmed_counts_total_check check (total >= 0),
  -- { "rct": n, "systematic_review": n, "meta_analysis": n }
  by_type jsonb not null,
  fetched_at timestamptz not null default now()
);

comment on schema evidence_cache is 'Counts from public evidence sources (PubMed). No abstracts, records or brand data.';
comment on table evidence_cache.pubmed_counts is 'PubMed result counts per curated term over the last window_years; refetched after PUBMED_CACHE_TTL_DAYS.';

alter table evidence_cache.pubmed_counts enable row level security;
revoke all on evidence_cache.pubmed_counts from public, anon, authenticated;
grant select, insert, update on evidence_cache.pubmed_counts to service_role;

create function public.pubmed_cached_counts(p_term_keys text[])
returns table (term_key text, query text, window_years integer, total integer, by_type jsonb, fetched_at timestamptz)
language sql
stable
set search_path = ''
as $$
  select c.term_key, c.query, c.window_years, c.total, c.by_type, c.fetched_at
  from evidence_cache.pubmed_counts c
  where c.term_key = any (p_term_keys);
$$;

create function public.pubmed_store_counts(p_term_key text, p_query text, p_window_years integer, p_total integer, p_by_type jsonb)
returns void
language sql
set search_path = ''
as $$
  insert into evidence_cache.pubmed_counts (term_key, query, window_years, total, by_type, fetched_at)
  values (p_term_key, p_query, p_window_years, p_total, p_by_type, now())
  on conflict (term_key) do update
    set query = excluded.query, window_years = excluded.window_years, total = excluded.total,
        by_type = excluded.by_type, fetched_at = excluded.fetched_at;
$$;

revoke execute on function public.pubmed_cached_counts(text[]) from public, anon, authenticated;
revoke execute on function public.pubmed_store_counts(text, text, integer, integer, jsonb) from public, anon, authenticated;
grant execute on function public.pubmed_cached_counts(text[]) to service_role;
grant execute on function public.pubmed_store_counts(text, text, integer, integer, jsonb) to service_role;

-- The evidence sentence a card carries, written by the daily cycle with the
-- card and never looked up again (BR-6, AR-9). Signed-in users only: the
-- guest feed is Tier 1 only (BR-4). One per source; deleted with its card.
create table public.insight_evidence_context (
  insight_id text not null references public.insights (id) on delete cascade,
  source text not null constraint insight_evidence_context_source_check check (source in ('pubmed')),
  line text not null constraint insight_evidence_context_line_check check (char_length(line) between 1 and 300),
  -- When the counts behind the line were fetched
  fetched_at timestamptz not null,
  primary key (insight_id, source)
);

comment on table public.insight_evidence_context is 'One evidence sentence per Health & Wellness card and source; signed-in users only.';

alter table public.insight_evidence_context enable row level security;

create policy "Signed-in users can read evidence lines"
  on public.insight_evidence_context for select
  to authenticated
  using (true);

revoke insert, update, delete on public.insight_evidence_context from anon, authenticated;
