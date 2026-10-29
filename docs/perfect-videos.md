# My AP Videos

Last updated: 2026-10-29

## Public Collection

The homepage `AP Videos` button opens `/videos/gallery/`. The `Collection` tab
shows only saved, active, valid YouTube links belonging to AP/AP+ charts in
the current record snapshot. Removed links, missing links, invalid URLs, and
non-AP charts never become gallery entries, including for a signed-in owner.

Cards show the original self-hosted song jacket in an uncropped square,
close-set original/translated titles, ST/DX, difficulty, level/constant,
achievement, and a `Saved YYYY.MM.DD` date. The jacket opens YouTube
in a separate tab; the title and arrow open the matching song's records.
Search supports existing English/Japanese/Korean catalog matching. Filters
separate chart types and difficulties; sorting uses latest saved-link update,
song title, or descending chart constant. Pagination starts at 20 videos.
The counter is registered AP-video charts / all AP and AP+ charts in the
record snapshot, not currently displayed cards / saved videos. Searching,
filtering, sorting, and Load more never change this global coverage ratio.
Missing, invalid, removed, and unknown-chart links do not count as registered.
Desktop cards auto-fill compact columns from a 160px minimum instead of
stretching three jackets across the whole content width (six columns around
a 1280px viewport). Mobile keeps two columns up to 760px and one below 359px.
Chart type, full difficulty name, and level/constant share one non-wrapping
metadata line. Compact badges use the same size on desktop and mobile, and
the level stays visible rather than wrapping or being truncated.

The collection is read-only and uses existing public cloud reads in batches.
No sign-in, database migration, video-file upload, or YouTube API key is
needed. Jackets use the existing same-origin lazy-loaded artwork; no YouTube
thumbnails or video players load automatically. `Saved` uses the existing
`updated_at` timestamp in Asia/Seoul, matching the latest-saved sort. It is the
last site save, not the YouTube publication date or a guaranteed first
registration date; editing or restoring a link updates it. The date tooltip
states this distinction. Invalid or absent timestamps hide the date rather
than inventing a historical date. No schema change or backfill is performed.
Load errors stay distinct from an empty collection or empty search and keep
the last loaded list when available. Refresh is manual or triggered by focus,
online return, or page visibility, with no recurring gallery polling.

Both collection and manager have Collection/Manage links. Viewing changes no
stored video links, score records, ownership policies, or Planner data.

## Owner Workflow

1. Choose `AP Videos` in the homepage Records section, then `Manage` to open the existing `/videos/` editor. Sign in with the existing Planner GitHub account if needed.
2. Search by original title, Korean translation, or artist; English, Korean, and Japanese share the catalog matcher. Filter by ST/DX and difficulty. Choose `Add video` on the exact AP/AP+ chart.
3. Paste a YouTube video or Shorts URL and select `Save`.
4. The song detail page now shows a public `My AP Video` button for that chart. Use `Edit video` in the manager to replace the URL, or the trash icon and confirmation to hide it.

Only one current link is stored per chart. A later AP-to-AP+ promotion keeps the chart's link. Add the replacement recording manually when appropriate. The site does not verify the recording's content or claim it matches a particular play date. Removed links can be replaced with `Add video` on the same chart. Search results show 20 at a time with `Load more`.

Unregistered charts precede registered charts before filtering and pagination, preserving the original order within each group. A successful save immediately sends that chart behind all unregistered ones; removing a link returns it to its original unregistered position. `Show registered` is ON by default and replaces the previous video-state dropdown. OFF hides saved charts from both the list and searches without deleting links. The setting survives refresh in the current browser, not across devices; blocked local storage never prevents using the toggle. Score records, video URLs, and their cloud sync are unaffected.

## Scope And Storage

- Editing lives only in the home-linked manager. Song tables contain no authentication, refresh, or pencil controls, and no visible video placeholder when no URL exists. Public watch links are on song details and the separate collection. All existing YouTube searches, score data, AP dates, and table columns stay unchanged.
- AP/AP+ status comes from the existing public record snapshot, never from a percentage threshold. No control is rendered for non-AP charts.
- Apply `supabase/migrations/202610180001_perfect_videos.sql` after the existing migrations. It creates `chart_perfect_videos` and the `can_manage_perfect_videos` ownership check.
- The existing private `record_publishers` owner allowlist is reused without exposing account identifiers or re-enabling retired NET APIs. Ordinary authenticated users cannot write links.
- Active links are intentionally public. Deleted links remain owner-only. Browser roles cannot permanently delete rows or alter chart identity/revision directly.
- Updates compare the server revision to reject stale writes. A conflict requires closing and reopening the editor; it never silently overwrites another device.
- Only normalized HTTPS YouTube watch URLs reach the database. Shorts, live, embed, mobile, and short links are normalized; trackers and time parameters are discarded. Channels, playlists, spoofed domains, and arbitrary URLs are rejected.
- The same existing Supabase Free project stores URLs only, not videos. No paid service, file storage, or AI API is added. Normal free-project availability limits still apply.
- The manager refreshes on focus, online return, and every 20 seconds while visible. An offline failure is shown rather than reported as saved. Song details read links once and refresh on returning to the tab or going online, without displaying editor status. A public site rebuild is not needed for URL changes; new AP score records still require the existing Maishift refresh. Manager reads are batched to avoid oversized query URLs.

## Authentication

The manager uses the existing GitHub OAuth app and exact `/planner/` callback allowlist. A short-lived, exact `/videos/` path in session storage returns the owner to the manager after successful PKCE authentication. No additional provider permissions or secrets are requested. The path is consumed once, expires in ten minutes, and cannot redirect to external or arbitrary pages.

## Verification

2026-10-29 inline metadata follow-up: all 14 gallery tests and the 1,486-page
local build passed. All 27 loaded videos have one 20px metadata row at 1280px;
at the narrowest two-column viewport (360px), every type/difficulty/level row
fits with no overflow or center misalignment, including the full Re:MASTER
label and level/constant. Artwork size, save dates, and `27/221` are preserved.
No scripts, stored links, records, database, or authentication changed.

2026-10-29 compact desktop follow-up: all 13 gallery tests and the 1,486-page
local build passed. At 1280px the grid has six columns with 181px square
jackets rather than the previous 378px artwork; at 1024px it has five columns
with 174px artwork. Both have no horizontal or copy overflow. The existing
390px two-column and 320px one-column layouts and `27/221` coverage are
unchanged. No scripts, links, records, database, or authentication changed.

2026-10-29 coverage follow-up: 173 tests, strict gallery TypeScript, and the
1,486-page local build passed. Existing public data shows `27/221 AP videos`:
27 valid saved chart links over all 221 AP/AP+ charts. The same ratio remains
with 20 initially displayed cards, all 27 loaded, four Korean search results,
and an empty ST-filtered search. The 390px counter has no horizontal overflow.
Jackets, save dates, existing links, scores, and database state are unchanged.

2026-10-29 jacket/date follow-up: 172 tests, strict gallery TypeScript, and the
1,486-page local build passed. Existing public links were read without writes:
all 27 cards have the existing last-save date, and displayed square jackets
load from the same origin with no YouTube thumbnail nodes. Pagination, Korean
search, and 320/390px layouts pass with no horizontal or copy overflow. Tests
cover the KST midnight boundary, offset timestamps, and missing/invalid dates.

2026-10-29: 170 tests and the 1,486-page local static build passed. Existing
cloud links were read without writing data: the collection showed 27 videos,
20 initially and all 27 after Load more. Korean search, exact filters, empty
results, level ordering, reset, same-origin jacket fallback, original manager
navigation, and 320/390px layouts were checked. No migration or link edit was
performed. Earlier verification below documents the original manager release.

2026-10-18: all 100 tests, strict TypeScript checks, and the 1,483-page static build passed. PostgreSQL role tests cover public reads, owner-only writes, invalid URLs/IDs, protected columns, duplicate/stale writes, soft deletion/restoration, and denial of permanent deletion. Manager tests cover multilingual search, exact chart filters, stable unregistered-first ordering before pagination, save/remove reordering, and visibility preference persistence including blocked storage.

The remote migration and transactional checks passed, including verification that the retired NET importer remains disabled. Browser checks passed for home-to-manager navigation, English/Korean/Japanese search, exact difficulty selection, saved-link filtering, add/remove, and GitHub return to the manager. A saved QA link appeared only on the matching song chart and disappeared after removal; the song page had zero editing controls and retained all five YouTube searches. Temporary QA links were removed from public view without touching scores or Planner entries. Actual rendered 320px, 390px, 430px, and 1280px manager layouts have no horizontal overflow; the home button also fits at 320px. A physical phone sync check remains separate from these browser tests.

The visibility update was checked against existing saved links without changing any cloud data. All registered rows followed all unregistered rows, no registered chart occupied the first unregistered page, OFF hid registered search results, and the choice survived refresh. The switch fit its control at actual 320px, 390px, 430px, and 1280px widths without page or control overflow.
