-- "wikipedia": cards resting mainly on the most-read Indonesian Wikipedia
-- articles (src/lib/wikimedia.ts). Until this is applied, the store saves
-- those cards as "google_trends" (src/lib/insights/store.ts).

alter table public.insights drop constraint insights_source_check;
alter table public.insights add constraint insights_source_check
  check (source in ('google_trends', 'youtube', 'gdelt', 'news', 'wikipedia', 'reddit', 'x'));
