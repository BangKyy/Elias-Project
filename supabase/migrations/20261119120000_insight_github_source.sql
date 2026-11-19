-- "github": cards resting mainly on the week's most-starred new GitHub
-- repositories (src/lib/github.ts), for tech-adjacent brands. Until this is
-- applied, the store saves those cards as "google_trends" (src/lib/insights/store.ts).

alter table public.insights drop constraint insights_source_check;
alter table public.insights add constraint insights_source_check
  check (source in ('google_trends', 'youtube', 'gdelt', 'news', 'wikipedia', 'github', 'reddit', 'x'));
