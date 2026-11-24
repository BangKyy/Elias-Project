-- football-data.org as schedule and standings context for Sports cards
-- (docs/MVP.md, football-data.org). Never a card trigger, never odds,
-- predictions or betting.
--
-- sports_cache holds the latest daily snapshot per competition, written by
-- scripts/football-refresh.mjs in GitHub Actions: fixtures of the last 3 and
-- next 7 days and the current league table. Team names, dates and numbers
-- only: no crests, logos, photos or player data (terms §9.2), and nothing
-- about a brand (DM-5). Each refresh replaces a competition's rows, keeping no
-- history, and public.football_purge_all() empties everything when the source
-- is switched off or the subscription ends (terms §4.6, §9.1). Only the server
-- reads or writes it, with the secret key.

create schema sports_cache;
revoke all on schema sports_cache from public, anon, authenticated;
grant usage on schema sports_cache to service_role;

-- When each competition was last refreshed, so an empty fixture list still reads as fresh
create table sports_cache.competitions (
  competition_code text primary key,
  name text not null,
  type text not null,
  current_matchday integer,
  fetched_at timestamptz not null
);

create table sports_cache.fixtures (
  match_id bigint primary key,
  competition_code text not null references sports_cache.competitions (competition_code) on delete cascade,
  kickoff_utc timestamptz not null,
  matchday integer,
  -- SCHEDULED | TIMED | IN_PLAY | PAUSED | EXTRA_TIME | PENALTY_SHOOTOUT | FINISHED | SUSPENDED | POSTPONED | CANCELLED | AWARDED
  status text not null,
  home_name text,
  away_name text,
  -- Null until the match is finished
  home_goals integer,
  away_goals integer,
  fetched_at timestamptz not null
);

create index fixtures_competition_idx on sports_cache.fixtures (competition_code, kickoff_utc);

-- The league table (TOTAL); none for CUP and PLAYOFFS competitions, which the API answers with 404
create table sports_cache.standings (
  competition_code text not null references sports_cache.competitions (competition_code) on delete cascade,
  season integer,
  position integer not null,
  team_name text not null,
  played integer not null,
  points integer not null,
  fetched_at timestamptz not null,
  primary key (competition_code, position)
);

comment on schema sports_cache is 'football-data.org snapshot (fixtures, standings). Purged when the source is off.';

alter table sports_cache.competitions enable row level security;
alter table sports_cache.fixtures enable row level security;
alter table sports_cache.standings enable row level security;
revoke all on sports_cache.competitions, sports_cache.fixtures, sports_cache.standings from public, anon, authenticated;
grant select, insert, delete on sports_cache.competitions, sports_cache.fixtures, sports_cache.standings to service_role;

-- Replaces one competition's snapshot in one transaction.
-- p_competition: { name, type, current_matchday }
-- p_fixtures: [{ match_id, kickoff_utc, matchday, status, home_name, away_name, home_goals, away_goals }]
-- p_standings: [{ season, position, team_name, played, points }]
create function public.football_replace_competition(p_code text, p_competition jsonb, p_fixtures jsonb, p_standings jsonb)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_now timestamptz := now();
begin
  -- Deleting the competition removes its fixtures and standings with it
  delete from sports_cache.competitions where competition_code = p_code;
  insert into sports_cache.competitions (competition_code, name, type, current_matchday, fetched_at)
    values (p_code, p_competition ->> 'name', p_competition ->> 'type', (p_competition ->> 'current_matchday')::integer, v_now);
  insert into sports_cache.fixtures (match_id, competition_code, kickoff_utc, matchday, status, home_name, away_name, home_goals, away_goals, fetched_at)
    select f.match_id, p_code, f.kickoff_utc, f.matchday, f.status, f.home_name, f.away_name, f.home_goals, f.away_goals, v_now
    from jsonb_to_recordset(p_fixtures) as f (
      match_id bigint, kickoff_utc timestamptz, matchday integer, status text,
      home_name text, away_name text, home_goals integer, away_goals integer
    )
    on conflict (match_id) do nothing;
  insert into sports_cache.standings (competition_code, season, position, team_name, played, points, fetched_at)
    select p_code, s.season, s.position, s.team_name, s.played, s.points, v_now
    from jsonb_to_recordset(p_standings) as s (season integer, position integer, team_name text, played integer, points integer)
    on conflict do nothing;
end;
$$;

-- The snapshot of these competitions, for the daily cycle: { competitions, fixtures, standings }
create function public.football_read(p_codes text[])
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'competitions', coalesce((select jsonb_agg(to_jsonb(c)) from sports_cache.competitions c where c.competition_code = any (p_codes)), '[]'),
    'fixtures', coalesce((select jsonb_agg(to_jsonb(f) order by f.kickoff_utc) from sports_cache.fixtures f where f.competition_code = any (p_codes)), '[]'),
    'standings', coalesce((select jsonb_agg(to_jsonb(s) order by s.competition_code, s.position) from sports_cache.standings s where s.competition_code = any (p_codes) and s.position <= 3), '[]')
  );
$$;

-- Empties the snapshot: the source was switched off or the subscription ended
create function public.football_purge_all()
returns void
language sql
set search_path = ''
as $$
  delete from sports_cache.competitions where true;
$$;

revoke execute on function public.football_replace_competition(text, jsonb, jsonb, jsonb) from public, anon, authenticated;
revoke execute on function public.football_read(text[]) from public, anon, authenticated;
revoke execute on function public.football_purge_all() from public, anon, authenticated;
grant execute on function public.football_replace_competition(text, jsonb, jsonb, jsonb) to service_role;
grant execute on function public.football_read(text[]) to service_role;
grant execute on function public.football_purge_all() to service_role;

-- The football line goes where the PubMed line does: one row per card and source
alter table public.insight_evidence_context drop constraint insight_evidence_context_source_check;
alter table public.insight_evidence_context add constraint insight_evidence_context_source_check
  check (source in ('pubmed', 'footballdata'));
