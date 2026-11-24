# Elias v1 — MVP breakdown

Working checklist derived from the PRD (CLAUDE.md). Each MVP is built and
reviewed on its own before the next one starts. Signup, login and onboarding
already exist and are out of scope here.

Sequencing follows PRD Ch. 6 / Ch. 12: Phase 0 builds every page as a
click-through prototype against mock data; live data and the pipeline come
only after design-lead and supervisor sign-off.

## MVP 0 — Design system and app shell

- [x] Tokens for verdicts and Arsip statuses (icon + colour, never colour alone — AR-2)
- [x] Type scale additions for the app pages (`text-2xl`, `text-display-sm`)
- [x] App header with the real navigation: Beranda, Arsip, Chat, Profil (V1: wordmark only, no avatar)
- [x] App shell with entrance animation and the shared footer

## MVP 1 — Beranda (Home) · Phase 0 · BR-1 to BR-5

- [x] Route `/` open to guests and signed-in users; `/dashboard` placeholder removed
- [x] Bounded feed per generation cycle, no live stream (BR-1)
- [x] Beranda shows the last 5 days of stored cycles, newest day first with day headings, 10 cards per numbered page (`/?halaman=N`, same Pagination as Arsip) — paging never refetches
- [x] Insight card, minimum anatomy: signal, source, role-flavoured recommendation (BR-2)
- [x] Verdict on every card, including "Lewati" — recommending against action (Ch. 1, Ch. 4)
- [x] Archetype line changes only the recommended action, never Elias's register (V4)
- [x] Save to Arsip with source, tags, date pre-filled; no reload needed (BR-3)
- [x] Guest render: Tier-1 sources only, generic, no role/archetype, visible profile prompt (BR-4)
- [x] Quiet-day state — no significant signal, nothing sent (V6); prototype switch `/?siklus=sepi`
- [x] No TikTok/Instagram coverage implied anywhere (BR-5)
- [ ] Full card field list — blocked on Open Question 2.7

## MVP 2 — Arsip (Archive) · Phase 0 · AR-1 to AR-8

- [x] Route `/arsip`, open to guests; reads the same store Beranda writes to
- [x] Archive scoped per owner (guest / each account) on the device; no guest→account migration (2.6 open)
- [x] Only queryable sources; TikTok/Instagram shown disabled as "belum tersedia" (AR-1)
- [x] Three statuses, inline editing, shape/icon + colour badges (AR-2)
- [x] Priority as a separate control, account-gated; guests get a signup prompt (AR-3, AR-4)
- [x] Filters (status, category, source, saved-date range, priority) with AND logic; four sort orders (AR-5)
- [x] Search over title, tags, notes; inline notes; remove with confirm
- [x] Numbered pagination with "Menampilkan X–Y dari Z tren" (AR-6) — 6 per page until 2.14 is answered
- [x] Empty / no-results states in the Ch. 4 tone (AR-7)
- [x] Guest state persists per device (AR-8); prototype sample data via `/arsip?contoh=1`
- [ ] Move account holders' archive to the database (with MVP 4)

## MVP 3 — Profile · Phase 0 · PR-1 to PR-6

Route `/profil` (signed-in only), one page of blocks that each save on their own.
Onboarding and `/profil` share the option lists (`src/lib/profileOptions.ts`),
the goal / Always On pickers and the location field, so the answers stay interchangeable.

- [x] One flow over two objects: "Data Diri" (personal layer) and "Brand" (brand layer) blocks (PR-1)
- [x] Goals multi-select with exactly one primary (PR-2)
- [ ] Location required only once "Local" is checked, validated live (PR-3) — today a location is always required (onboarding made the same call); confirm against the PRD
- [x] 12 archetypes with inline descriptions (PR-4) — final copy blocked on 2.12
- [x] Always On defaults to "hanya saat ada hal signifikan" (PR-5)
- [x] No competitor field, no tone/language selector (PR-6)
- [x] Read + update: name, role, account type, category, target market, archetype, location / local focus, goals, morning email time, Always On
- [x] Email change through Supabase's confirmation link; pending address shown until confirmed
- [x] Password change, checked against the current password first; social-only accounts can set one
- [x] Log out through the header's "Keluar" (desktop and mobile menu)
- [x] Delete account (`DELETE /api/account`, type "HAPUS" to confirm): auth user → profile and `elias_usage` cascade, cached Elias answers and this device's archive cleared
- [x] Elias analyses re-run after a brand edit: the cache key now includes the brand's answers (`v3_` keys)

### Profile backlog

High priority
- [ ] Test the email change end to end: `/auth/callback` must be in Supabase Auth → Redirect URLs, and with "Secure email change" on, both addresses must confirm
- [ ] Production needs `SUPABASE_SECRET_KEY` for account deletion; without it the route answers 503
- [ ] With "Secure password change" on, Supabase asks for a reauthentication code: add the OTP step instead of only showing the error
- [ ] Archive copies on other devices survive account deletion until the archive moves to the database (MVP 4)
- [x] Re-point the brand block at `brand_profile` once MVP 4 splits `profiles`: Brand and Tujuan save to `brand_profiles`, Data Diri and Email Pagi to `profiles`

Later
- [ ] Download my data (profile + archive as JSON)
- [ ] Pause the morning email without losing the chosen time (ED-2)
- [ ] Connected accounts (link or unlink Google etc.) once social sign-in is switched on
- [ ] Warn before leaving `/profil` with unsaved edits
- [ ] Avatar upload (Supabase Storage); V1 header stays wordmark-only

## MVP 4 — Data model · Phase 1 · DM-1 to DM-8

- [x] `user → workspace → brand_profile` in schema; workspace created silently at signup (`handle_new_user` creates profile, workspace and brand profile)
- [x] One brand profile per workspace, capped in app logic only (DM-2): no unique constraint, the app reads the oldest (`fetchBrandProfile`, `src/lib/brandProfiles.ts`)
- [x] Split today's `profiles` table into personal layer + brand layer
  - Personal (`profiles`): account type, name, role, referral answers, onboarding progress, morning email time and Always On (settings of the person receiving the email, ED-5)
  - Brand (`brand_profiles`): category, target market, archetype, location / local focus, goals
  - The finished-onboarding check is split too: personal fields stay a check on `profiles`, the brand half is the `profiles_check_onboarding_brand` trigger
- [x] Applied in this order on 23 Nov 2026: `20261123090000_split_profiles.sql` (new tables, backfill, old columns kept) → deploy of `d97701a` → `20261123100000_drop_profile_brand_columns.sql`. Checked after: the six brand columns are gone from `profiles`, every profile has a brand profile, no finished user has an incomplete brand. Both were run outside the Supabase MCP, so they may be missing from Supabase's migration history; check before any `supabase db push`
- [ ] All memory keyed to `brand_profile_id` (DM-4); `workspace_invite` reserved (DM-7)
  - [x] Elias cache keys carry the brand profile id (was the user id); `/api/elias/insight` checks the brand is the caller's with `ownsBrand`, and account deletion clears keys of both ids
  - [ ] Archive (with the move below) and chat history (MVP 7) keyed to it as they are built
- [ ] Saved trends move from device storage to the database for account holders
- [ ] Structural test: two brands, zero cross-brand hits at the query layer (DM-6)
  - DM-6 at the database: RLS on `workspaces` and `brand_profiles` checks ownership through the workspace, and `public.can_access_brand(brand_profile_id)` is the one check every brand-keyed table uses in its policies (chat tables included). Clients can't insert brands or move one to another workspace (only the answer columns are updatable). App reads also filter on the workspace owner, so they hold even through the admin client
  - Checked on 23 Nov 2026 by running every migration on an in-memory Postgres (PGlite) with two users: each reads and updates only their own brand, `can_access_brand` is false for the other's. Not yet a committed test the repo runs

## MVP 5 — Ingestion and synthesis · Phase 1

- [ ] Source adapters: YouTube Data API, GDELT, Google Trends behind a swappable adapter (DS-1)
  - [x] YouTube: all 12 charts Indonesia serves (general + 11 categories), 50 places each, with likes, comments, duration, upload date and tags (12 units/cycle, cached)
  - [x] YouTube searches per brand category (`src/lib/insights/youtubeSearch.ts`): 11 curated Indonesian queries, last 48h by views, non-Indonesian results dropped; 1,111 units/day, once per WIB day (reused from the snapshot on retries). Sports, Arts, Parenting off until better queries are found
  - [x] Topic groups counted in code (`src/lib/insights/topics.ts`) across every collected video: terms and title phrases shared by 3+ videos from 2+ channels, sent as a `<topics>` block citing member videos
  - The prompt gets the top 8 of each chart, top 4 of each search, each topic's members, then movers: max 150 videos
  - [x] GDELT: one `sourcecountry:indonesia` headline batch per cycle, through the same spacing/backoff (not yet seen returning articles: rate-limited or unreachable from the dev IP)
  - [x] newsdata.io (`src/lib/newsdata.ts`, 24 Nov 2026): GDELT's backup for the cycle's `<news>` headlines. Free plan: 200 credits/day, 1 credit per request of up to 10 articles, 60 requests per 15 minutes, and every article arrives 12 hours after publication (nothing older than 48h), so it backs up and never leads
    - Indonesian outlets in Indonesian (`country=id&language=id`), duplicates removed. Headlines: 2 requests per cycle run (`prioritydomain=top`, two sets of 5 brand-relevant categories; newest-first alone covered only 3 minutes), max 15, max 3 per outlet, cached 1h. Their `<news>` block says "published 12 to 48 hours ago" and each line carries its time; cards resting on them have source `news` ("Media Indonesia")
    - Credits: read from each answer's `X-API-Limit-Remaining` (the account's own count, the same for every instance, so no ledger). Elias stops once `NEWS_DAILY_CREDIT_CAP` (default 150) are spent; keyword lookups stop 20 earlier so the cycle keeps a reserve. The renewal time isn't documented, so a stop is rechecked every 3 hours. Rate limit → wait for `X-RateLimit-Reset`; a refused key or parameter → 1h pause
    - Env: `NEWSDATA_API_KEY` (optional; without it newsdata.io is skipped), `NEWS_DAILY_CREDIT_CAP`. Both set in Vercel Production on 24 Nov 2026 (the key as Sensitive); until then production ran without newsdata.io
  - [x] Google Trends (`src/lib/googleTrends.ts`): the public "Trending now" RSS for Indonesia (10 newest searches, ~2 hours, traffic level + 3 news links each); `google-trends-api` is unusable (its daily endpoint answers 404)
    - Captured at most once an hour on any Beranda visit and by the cycle, merged into `google_trends_snapshots` per term per WIB day (`src/lib/insights/searchTrends.ts`); kept 30 days by pg_cron `purge-old-google-trends`
    - The prompt gets up to 20 searches seen in the last 24h as `<search_trends>` (`G1`…), with traffic level, start time, "N hari berturut-turut" streak and news titles; evidence links to the term's Trends explore page
    - [ ] Capture hourly from a cron instead of visits (with the warm-up cron), so quiet hours aren't missed — on hold, see Hosting
  - Reddit removed as a source (23 Nov 2026): `src/lib/reddit.ts` deleted, no `<reddit>` block in the prompt. Reddit answered unauthenticated requests with 403/404 by 19 Nov, and its Data API terms for this use were never confirmed. `reddit` stays a `SourceId` (and allowed in `insights.source`) so cards and Arsip entries saved earlier still render; nothing new is tagged with it. Bringing it back means a registered OAuth app (`REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`) and a terms check first
  - [x] Wikipedia (`src/lib/wikimedia.ts`): Wikimedia Pageviews "top" API for id.wikipedia, no key. Yesterday's UTC day (the day before while yesterday isn't published), human views only; main page, search, special and other non-article pages dropped, and so are bot-looking titles (domain endings like `.at`, single characters, bare numbers or symbols); top 20 kept, cached until the next UTC day
    - The prompt gets them as `<wikipedia>` (`W1`…) with Wikimedia's rank and views; a Wikipedia-only trend is "watch" at most and no reason is given from a title alone. Cards resting mainly on it are Wikipedia cards (Tier 1)
    - [x] `20261119090000_insight_wikipedia_source.sql` applied 19 Nov 2026 (`wikipedia` allowed in `insights.source`); the store's Google Trends fallback stays for databases without it
  - [x] Local news and industry media (`src/lib/newsFeeds.ts`): 10 RSS feeds aggregated in code, each fetched in parallel (8 s timeout), cached 1h, skipped on failure
    - Local (last 24h, max 15, one outlet at a time): Antara, CNN Indonesia, detikNews, CNBC Indonesia, Republika, Tempo. Industry (last 48h, max 12): Marketeers, MIX Marcomm and SWA through a Google News `site:` feed (no direct feed for non-browsers), CNBC Indonesia Tech and Lifestyle, DailySocial
    - No usable feed on 6 Nov 2026: Kompas, Liputan6, Kumparan, Suara, IDN Times, Kontan, Bisnis
    - The prompt gets `<local_news>` (`L1`…) and `<industry_news>` (`M1`…); news alone is context, and one company's announcement is never a card. Cards resting mainly on them have source `news` ("Media Indonesia", Tier 1)
    - [x] `news` allowed in `insights.source`: `20261106090000_insight_news_source.sql` is superseded by the Wikipedia and GitHub migrations, whose lists include it; `news` and `github` cards seen stored on 23 Nov 2026, so `20261119120000_insight_github_source.sql` is applied too
- [x] Generation cycle (`src/lib/insights/live.ts`): first request of the WIB day builds it, fixed until the next day; Beranda no longer reads `mock.ts`
  - Two stages on OpenRouter: one call picks up to 12 trends citing input ids (10 kept per day), then 7 parallel per-role calls write recommendations (8 requests/day)
  - Cards carry only measured movement (views gained, rank change, new on chart vs. the previous stored day), never percentages or life-cycle claims. Each card links its evidence (videos/articles)
  - Failure shows "Feed hari ini belum tersedia" (never sample cards) and retries after 10 minutes
  - [x] Store each cycle in `insight_cycles` / `insights` (written with `SUPABASE_SECRET_KEY`; without it today's cycle stays in memory only)
  - [x] Keep 5 days: read policy hides older cycles, pg_cron job `purge-old-insights` deletes them at 00:05 WIB
  - [ ] Warm the cycle from the cron instead of the first visit (~2.5 min wait) — on hold, see Hosting
  - [x] Daily snapshots (`youtube_chart_snapshots`, `src/lib/insights/snapshots.ts`): every chart place saved once per WIB day, compared with the newest earlier day (up to 7 days back); kept 30 days by pg_cron `purge-old-youtube-snapshots`
  - [ ] Not yet seen live: a cycle comparing against a stored day (migration applied 2026-11-04; needs two days of cycles)
- [x] Explicit no-signal branch feeding the quiet-day state (V6): an empty trend list from the model is a quiet day

### Open Food Facts (built 24 Nov 2026, off until the checklist passes)

A context source for Food & Beverage cards, per the OFF setup guide (24 Nov 2026). Never a card trigger, never a Layer A backup, never a claimed source (BR-5): it adds one line to a Food & Beverage card the trends call already picked, and a card without one is still valid.

- Data from the dump, never the API (production API calls are allowed only one per real user scan). `scripts/off-refresh.mjs` streams the CSV (1.5 GB compressed; the JSONL is 13.8 GB, both 23 Nov 2026) and keeps counts for watchlist tags only. Runs in GitHub Actions (`.github/workflows/off-refresh.yml`, 1st of each month 03:00 WIB, plus manual runs that default to `--dry-run`); Vercel Hobby's 300 s limit can't hold it
- Storage (`20261124090000_open_food_facts.sql`): schema `off_derived` (`tag_stats`, `pair_stats`), server only, read and written by `off_replace_snapshot` / `off_tag_stats` / `off_pair_stats`, which touch `off_derived` alone: it is never joined with another schema (ODbL share-alike). What leaves it is one composed sentence per card in `public.insight_off_context`, readable by signed-in users only (BR-4; `insights` itself is readable by guests)
- The cycle (`src/lib/sources/off/context.ts`) matches each Food & Beverage trend to the curated watchlist (`src/lib/sources/off/watchlist.json`), composes the line in code (`compose.ts`: the model never writes the number), passes it to the per-role calls (BR-6) and stores it with the card (AR-9). Opening a card never calls OFF or a model. Below `OFF_MIN_SAMPLE` (30) products, or with fewer than 5 labelled products, there is no line
- Card: the line under "Mengapa penting" and the ODbL attribution under the sources, signed-in only. Guests' cards drop it even from memory. Syarat shows the attribution only while enabled
- First scan (24 Nov 2026, dump of 23 Nov): 9,388 Indonesian products of 4.9 million; 87.5% have no category, 94% no Nutri-Score grade. Largest usable categories: plant-based foods and beverages 319, snacks 237, beverages 217, dairies 151. Labels: halal 2,495, no preservatives 72, vegan 51, no added sugar 27; 6,634 products have none. `en:halal` is left out of the watchlist: a share would measure what contributors recorded and read as a claim about which products are not halal
- Dry run of `off-refresh.mjs` on the same dump (24 Nov 2026, 654 s, nothing stored): 5 of 12 watchlist entries yield a line, all Nutri-Score ones: susu (47 graded products), olahan susu (113), biskuit dan kue (56), camilan (116), minuman (124). Kopi, teh, mi and bumbu have under 30 graded products. The three label entries (no added sugar, vegan, no preservatives) have only 2–3 labelled products in their category, so they yield nothing yet; a trend naming them falls back to its broader entry (a "gula" trend gets the minuman line)
- Env: `SOURCE_OFF_ENABLED` (off), `OFF_MIN_SAMPLE`; the workflow reads repository secret `SUPABASE_SECRET_KEY` and variables `NEXT_PUBLIC_SUPABASE_URL`, `OFF_USER_AGENT`, `SOURCE_OFF_ENABLED`
- Not built: the guide's DS-1 adapter interface (none exists yet: the Google Trends source has no adapter either), and the `CLAUDE.md` and `claude/data-sources-per-category.md` it refers to, which are not in this repository

Checklist before `SOURCE_OFF_ENABLED=true`:
- [ ] Legal: is `off_derived.tag_stats` an adapted database that triggers share-alike; does one OFF number in an insight count as combining databases; does a separate schema in the same Postgres count as combining; do the attribution text and placement satisfy the ODbL
- [ ] The full terms of use read, including commercial use (https://world.openfoodfacts.org/terms-of-use)
- [x] Parser checked against the current dump's columns (`countries_tags`, `categories_tags`, `labels_tags`, `nutriscore_grade`; the script stops if one goes missing)
- [x] Watchlist built from tags Indonesian products actually carry (first scan above); [ ] retune `OFF_MIN_SAMPLE` after seeing the first stored snapshot
- [x] Test: no product rows and no tags outside the watchlist are stored (`npm run test:off`)
- [x] Separation: the three functions read or write `off_derived` only; nothing else references it
- [x] Test: under the threshold there is no line, and the card ships without it (`npm run test:off`; `offContextFor` returns nothing for that card)
- [x] Opening a card calls neither OFF nor a model: the line is read from `insight_off_context` with the card
- [x] Attribution in the card's sources and on Syarat; OFF is in no source picker or coverage claim
- [x] A failed refresh never stops the cycle: the cycle only reads the stored snapshot, and a failed read means no line
- [x] `20261124090000_open_food_facts.sql` applied 24 Nov 2026 (in the migration history as `open_food_facts`); checked: anon and authenticated have no access to `off_derived` or the three functions, the service role has; `insight_off_context` has one select policy, for authenticated. The advisor's only new notes are the intended "RLS enabled, no policy" on the two `off_derived` tables
- [x] Secret and variables set on the fork `BangKyy/Elias-Project`, which runs the refresh (24 Nov 2026): the org repo `sumurcreative-intern/Elias-Project` needs an admin to set them, and has no `SOURCE_OFF_ENABLED`, so its copy of the workflow never runs on schedule. First run with `dry_run` off on 24 Nov 2026 (run 45341405799, 1 min 22 s; the dump streamed in 63 s): tests passed, 9,388 Indonesian products, 13 tag rows and 3 pairs stored, the same as the local dry run
- [ ] `SOURCE_OFF_ENABLED=true` both in Vercel (the cycle and Syarat read it) and as the fork's Actions variable (the monthly schedule), once the legal items above are answered

### PubMed (built and switched on 24 Nov 2026)

Switched on in Vercel Production on 24 Nov 2026 (`SOURCE_PUBMED_ENABLED=true`) by the product owner's decision, with three checklist items still open: the legal questions and the content team review (both noted below as not carried out), and registering `tool` and `email` with NCBI. Every request carries the API key, the volume is a few requests a day behind a 14-day cache, and the flag can be set back to `false` at any time.

An evidence context source for Health & Wellness cards, per the PubMed and openFDA setup guide (24 Nov 2026). Never a card trigger, never a claim that anything works, is safe or cures. openFDA from the same guide is not built yet (decided 24 Nov 2026): it holds US data only and would stay off anyway.

- `src/lib/sources/pubmed/counts.ts`: ESearch with `retmax=0`, counts only, never records or abstracts. Four queries per term: all results, randomized controlled trials, systematic reviews and meta-analyses, over the last `PUBMED_WINDOW_YEARS` (5) with `("last 5 years"[dp])`. Checked live on 24 Nov 2026: that filter matches `datetype=pdat&reldate` (59,390 vs 59,359), the three `[pt]` tags work, and an unknown word comes back in `errorlist.phrasesnotfound`, which counts as a broken query, never a zero. Spaced to `PUBMED_RPS` per instance (10 with the key, which NCBI accepted on 24 Nov 2026; capped at 3 without one); a failure means no line
- Term map (`src/lib/sources/evidence/termMap.ts`): 14 curated topics (kolagen, magnesium, probiotik, vitamin D and C, omega-3, kunyit/kurkumin, jahe, puasa intermiten, kreatin, melatonin, ashwagandha, whey, teh hijau/matcha), each run once live with its counts recorded. A plain word is too broad ("collagen" alone: 59,390 papers, mostly lab research), so supplement topics are narrowed to supplement studies. Only these queries leave for NCBI, never anything about a brand (DM-5). A starting list for the content team to confirm
- Storage (`20261124100000_pubmed_evidence.sql`): schema `evidence_cache.pubmed_counts` (term, the exact query sent, counts by type), server only, reused for `PUBMED_CACHE_TTL_DAYS` (14) and refetched when the query changes. The composed sentence goes to `public.insight_evidence_context` (source `pubmed`, ready for openFDA), readable by signed-in users only (BR-4)
- The cycle (`src/lib/sources/evidence/context.ts`) matches each Health & Wellness trend to the term map, composes the line in code ("PubMed mencatat 132 uji terkontrol acak dan 43 tinjauan sistematis tentang suplemen kolagen dalam 5 tahun terakhir."; "belum mencatat" when a curated term has results but no trials or reviews; nothing when it has no results at all), passes it to the per-role calls with a rule that a study count is never proof (BR-6) and stores it with the card (AR-9). Opening a card never calls PubMed or a model
- Card: the line under "Mengapa penting" and "Dari MEDLINE®/PubMed®, basis data National Library of Medicine AS." under the sources, signed-in only; guests' cards drop it even from memory. Syarat (with NLM's English wording and no-endorsement note) and Privasi name PubMed only while enabled
- Env: `SOURCE_PUBMED_ENABLED` (off), `NCBI_TOOL` (elias), `NCBI_EMAIL`, `NCBI_API_KEY` (secret), `PUBMED_RPS`, `PUBMED_WINDOW_YEARS`, `PUBMED_CACHE_TTL_DAYS`, `PUBMED_MIN_TOTAL`

Checklist before `SOURCE_PUBMED_ENABLED=true`:
- [ ] Legal: does storing counts without abstracts and publishing a derived line with attribution meet NLM's conditions for commercial use; could a study count beside a health trend read as support for a product claim under BPOM's health-claim and advertising rules; do the attributions meet NLM's requirements
  - Not carried out (noted 24 Nov 2026): no legal review is planned for now. Brief ready for whoever decides: [pubmed-legal-brief.md](pubmed-legal-brief.md). The open risk is BPOM's: a brand quoting the count in an ad as proof. Elias never writes such a claim but can't control what a brand publishes. Ways to lower it are in the brief (lines on "watch"/"skip" trends only, a short note on the card)
- [ ] `tool` (elias) and `email` registered with NCBI; [x] API key stored as a secret (in `.env.local`; Vercel when enabling)
- [x] Query syntax tested against live PubMed (date window, publication types, unknown-term behaviour)
- [x] Every term map query run once live; [ ] content team confirms the topics and labels
  - Not carried out (noted 24 Nov 2026): no content team review is planned for now; the technical check (every query valid, counts recorded) is done. Review list with a decision column: [pubmed-term-review.md](pubmed-term-review.md)
- [x] Test: only counts come back, never a record (`npm run test:evidence`)
- [x] Test: queries carry only the curated term, the window and publication types
- [x] Test: no mapping, no results, or a failure means no line, and the card ships without it
- [x] Opening a card calls neither PubMed nor a model: the line is read from `insight_evidence_context`
- [x] Test: a burst stays within `PUBMED_RPS`
- [x] Attribution in the card's sources, on Syarat and Privasi; PubMed is in no source picker, guest feed or coverage claim
- [x] Migration present in the database (checked 24 Nov 2026): `evidence_cache.pubmed_counts`, `insight_evidence_context` (select for authenticated only), both functions (service role only), all matching `20261124100000_pubmed_evidence.sql`. Applied outside the migration history (not listed there), like the 23 Nov migrations
- [x] Vercel Production env set 24 Nov 2026: `SOURCE_PUBMED_ENABLED=false`, `NCBI_TOOL`, `NCBI_EMAIL`, `PUBMED_RPS`, `PUBMED_WINDOW_YEARS`, `PUBMED_CACHE_TTL_DAYS`, `PUBMED_MIN_TOTAL`, and `NCBI_API_KEY` (Sensitive, piped from `.env.local` with the Vercel CLI). Switching on is now `SOURCE_PUBMED_ENABLED=true` and a redeploy

## MVP 5a — Live role-tailored analysis (OpenRouter free tier)

- [x] `POST /api/elias/insight` with `{ brandContext, trendTopic, userRole }`; signed-in only, brand id must be the caller's
- [x] Persona prompt (Ch. 4 voice, LN-1 glossary, restraint, no TikTok/Instagram claims); V3 enforced on the output
- [x] One request per call; model fallback via OpenRouter `models` routing, overridable with `OPENROUTER_MODELS`
- [x] Structured 429s: free daily cap vs. per-minute burst vs. per-user cap (`ELIAS_USER_DAILY_LIMIT`, default 10)
- [x] Server cache until midnight WIB + in-flight dedupe; client cache per tab session
- [x] Analysis panel on Beranda cards: Simpan ke Arsip (brief goes into the note), Salin Execution Brief
- [x] GDELT news context (`src/lib/gdelt.ts`): 3 headlines from the last 24h, fed into the prompt as data
- [x] GDELT safeguards: own 5.5s spacing, 5-minute backoff after a 429, 1h cache, never fails the insight
- [x] Keyword news falls back GDELT → Google News RSS → newsdata.io (`qInMeta`, by relevance, last 48h; `q` also matches article bodies and found the keyword in no title). A newsdata.io answer is labelled "12–48 jam lalu" on the brief and email, and the prompt never calls it today's news
- [x] Card shows `// CONTEXT: GDELT VERIFIED` with the headlines as links, or a plain note when news is unavailable
- [ ] Not yet seen live: a GDELT answer with articles (the dev IP was rate-limited throughout testing)
- [x] YouTube trending chart (`src/lib/youtube.ts`, Indonesia top 3, 1 unit/call, 1h shared cache), fetched in parallel with GDELT
- [x] Card: `ARCHETYPE // ROLE` and `// SOURCE` badges, So what, Make It Today brief, context accordion with thumbnails
- [x] Response also carries `result`, `recommendation_status` (EXECUTE_TODAY / WATCH / SKIP), `action_format`, `youtubeData`
- [x] Full chain verified live once (YouTube + OpenRouter; GDELT degraded to its note)
- [x] Server cache and per-user cap shared in the database (`elias_insight_cache`, `elias_usage` with the atomic `take_elias_budget`, `20261104130000_elias_insight_cache.sql`), so every server instance sees the same answers and limit. Process memory is only the fallback when `SUPABASE_SECRET_KEY` is missing (local dev), and then each instance counts on its own

Env: `OPENROUTER_API_KEY` (required), `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SITE_NAME`, optional `OPENROUTER_MODELS`, `OPENROUTER_CYCLE_MODELS` (daily cycle), `ELIAS_USER_DAILY_LIMIT`.

## MVP 6 — Email digest · Phase 1 · ED-1 to ED-5

Env: `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`, `APP_BASE_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, optional `EMAIL_TEST_RECIPIENT`, `ELIAS_DEV_TOOLS`.

- [x] Web push groundwork: `web-push` + types installed; VAPID pair (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`) checked as matching
- [ ] Web push is a second channel next to email: confirm against ED-1 ("single email channel adapter") before building it out
- [ ] Verify a sending domain in Resend: the sender is on `resend.dev`, which only delivers to the Resend account owner's own address

- [x] QStash receiver `POST /api/cron/daily-briefing`: signature verified on the raw body and `APP_BASE_URL` (current + next key), acknowledges with "nothing sent" until the pipeline exists
- [x] On-demand test: `POST /api/test/trigger-briefing` + `/dev/briefing` page runs GDELT + YouTube → OpenRouter → Resend now; dev only (or `ELIAS_DEV_TOOLS=1`), signed-in, own address or `EMAIL_TEST_RECIPIENT` only, counts against the per-user cap
- [x] Briefing email template (`src/lib/elias/briefingEmail.ts`): dark memo, claim first, one action, sources last; all model/source text escaped
- [ ] On-demand test run end to end with a real session (needs a signed-in click on `/dev/briefing`)
- [ ] QStash schedule created (needs a public `APP_BASE_URL`; QStash cannot reach localhost)
- [ ] Single email channel adapter (ED-1)
- [ ] Cadence follows Always On; zero-send path tested (ED-2, ED-4)
- [ ] Briefing-memo template that opens with a claim (ED-3, V2)
- [ ] Every send resolves one `brand_profile_id` + one recipient (ED-5)

## MVP 7 — Chat with Elias · V1 (moved from Phase 2)

- [ ] Surface exists, follow-up on a card; full spec still open

Scope (decided 23 Nov 2026): for now Chat is only a follow-up on a card, not free-form questions.

- [x] Opened from a card only: an "Tanya Elias" action on the card (Beranda, and Arsip for saved trends); no empty chat box, and no entry from the header's Chat link without a card (it lists the user's earlier card threads instead)
- [ ] Every thread belongs to exactly one card: `card_snapshot` is required
- [ ] Questions off the card's topic get a short refusal in Elias's voice that points back to the card (system prompt plus an output check), so the chat doesn't turn into a general assistant on the free quota
- Free-form questions may come later; they would need their own grounding (no card to anchor the answer) and their own limits

Moved into V1 (decided 23 Nov 2026, reversing the earlier "Phase 2, not V1" call the same day): with few users, 50 OpenRouter requests a day is enough for a guarded first version. Built before the morning email (MVP 6) and the scheduled cycle build, which can still be added after it without rework, because:

- Every model request (cycle, analysis, chat, email) is counted in one shared ledger with a reserve chat can never touch (see Shared request ledger below), so chat can't starve the 05:00 cycle or the morning email. OpenRouter's quota resets at 07:00 WIB, so an evening of chat would otherwise leave nothing for a 05:00 cycle
- They don't share code or tables with Chat; the email and scheduled cycle keep their own blockers (a public URL for QStash, a verified Resend domain)
- Order of work: shared request ledger → chat tables, RLS and 30-day purge → chat API route (sign-in, caps, card loaded on the server) → "Tanya Elias" on cards and the chat screen → Privacy and Terms updated, header link switched on

Also to handle while building it:

- [x] Model list: chat asks for the same strict JSON as an analysis (`{ reply, onTopic }`), so it runs on the same free models; `OPENROUTER_CHAT_MODELS` overrides them. The `onTopic` flag lets the code, not only the prompt, swap an off-topic answer for a fixed short refusal
- [x] Slow free models: a clear "Elias sedang menulis… model gratis kadang butuh sampai satu menit" state; the route allows 120 s (Vercel Hobby stops a function at 300 s). No streaming yet: the strict-JSON reply arrives whole
- [x] A card sent from the browser (Arsip entries older than 5 days) passes known fields only, each clipped, and is treated as data; Beranda cards are loaded on the server by `insight_id`

### Chat API route (built 23 Nov 2026)

`POST /api/chat` (`src/app/api/chat/route.ts`, logic in `src/lib/elias/chat.ts`) with `{ threadId }` for a follow-up, or `{ insightId, card? }` for the first message on a card, plus `message`:

- [x] Signed-in users who finished onboarding only: guests get 401 (checked locally), an unfinished profile 403
- [x] Message 1 to 1,000 characters; per conversation `ELIAS_CHAT_THREAD_LIMIT` (default 5) of the user's messages, then 429 `thread_limit`
- [x] The card: from the thread (RLS shows only the user's own), else the stored Beranda card, else the Arsip entry the browser sent; 404 when none
- [x] A `chat` request from the shared ledger (5 per user, 15 in total, never the reserve); 429 `user_limit` or `daily_limit`, and given back when no model answered
- [x] The last 8 messages and the card go to the model, the brand from the database (never the request); the reply gets the V3 / LN-1 clean-up with line breaks kept
- [x] Thread and both messages saved only once Elias answered, with the secret key, so a failed call leaves no empty thread
- [x] End-to-end test while signed in, on the local dev server (23 Nov 2026): an on-topic question got an answer in voice with the restraint a sensitive topic needs, an off-topic one got the fixed refusal, both counted as `chat` in the ledger and saved in one thread. "Hapus percakapan" not yet tried in the browser (its RLS rule is tested)

### Chat screen (built 23 Nov 2026)

- [x] `/chat`: the user's conversations, newest first (RLS), each with its card's verdict and title; an empty state that points to Beranda and Arsip
- [x] `/chat/baru?kartu=<id>`: a new conversation from "Tanya Elias". A Beranda card is read on the server; an older card comes from this device's Arsip and is sent with the first message; neither gives "Kartu ini tidak ditemukan" with links back. Nothing is saved until Elias's first reply, then the page moves to `/chat/<id>`
- [x] `/chat/<id>`: the conversation (`src/components/chat/ChatView.tsx`): the card on top, a note that messages are kept 30 days and processed through OpenRouter (so no confidential information), three starter questions on an empty conversation, "Sisa N pesan di percakapan ini", Ctrl+Enter to send, a failed send puts the message back in the box, and "Hapus percakapan" with a confirm step. Another user's id is a 404
- [x] "Tanya Elias" (`src/components/chat/AskEliasLink.tsx`) on Beranda cards for signed-in users, and on Arsip entries for account holders
- [x] Reply hierarchy (`src/components/chat/ReplyText.tsx`): the model still writes plain text, and the bubble reads its shape. The answer (first sentence) is larger and semibold, numbered and bullet lists get red mono markers, and a short "Label:" opening a line or list item is bold. The prompt asks for that shape: the answer alone on the first line, then paragraphs or a numbered list of "Label: ..." items (`chatPromptVersion` 2026-11-23.2). Older replies still render, at worst as plain paragraphs
- [x] Behind a switch until step 5 (`src/lib/chatFeature.ts`): open in development, and in production only with `NEXT_PUBLIC_CHAT_ENABLED=1`. Until then production shows the header item as "Segera", hides "Tanya Elias", and `/chat` pages are 404. `/api/chat` itself is live (guests get 401) but nothing calls it
- [x] Step 5a, Privacy and Terms (23 Nov 2026). The Chat passages follow `chatEnabled`, so the pages never describe Chat before it opens:
  - Privacy: chat messages and the card copy (with its Arsip note) are collected, why, that OpenRouter receives the card, recent messages and the new one, that some free model providers may log or train on prompts (so no confidential, customer or other people's data), 30-day retention and Hapus percakapan, removed with the account, readable only by their owner
  - Terms: a "Chat dengan Elias" section (one card only, signed-in and onboarded users, off-topic questions turned back, per-day, per-conversation and shared limits, AI replies can be wrong, no confidential information), Chat added to the not-allowed uses, and dropped from the "Segera" list
  - Already live, whatever the switch: the ledger is described (each model request's kind, account and time, no content, kept 30 days, unlinked from a deleted account), replacing "only today's analysis count"
  - `LEGAL_EFFECTIVE_DATE` is 23 November 2026; set it to the day Chat is switched on
- [x] Step 5b: `NEXT_PUBLIC_CHAT_ENABLED=1` set in Vercel (Production) on 23 Nov 2026 and deployed; Chat is open in production. `LEGAL_EFFECTIVE_DATE` stays 23 November 2026
- [ ] Chat errors kept somewhere that outlives Vercel Hobby's 1-hour logs
- [ ] Preview deployments have no env vars, so chat is tested locally or on production against the one database

### Chat feedback (built 23 Nov 2026)

A thumbs up or down on each Elias reply. It trains nothing: the free models belong to their providers and never see it. It shows which replies miss, so the prompt (`systemPrompt` in `src/lib/elias/chat.ts`) and the model list (`OPENROUTER_CHAT_MODELS`) can be tuned, and bad replies become test cases.

- [x] Migration `20261123130000_chat_feedback.sql`, columns on `chat_messages`:
  - `model`: the OpenRouter model that wrote the reply
  - `prompt_version`: `chatPromptVersion` in `chat.ts`; bump it whenever the prompt, the schema or `cleanReply` changes
  - `rating`: 1 or -1
  - `reason`, only on a thumbs down: `generic`, `off_brand`, `wrong_facts` or `unanswered`
  - `rated_at`, set by a trigger
- [x] RLS: the thread's owner may update only `rating` and `reason`, only on Elias replies in their own thread (DM-6); user messages can never carry a rating. Tested in PGlite (18 checks), with the chat-table checks still passing
- [x] The chat route saves the model and prompt version with each reply and returns the reply's id
- [x] Screen (`src/components/chat/ReplyActions.tsx`): a copy button under every reply ("Tersalin" for 2 seconds, "Gagal menyalin" without clipboard access), then thumbs under each saved reply; tapping the chosen one again clears it; a thumbs down offers "Terlalu umum", "Tidak sesuai brand", "Salah fakta", "Tidak menjawab" (optional). Saved straight away, put back if the save fails
- [x] Privacy: replies are stored with their model, ratings with their message, used to improve Chat, never sent to OpenRouter; the browser may change only ratings
- [ ] Ratings go with their thread after 30 days. Keeping them longer needs a copy without the user or the card's Arsip note, and a Privacy update; decide once there are enough ratings to read
- [ ] A way to read them: for now a SQL query in the Supabase editor (`select model, prompt_version, rating, reason, content from chat_messages where rating is not null`)
- [ ] Highly rated replies as examples in the prompt only within the same brand, or rewritten without brand details (DM-6)

### Chat history (decided 23 Nov 2026)

Saved for signed-in users, scoped to the brand, time-limited and deletable. Guests can't use Chat at all (see below).

- Prerequisite: the minimal MVP 4 split (`brand_profile`) first, so history is keyed to `brand_profile_id` from day one (DM-4) instead of `profiles` — built 23 Nov 2026, see MVP 4
- Chat tables use `public.can_access_brand(brand_profile_id)` in their RLS policies, so no thread or message of one brand is ever served for another (DM-6)
Built and applied 23 Nov 2026 (`20261123120000_chat_tables.sql`); checked on the full migration chain in an in-memory Postgres (23 checks), then on the live database: guests get 401, and a thread on another user's brand is refused by the trigger:

- [x] `chat_threads`: `id`, `brand_profile_id`, `user_id`, `insight_id` (text, nullable and without a foreign key: the card may already be purged, or live only in Arsip on the device), `card_snapshot` jsonb not null (a JSON object of at most 20,000 bytes), `created_at`, `last_message_at` (moved by every new message)
- [x] `chat_messages`: `thread_id`, `role` (`user` | `elias`), `content` (1 to 4,000 characters), `created_at`
- [x] RLS through `can_access_brand`, and only the thread's own user: zero cross-brand hits (DM-6). A trigger also refuses a thread whose user doesn't own its brand, even when the server writes with the secret key
- [x] Clients only read their threads and delete them; every write comes from the chat API route with the secret key, so no one can plant "Elias" replies in their own history. Guests (`anon`) get no access at all
- [x] Account deletion cascades to threads and messages (through `auth.users` and the brand profile)
- [x] Retention 30 days of inactivity, purged at 00:20 WIB by pg_cron `purge-old-chat-threads`; "Hapus percakapan" deletes a thread at once, its messages with it
- [x] Applied `20261123120000_chat_tables.sql`
- Guests can't use Chat (decided 23 Nov 2026): it is only for signed-in users who finished onboarding, since every chat needs a brand profile and guests would spend the shared free quota. Enforced at every layer:
  - [ ] Page: `/chat` stays out of `publicPaths` in `src/proxy.ts`, so guests are sent to `/login` and signed-in users must finish onboarding first (already true; a comment there guards it)
  - [ ] API: `/api/` routes skip the proxy's sign-in check, so the chat route answers 401 without a session, like `/api/elias/insight`
  - [ ] Database: chat tables grant nothing to `anon`, and their policies are `to authenticated` with `can_access_brand`
  - [x] Header: for guests the Chat link leads to sign-in (through the proxy) instead of a chat screen; `/chat`, `/chat/baru` and `/chat/<id>` all redirect guests to `/login` (checked locally)
- [ ] Only the last 6–10 messages plus `card_snapshot` go to the model, not the whole thread (free-model context and latency)
- [ ] Own daily limit per user: see Chat message limits below
- [ ] Stored user text is resent as data, never instructions; V3 output rules enforced in code as for insights
- [ ] Privacy and Terms updated before launch: messages are stored for 30 days and sent to OpenRouter (today's Privacy page says only brand information is); a one-line note in the chat UI not to type confidential information
- [ ] Check each model in `OPENROUTER_MODELS` for prompt logging or training by its provider (free-tier providers may do either); UU PDP (No. 27/2022) needs purpose, retention period and deletion, covered above

### Chat message limits (decided 23 Nov 2026)

Every chat message is one OpenRouter request from the same account-wide daily pool as the cycle (8 a day, more on retries),
card analyses (`ELIAS_USER_DAILY_LIMIT`, default 10 per user) and the morning email. A per-user cap alone can't protect
that pool, so chat also gets a global cap and the cycle keeps a reserved share.

| | Free tier today (50 requests/day) | After a one-time $10 OpenRouter credit (1,000/day) |
|---|---|---|
| Per user per day | 5 | 20 |
| Per conversation | 5 | 10 |
| All chat, all users | 15/day | ~600/day |
| Reserved for cycle, retries, email | 25 | ~100 |

- At 50/day Chat is a demo only. The $10 credit is a one-time top-up that lifts the free-model daily cap to 1,000 (OpenRouter policy as understood on 23 Nov 2026; check their limits page before relying on it)
- [ ] Chat has its own per-user budget, separate from card analyses, so chatting never blocks analysing a new card (`ELIAS_CHAT_DAILY_LIMIT`, counted in the shared ledger)
- [ ] Global chat cap per day (`ELIAS_CHAT_TOTAL_LIMIT`), checked in the shared ledger with the reserve, so the share kept for the cycle and email is never spent on chat
- [ ] A failed answer (the model never replied) gives the unit back through the ledger, as analyses do

### Shared request ledger (decided 23 Nov 2026)

One table, `model_requests`, records every OpenRouter request by kind (`cycle`, `analysis`, `chat`, `email`), so one place knows the day's total. `take_model_request` checks and records a request in one locked step, so two server instances can't both take the last unit; `refund_model_request` gives it back when no model answered (429 or 503).

- The account-wide total (`OPENROUTER_DAILY_LIMIT`, default 50) counts OpenRouter's own day, from 00:00 UTC (07:00 WIB). Per-user limits count the WIB day, like the Elias cache
- `cycle` and `email` may use the whole total; `analysis` and `chat` stop `ELIAS_RESERVED_REQUESTS` (default 25) short of it, so the cycle and the morning email always have their share
- Per kind: `analysis` per user `ELIAS_USER_DAILY_LIMIT` (10); `chat` per user `ELIAS_CHAT_DAILY_LIMIT` (5) and in total `ELIAS_CHAT_TOTAL_LIMIT` (15)
- Rows carry only the kind, the user and the time, never content; a deleted account's rows keep counting for the day (`on delete set null`). Purged after 30 days by pg_cron `purge-old-model-requests`
- Without `SUPABASE_SECRET_KEY` (local dev) or when the database can't be reached, each server instance counts in memory, as before
- [x] Ledger, cycle and analyses on it (`20261123110000_model_request_ledger.sql`, `src/lib/modelLedger.ts`)
- [ ] Apply the migration, then deploy. Deploying first is safe too: until it exists every take falls back to memory
- [ ] `elias_usage`, `take_elias_budget` and `refund_elias_budget` are no longer used once deployed; drop them in a later migration
- [ ] Chat and the morning email take `chat` and `email` requests when they are built
- [ ] Resets at midnight WIB, like the analysis limit and the Elias cache. OpenRouter's own quota resets at 07:00 WIB (00:00 UTC), which is why the reserve matters
- [ ] Per-minute bursts (free models allow ~20 requests/minute) get their own "coba lagi sebentar" message, apart from "limit reached"
- [ ] The UI shows what is left ("Sisa 12 pesan hari ini") and, at the limit, says so plainly in Elias's voice with the reset time
- Limits are per user for now; whether an agency workspace shares one budget is decided with `workspace_invite` (DM-7)
- If chat moves to paid models, the limit becomes a cost question and the number of history messages sent per request is the main lever

## Hosting — known gaps (no own domain or VPS yet)

Production runs on Vercel Hobby at `https://elias-demo.vercel.app` (project `elias`). Until there is a domain
or a server, these stay open and are accepted for now:

- [ ] Daily cycle is built by the first visitor of the WIB day (~2.5 min wait), not by a scheduled warm-up
  - Hobby stops a function at 300 s while `CYCLE_DEADLINE_MS` is 6 min, so a slow cycle can be cut off; lower the deadline below 300 s when the warm-up route is built
- [ ] Google Trends is captured only on visits, so quiet hours (mostly night) are missed
- Plan once unblocked: QStash schedules `POST /api/cron/warm-cycle` daily ~05:00 WIB (`0 22 * * *` UTC) and `POST /api/cron/capture-trends` hourly, both signature-checked like `/api/cron/daily-briefing`, awaiting their work and answering 500 on failure so QStash retries. Vercel Cron on Hobby runs once a day only, so it can't do the hourly capture
  - QStash only needs a public URL, so `elias-demo.vercel.app` would already do; `APP_BASE_URL` must then be that URL, not localhost
- [ ] Email only reaches the Resend account owner: a sending domain can't be verified without an own domain (see MVP 6)
- [ ] Supabase Auth Site URL and Redirect URLs must include `https://elias-demo.vercel.app/auth/callback`, or confirmation and email-change links point at localhost
- Runtime logs are kept 1 hour on Hobby, so a failed overnight cycle leaves no trace by morning
- [x] Production secrets in Vercel marked Sensitive (23 Nov 2026): `SUPABASE_SECRET_KEY`, `OPENROUTER_API_KEY`, `YOUTUBE_API_KEY`, `QSTASH_TOKEN`, both QStash signing keys, `RESEND_API_KEY`, `VAPID_PRIVATE_KEY`

## Cross-cutting

- [x] Do-not-translate glossary lookup (LN-1), built 23 Nov 2026 with the seed list in `src/lib/glossary.ts` standing in for 2.13
  - `cleanCopy` (every text field of cycle cards and Elias analyses) maps clear Indonesian translations back to the English term: "ajakan bertindak" → "CTA", "kesadaran merek" → "brand awareness", "takarir" → "caption", "korsel" → "carousel", and so on
  - Only phrases that mean the marketing term and nothing else. "kampanye", "wawasan", "sudut pandang", "cerita", "umpan", "video pendek" and "tren" stay, and "keterlibatan" / "jangkauan" are only replaced next to an audience or a post, so "keterlibatan pejabat" and "di luar jangkauan" are untouched. Card tags are skipped: they are news search keywords
- [ ] Open Question 2.13 still needs its answer: the final term list and who maintains it. Edit `doNotTranslate` and `translations` in `src/lib/glossary.ts` when it lands
- [ ] Copy lint: no emoji, no exclamation marks, claim-first openings (V2, V3)
