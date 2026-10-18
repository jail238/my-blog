# My AP Videos

Last updated: 2026-10-18

## Owner Workflow

1. Open a song's chart/record page and choose `Manage videos`. The existing Planner GitHub login is reused; an already signed-in owner sees pencils immediately.
2. Choose the pencil below the exact ST/DX and difficulty with an AP/AP+ record.
3. Paste a YouTube video or Shorts URL and select `Save`.
4. The public `My AP Video` button opens that link in a new tab. The pencil edits it; the trash icon asks for confirmation before hiding it.

Only one current link is stored per chart. A later AP-to-AP+ promotion keeps the chart's link. Add the replacement recording manually when appropriate. The site does not verify the recording's content or claim it matches a particular play date. Removed links can be replaced by opening the same chart's pencil again.

## Scope And Storage

- Song detail comparison tables only. All existing YouTube searches, score data, AP dates, and table columns stay unchanged.
- AP/AP+ status comes from the existing public record snapshot, never from a percentage threshold. No control is rendered for non-AP charts.
- Apply `supabase/migrations/202610180001_perfect_videos.sql` after the existing migrations. It creates `chart_perfect_videos` and the `can_manage_perfect_videos` ownership check.
- The existing private `record_publishers` owner allowlist is reused without exposing account identifiers or re-enabling retired NET APIs. Ordinary authenticated users cannot write links.
- Active links are intentionally public. Deleted links remain owner-only. Browser roles cannot permanently delete rows or alter chart identity/revision directly.
- Updates compare the server revision to reject stale writes. A conflict requires closing and reopening the editor; it never silently overwrites another device.
- Only normalized HTTPS YouTube watch URLs reach the database. Shorts, live, embed, mobile, and short links are normalized; trackers and time parameters are discarded. Channels, playlists, spoofed domains, and arbitrary URLs are rejected.
- The same existing Supabase Free project stores URLs only, not videos. No paid service, file storage, or AI API is added. Normal free-project availability limits still apply.
- Pages refresh on focus, online return, and every 20 seconds while visible. An offline failure is shown rather than reported as saved. A public site rebuild is not needed for URL changes; new AP score records still require the existing Maishift refresh.

## Authentication

`Manage videos` uses the existing GitHub OAuth app and exact `/planner/` callback allowlist. A short-lived, same-site song path in session storage returns the owner to the original song after successful PKCE authentication. No additional provider permissions or secrets are requested. The path is consumed once, expires in ten minutes, and cannot redirect to external or arbitrary pages.

## Verification

2026-10-18: all 96 tests, strict TypeScript checks, and the 1,482-page static build passed. PostgreSQL role tests cover public reads, owner-only writes, invalid URLs/IDs, protected columns, duplicate/stale writes, soft deletion/restoration, and denial of permanent deletion.

The remote migration and transactional checks passed, including verification that the retired NET importer remains disabled. Browser checks passed for owner add/edit/remove, invalid URL rejection, sign-out hiding editor controls, and GitHub return to the original song. Temporary QA links were removed from public view without touching scores or Planner entries. Actual rendered 320px, 390px, 430px, and 1280px layouts retain all five chart columns without horizontal overflow. A physical phone sync check remains separate from these browser tests.
