# M.S.K.

Personal maimai record archive built with Astro.

## Site

- URL: https://misaki.love
- Framework: Astro
- Deploy: GitHub Pages + GitHub Actions

## Archive

The primary catalog has three views.

- `Level`: chart-based index. STANDARD and DELUXE charts are stored and displayed separately as `ST` and `DX`.
- `Version`: chart-release index. A song appears under every version that introduced one of its International ST or DX chart sets.
- `Plate`: version-plate progress for 神 (AP).
- Level index cards show AP/AP+ completion progress. Level detail pages can filter by song, artist, chart type, difficulty, internal level, and chart-release version; they can also hide completed AP/AP+ charts and order results by AP+, AP, then achievement rate.
- Version index rows show AP/AP+ progress including Re:MASTER charts. Version pages can be searched by song or artist and show BASIC through MASTER completion status for each ST/DX chart set, adding the Re:MASTER marker only when that chart exists.
- Plate progress follows the in-game 神 scope. Individual version plates use BASIC through MASTER and exclude Re:MASTER; the combined 舞神 goal uses every STANDARD chart from maimai through FiNALE and includes Re:MASTER. The original maimai and maimai PLUS releases share the 真神 group, and the plate rows run from the oldest version to the newest with 舞神 between 輝神 and 熊神. Each individual version label links to its chart catalog. Every row shows that goal's actual in-game plate image followed by its completed-chart count, percentage, and progress gauge. The home plate card shows completed plates only.
- Song pages keep ST and DX chart sets in separate comparison tables, show Korean titles for Japanese song names, and provide a chart-specific YouTube search for every difficulty. Personal records show the raw DX score with one matching official numbered DX-star icon and separate KST dates for AP and AP+ milestones. A direct AP+ omits the AP date. The records page supports version filtering and accumulates AP/AP+ records in their detected achievement order.
- The home record gallery shows the latest 12 entries from that AP/AP+ history, and both the gallery and full history display the official AP/AP+ marks. AP-to-AP+ promotions move back to the top, while percentage-only updates keep their original achievement time.

The public catalog is pinned to the International `CiRCLE PLUS` chart set. Public play records are imported from the Maishift profile and mapped to the same chart catalog.

```text
src/data/maimai.ts
src/data/maimai.generated.json
src/data/circle-plus.generated.json
src/data/maishift.generated.json
scripts/sync-maimai-catalog.mjs
scripts/sync-maishift-records.mjs
src/pages/levels/
src/pages/versions/
src/pages/plates/
src/pages/songs/
src/pages/records/
```

Only the maimai archive is included in the public build. Previous blog posts, writing tools, comments, and uploaded media are not published from this repository state.

## Commands

```bash
npm install
npm run pin:circle-plus
npm run refresh:catalog
npm run sync:catalog
npm run sync:records
npm run sync:data
npm test
npm run dev
npm run build
npm run preview
```

## Data Notes

- Titles, artists, chart-specific version folders, and jacket URLs are generated from [SaltMeta](https://github.com/realtvop/SaltMeta), filtered to charts available in the `intl` region.
- Korean display titles for Japanese song names are synchronized from the MIT-licensed [Carol extension](https://github.com/team-carol/carol-extension) translation data. Existing titles are retained if the translation API is temporarily unavailable.
- Display levels and internal constants are pinned from the complete Maishift `ASIA` chart set for `CiRCLE PLUS`. The build validates every chart so mixed-version level/constant pairs fail instead of being published.
- `npm run pin:circle-plus` intentionally replaces the version snapshot. Do not run it for an ordinary record refresh.
- `npm run refresh:catalog` generates a candidate from the current SaltMeta International catalog, reconciles it with the complete Maishift `ASIA` chart set, fills short-lived SaltMeta gaps with Maishift metadata, refreshes the pinned snapshot, and then regenerates the final catalog.
- Public personal records are generated from the [Maishift profile](https://maimai.shiftpsh.com/profile/elixir/home). The sync stores public scores and minimal history boundaries only; it does not store cookies, login data, or tokens.
- The site's `기록 갱신` button opens the repository's `Refresh Maishift records` workflow. Run it while signed in as a repository owner to import, commit, and deploy the latest public records without a local development environment.
- Record refreshes are manual. A separate workflow checks the CiRCLE PLUS catalog every Saturday at 07:30 KST and only commits and deploys after catalog mapping, tests, and the full static build succeed. If the upstream data has not changed, it does nothing.
- `MAGiCAL` stays in the version index but remains empty until International-region charts exist in the source data.
- `npm run sync:records` refreshes achievements, ranks, combo/sync states, DX scores, and rating contribution. When Maishift history is public, it incrementally checks new snapshots and backfills the first snapshot containing the current AP state; an AP+ record uses the first AP+ snapshot rather than its earlier AP snapshot. Available history begins on 2026-03-07, so the site labels these as confirmation dates rather than claiming exact play times.
- Plate conditions follow [SEGA's official rules](https://maimai.sega.jp/news/2020-01-15/). The individual in-game plate images come from the [Lxns Network maimai asset mirror](https://maimai.lxns.net/docs/api/maimai), and version prefixes, the combined 真 group, and the maimai–FiNALE STANDARD scope for 舞神 follow the [documented collection list](https://gamerch.com/maimai/533650).
- The FC, FC+, AP, and AP+ marks use the in-game image assets mirrored by the MIT-licensed [Lxns Network frontend](https://github.com/Lxns-Network/maimai-prober-frontend). Numbered DX-star icons come from the official International DX NET asset endpoint. See `THIRD_PARTY_NOTICES.md`.
- Song jackets are loaded from the metadata provider; the archive cover was generated specifically for this site.
- The project is not affiliated with SEGA.
- Do not commit tokens or other private data.
