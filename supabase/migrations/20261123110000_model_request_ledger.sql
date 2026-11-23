-- One ledger for every OpenRouter request the app makes (docs/MVP.md, Shared
-- request ledger): the daily cycle, card analyses, chat and the morning
-- email all spend the same account-wide free quota, so one place has to know
-- the day's total. Replaces elias_usage, which only counted analyses per user;
-- that table and its functions stay until the code using this one is deployed.
-- Only the server touches it, with the secret key.

create table public.model_requests (
  id bigint generated always as identity primary key,
  kind text not null constraint model_requests_kind_check check (kind in ('cycle', 'analysis', 'chat', 'email')),
  -- A deleted account's requests still count for the day
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index model_requests_created_at_idx on public.model_requests (created_at);
create index model_requests_user_id_idx on public.model_requests (user_id, created_at);

comment on table public.model_requests is 'Every OpenRouter request by kind, never its content; purged after 30 days.';

alter table public.model_requests enable row level security;
revoke all on public.model_requests from anon, authenticated;

-- Checks and records one request in a single locked step, so two instances
-- can't both take the last unit. The account-wide total counts OpenRouter's
-- day (from 00:00 UTC, 07:00 WIB); per-user limits count the WIB day.
-- cycle and email may use the whole total, analysis and chat stop p_reserved
-- short of it. Returns the new row's id, or the limit that refused it:
-- 'daily', 'kind' or 'user'.
create function public.take_model_request(
  p_kind text,
  p_user_id uuid,
  p_daily_limit integer,
  p_reserved integer,
  p_kind_limit integer,
  p_user_limit integer
)
returns table (request_id bigint, refused text)
language plpgsql
set search_path = ''
as $$
declare
  v_quota_day timestamptz := date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';
  v_user_day timestamptz := date_trunc('day', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta';
  -- How far this kind may fill the day: all of it, or up to the reserve
  v_cap integer := p_daily_limit - (case when p_kind in ('cycle', 'email') then 0 else coalesce(p_reserved, 0) end);
  v_id bigint;
begin
  perform pg_advisory_xact_lock(hashtext('public.model_requests'));

  if (select count(*) from public.model_requests where created_at >= v_quota_day) >= v_cap then
    return query select null::bigint, 'daily'::text;
    return;
  end if;

  if p_kind_limit is not null and (
    select count(*) from public.model_requests where kind = p_kind and created_at >= v_quota_day
  ) >= p_kind_limit then
    return query select null::bigint, 'kind'::text;
    return;
  end if;

  if p_user_limit is not null and p_user_id is not null and (
    select count(*) from public.model_requests where kind = p_kind and user_id = p_user_id and created_at >= v_user_day
  ) >= p_user_limit then
    return query select null::bigint, 'user'::text;
    return;
  end if;

  insert into public.model_requests (kind, user_id) values (p_kind, p_user_id)
  returning public.model_requests.id into v_id;
  return query select v_id, null::text;
end;
$$;

-- Gives a request back when no model answered it (429 or 503 before any reply)
create function public.refund_model_request(p_request_id bigint)
returns void
language sql
set search_path = ''
as $$
  delete from public.model_requests where id = p_request_id;
$$;

revoke execute on function public.take_model_request(text, uuid, integer, integer, integer, integer) from public, anon, authenticated;
revoke execute on function public.refund_model_request(bigint) from public, anon, authenticated;
grant execute on function public.take_model_request(text, uuid, integer, integer, integer, integer) to service_role;
grant execute on function public.refund_model_request(bigint) to service_role;

-- 00:15 WIB: keep 30 days, enough to see how the quota is spent
select cron.schedule(
  'purge-old-model-requests',
  '15 17 * * *',
  $$ delete from public.model_requests where created_at < now() - interval '30 days'; $$
);
