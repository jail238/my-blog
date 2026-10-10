# Direct NET Sync

## Operation

1. Open `https://misaki.love/sync/` and check the GitHub connection. Sign-in uses the existing Planner authentication page and session.
2. Save the `M.S.K. Sync` link as a bookmark. On mobile, copy its URL and paste it into a bookmark's address.
3. Sign in to maimai DX NET International in the same browser and run the bookmark.
4. Press `Connect M.S.K.` in the NET panel. Keep that tab open while the receiving window reads BASIC through Re:MASTER.
5. Review matched and unmatched charts, then press `Save records`. Unmatched or ambiguous titles are skipped, not guessed or deleted.

The importer reads five score-list pages sequentially, 400 ms apart, plus up to two profile pages. It does not run every five minutes or store a reusable SEGA session. A fresh NET sign-in may be needed after a session expires. The site has no official SEGA API or webhook integration.

Public archive pages load the latest snapshot on navigation. While visible, they check its revision every five minutes, with additional checks on focus and visibility changes throttled to 30 seconds. The full snapshot is fetched only when the revision changes. A same-browser import also notifies other tabs immediately. Offline or failed requests retain the static archive.

## Stored Data

- Public: chart ID, best achievement, rank, rating contribution, combo/sync lamps, DX score and maximum, milestone dates, rating, class, and coin count when available.
- Never sent from NET: passwords, cookies, authentication tokens, friend codes, names, HTML, or account identifiers.
- Private Planner entries remain in their existing RLS-protected table. Imports do not complete, skip, edit, or delete goals.
- Percentage, combo, sync, and DX score are merged independently so a lower score cannot erase an existing best result.
- Existing AP and AP+ dates are preserved. A percentage-only improvement does not reorder milestone history. AP to AP+ adds a separate AP+ date; direct AP+ does not invent an AP date.
- The score lists contain no historical play timestamps. Newly detected milestones use the server's import time and display `confirmed`, not a claimed historical achievement time.

The public chart catalog still comes from the existing weekly International catalog pipeline. Direct sync removes the Maishift dependency for normal score updates, not for the current catalog/constant source. Newly introduced or renamed charts may require that catalog refresh before they match.

## Backend Setup

Apply `supabase/migrations/202610100003_net_records.sql` after the Planner migrations. Configure the same public Supabase URL and publishable key used by Planner. Never put a service-role key in the website.

An administrator must add the intended existing Auth user to `public.record_publishers`. Do this through a trusted database administration channel; do not commit the user's ID. The allowlist has no client read/write grants or RLS policies. Other signed-in users cannot publish.

`record_snapshot` permits public reads only and exposes no publisher ID. `import_net_records` validates an allowlisted payload, checks the authenticated owner, locks the singleton row, and merges the update in one transaction. Both RPCs use an empty `search_path` and restricted execution grants. Supabase's advisory notice about a policy-free allowlist is intentional deny-all behavior; authenticated security-definer notices are covered by the explicit owner check and negative authorization tests.

The existing snapshot has been initialized from the prior public baseline. Do not rerun initialization against live data. Back up the public snapshot before deliberate baseline migrations or catalog-ID remapping.

## Verification and Limits

`scripts/net-records.test.mjs` covers HTML parsing, exact matching, independent best scores, milestones, message origin/window/nonce guards, public UI updates, atomic validation, and owner/outsider/anonymous database permissions. The collector's message flow uses synthetic NET HTML; a real logged-in NET import must also be checked by the owner after deployment.

- International NET only; Japanese NET is not supported by this bookmarklet.
- Pop-ups must be allowed for the explicit `Connect M.S.K.` action. Both tabs must stay open until saving.
- Data messages use exact origins, the initiating window, and a random one-use connection nonce. They carry no GitHub or SEGA authentication credentials.
- Imports stop on an unrecognized played-score layout instead of silently publishing an incomplete parse. If SEGA changes markup, update parser fixtures before retrying.
- The previous static record snapshot remains a fallback. Existing manual Maishift workflows are maintenance tools, not automatic live sync.
- Current dependency audit reports pre-existing Astro/image-build dependency advisories. Production is static GitHub Pages, with no Astro request server. Dependency upgrades should be handled separately with the full catalog, font, image, and Planner regression suite; do not force-upgrade dependencies as part of a record import.

Parser selectors and lamp filenames were checked against the public [KT maimai DX importer](https://github.com/j1nxie/kt-maimaidx-site-importer) and [mai-tools](https://github.com/myjian/mai-tools). This repository contains an independent, limited record parser, not bundled third-party importer code. The project is not affiliated with SEGA.
