-- Feedback on Elias's chat replies (docs/MVP.md, MVP 7, Chat feedback): a
-- thumbs up or down, and on a thumbs down an optional reason. It reaches no
-- model; it shows which replies, prompts and models need work. Each reply
-- records the model that wrote it and the prompt version, so a rating can be
-- traced back. Ratings live on the message and go with its thread after 30 days.
--
-- The server still writes every message. The only client write is a rating on
-- an Elias reply in the user's own thread, and only the two rating columns.

alter table public.chat_messages
  add column model text constraint chat_messages_model_check check (char_length(model) <= 200),
  add column prompt_version text constraint chat_messages_prompt_version_check check (char_length(prompt_version) <= 40),
  add column rating smallint constraint chat_messages_rating_check check (rating in (-1, 1)),
  add column reason text constraint chat_messages_reason_check check (reason in ('generic', 'off_brand', 'wrong_facts', 'unanswered')),
  add column rated_at timestamptz,
  -- Only Elias's replies are rated, and a reason only explains a thumbs down
  add constraint chat_messages_rating_role_check check (role = 'elias' or (rating is null and reason is null)),
  add constraint chat_messages_reason_rating_check check (reason is null or rating = -1);

comment on column public.chat_messages.model is 'The OpenRouter model that wrote an Elias reply; null for user messages.';
comment on column public.chat_messages.prompt_version is 'chatPromptVersion in src/lib/elias/chat.ts when the reply was written.';
comment on column public.chat_messages.rating is '1 helpful, -1 not helpful, null unrated; set by the thread''s owner.';

-- rated_at follows the rating, whoever sets it
create function public.stamp_chat_rating()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.rated_at := case when new.rating is null then null else now() end;
  return new;
end;
$$;

create trigger chat_messages_stamp_rating
  before update of rating, reason on public.chat_messages
  for each row execute function public.stamp_chat_rating();

create policy "Users can rate Elias replies in their own chat threads"
  on public.chat_messages for update
  to authenticated
  using (
    role = 'elias'
    and exists (
      select 1 from public.chat_threads t
      where t.id = thread_id and t.user_id = (select auth.uid()) and public.can_access_brand(t.brand_profile_id)
    )
  )
  with check (
    role = 'elias'
    and exists (
      select 1 from public.chat_threads t
      where t.id = thread_id and t.user_id = (select auth.uid()) and public.can_access_brand(t.brand_profile_id)
    )
  );

-- The rating and its reason, nothing else: content, role and model stay the server's
grant update (rating, reason) on public.chat_messages to authenticated;
