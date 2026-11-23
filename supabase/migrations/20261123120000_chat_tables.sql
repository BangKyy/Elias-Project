-- Chat with Elias (docs/MVP.md, MVP 7): a follow-up on one card, signed-in
-- users only, kept 30 days after its last message. Keyed to the brand profile
-- (DM-4) and readable only through can_access_brand (DM-6).
--
-- Clients only read their threads and delete them ("Hapus percakapan"). Every
-- write comes from the chat API route with the secret key, after it has
-- checked the session, the shared request ledger and the card; otherwise a
-- client could plant "Elias" replies in its own history and feed them back to
-- the model.

create table public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  brand_profile_id uuid not null references public.brand_profiles (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- The card it follows up on; no foreign key, since Beranda cards are purged
  -- after 5 days and Arsip keeps older ones on the device only
  insight_id text,
  -- A copy of the card as it was, so the thread outlives the card
  card_snapshot jsonb not null constraint chat_threads_card_snapshot_check check (
    jsonb_typeof(card_snapshot) = 'object' and octet_length(card_snapshot::text) <= 20000
  ),
  created_at timestamptz not null default now(),
  -- Moved by every new message; a thread idle for 30 days is purged
  last_message_at timestamptz not null default now()
);

create index chat_threads_user_id_idx on public.chat_threads (user_id, last_message_at desc);
create index chat_threads_brand_profile_id_idx on public.chat_threads (brand_profile_id);
create index chat_threads_last_message_at_idx on public.chat_threads (last_message_at);

comment on table public.chat_threads is 'One chat per card follow-up; deleted 30 days after its last message.';

create table public.chat_messages (
  id bigint generated always as identity primary key,
  thread_id uuid not null references public.chat_threads (id) on delete cascade,
  role text not null constraint chat_messages_role_check check (role in ('user', 'elias')),
  content text not null constraint chat_messages_content_check check (char_length(content) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index chat_messages_thread_id_idx on public.chat_messages (thread_id, created_at);

comment on table public.chat_messages is 'Messages of a chat thread, the user''s and Elias''s; go with their thread.';

-- A thread belongs to a brand its user owns, even when the server writes it
-- with the secret key (DM-6)
create function public.check_chat_thread_brand()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.brand_profiles b
    join public.workspaces w on w.id = b.workspace_id
    where b.id = new.brand_profile_id and w.owner_id = new.user_id
  ) then
    raise exception 'A chat thread must belong to a brand its user owns'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger chat_threads_check_brand
  before insert or update of brand_profile_id, user_id on public.chat_threads
  for each row execute function public.check_chat_thread_brand();

-- A new message keeps its thread alive
create function public.touch_chat_thread()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.chat_threads set last_message_at = new.created_at where id = new.thread_id;
  return new;
end;
$$;

create trigger chat_messages_touch_thread
  after insert on public.chat_messages
  for each row execute function public.touch_chat_thread();

alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;

create policy "Users can read their own chat threads"
  on public.chat_threads for select
  to authenticated
  using ((select auth.uid()) = user_id and public.can_access_brand(brand_profile_id));

create policy "Users can delete their own chat threads"
  on public.chat_threads for delete
  to authenticated
  using ((select auth.uid()) = user_id and public.can_access_brand(brand_profile_id));

create policy "Users can read messages of their own chat threads"
  on public.chat_messages for select
  to authenticated
  using (
    exists (
      select 1 from public.chat_threads t
      where t.id = thread_id and t.user_id = (select auth.uid()) and public.can_access_brand(t.brand_profile_id)
    )
  );

-- Guests get nothing; signed-in users read, and delete whole threads
revoke all on public.chat_threads from anon, authenticated;
revoke all on public.chat_messages from anon, authenticated;
grant select, delete on public.chat_threads to authenticated;
grant select on public.chat_messages to authenticated;

-- 00:20 WIB: threads idle for 30 days go, with their messages
select cron.schedule(
  'purge-old-chat-threads',
  '20 17 * * *',
  $$ delete from public.chat_threads where last_message_at < now() - interval '30 days'; $$
);
