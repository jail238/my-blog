# Planner Cloud Setup

The existing site remains a static GitHub Pages archive. `/planner/` uses a separate Supabase project for private plans. No plans, email addresses, passwords, or auth tokens belong in the repository or static build.

## Zero-Cost Requirement

Use the Free plan only. Do not add a payment card, upgrade the organization, enable paid add-ons, or require a paid email provider. If a free quota or authentication delivery limit prevents operation, report the limitation instead of enabling billing. The planner stores chart IDs and dates; public jackets and the catalog stay on the existing site and are not copied into Supabase storage.

The Free plan currently includes a 500 MB database. Exceeding Free quotas can restrict service rather than automatically upgrading the plan. Low database activity over seven days can pause the project; the owner may need to resume it in the dashboard. Do not present a free hosted service as unlimited or guaranteed never to pause. See [Pricing](https://supabase.com/pricing), [Billing FAQ](https://supabase.com/docs/guides/platform/billing-faq), and [Free project pausing](https://supabase.com/docs/guides/platform/free-project-pausing).

## Database And Auth

1. Create a Supabase project, then apply `supabase/migrations/202610100001_planner.sql` in its SQL editor.
2. Register a GitHub OAuth App with the planner homepage URL and the project's `https://<project-ref>.supabase.co/auth/v1/callback` URL. Keep Device Flow disabled. Enter the Client ID and Client Secret directly into the Supabase GitHub provider settings; never put the secret in chat, local frontend configuration, GitHub Actions, or source control.
3. Enable GitHub and disable the Email and Anonymous sign-in providers. Signing into the Supabase management dashboard with GitHub is separate from this site's OAuth App. No SMTP service, custom email template, or paid authentication provider is needed.
4. Set the site URL to `https://misaki.love` and allow the exact `https://misaki.love/planner/` URL and the local development planner URL (for example `http://127.0.0.1:4323/planner/`) in the redirect allow list. Avoid production wildcards.
5. Sign in as the owner once before disabling new user signups. Verify the owner can subsequently sign out and sign in again with GitHub while new accounts are blocked. Do not publish until provider setup and real authentication have been verified.

The client uses PKCE with an explicit one-time code exchange on `/planner/`. It removes callback parameters before exchanging the code and displays an error instead of claiming success when authorization is denied or expired. It does not request repository permissions or separately store GitHub provider tokens.

## Public Build Configuration

Set these GitHub Actions repository variables and matching ignored local `.env` values:

```text
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Only a publishable key is accepted. Never use a secret key, service-role key, database password, or personal access token in a `PUBLIC_` variable. The publishable key is not an authorization boundary: row-level security enforces ownership in the database.

All three Pages build workflows (normal deployment, catalog refresh, and record refresh) receive these variables and run `npm run check:planner-config` before building. Publication fails if configuration is missing or unsafe. Local development without configuration displays `Cloud not connected`; it does not claim to save or sync plans locally.

## Behavior

- Identity is the chart ID, including ST/DX and difficulty. AP and SSS+ are separate targets.
- An unresolved entry appears every date from `start_date` onward, without making daily copies.
- Completed and skipped entries remain visible on their closing date and stop appearing afterward. Earlier dates still show their previous pending state.
- Undo reopens the original entry. A new goal may be added after an old one is closed. Duplicate pending goals are rejected atomically by the database.
- Updates use the server revision as a compare-and-set condition; stale devices cannot silently overwrite another device's change.
- Writes go directly to the cloud. The page refreshes on focus, when returning online, and every 20 seconds while visible. Network failures do not pretend to save offline.
- Existing public score records are shown for reference; they never automatically close a manually planned goal.
- Signing out clears loaded plans from memory. Supabase manages the local authentication session; credentials and private plans are never committed.

## Verification

The initial Free project migration and remote transactional checks passed on 2026-10-10: two synthetic owners were isolated, anonymous access was denied, date/duplicate constraints worked, and stale revisions could not overwrite newer writes. All synthetic data was rolled back. The real REST endpoint denied anonymous reads and writes. Security advisors reported no findings; the new database reported only an [unused index informational notice](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index). Keep the owner/date index for its intended query workload rather than removing it before real usage.

Local verification includes 59 tests, strict planner TypeScript checking, a 1,469-page static build, and OAuth-denial URL cleanup. Real GitHub sign-in, chart writes, independent AP/SSS+ targets, duplicate rejection, carry-forward, completed/skipped dates, undo, two-tab refresh, stale-write rejection, and sign-out/sign-in restoration passed on 2026-10-10. The two temporary UI test goals were removed afterward. Email sign-in is disabled, new signups are blocked, and the existing owner can still sign in. The Actions repository variables are configured.

Production deployment and the owner's GitHub OAuth return to `https://misaki.love/planner/` passed on 2026-10-10. The authenticated list reached `Synced` with no console errors. The current narrow in-app browser layout was checked for overflow. Its viewport override did not actually change the rendered width, so this run does not count as a fresh desktop/mobile breakpoint test. A physical PC/phone check remains for the owner.

Keep regression coverage for owner isolation, anonymous denial, simultaneous edits, duplicates, AP versus SSS+ targets, skipped/completed carry-forward, GitHub sign-in, denied authorization, logout, and network failures. Two browser tabs are not a substitute for the final physical PC/phone check. Do not create another real account solely for testing while private signups are blocked; database role tests cover synthetic owner isolation without widening access.

References: [GitHub sign-in](https://supabase.com/docs/guides/auth/social-login/auth-github), [PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow), [Row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security).
