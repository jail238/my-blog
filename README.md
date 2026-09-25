# M.S.K.

Personal maimai record archive built with Astro.

## Site

- URL: https://misaki.love
- Framework: Astro
- Deploy: GitHub Pages + GitHub Actions

## Archive

The primary catalog has two views.

- `Level`: chart-based index. STANDARD and DELUXE charts are stored and displayed separately as `ST` and `DX`.
- `Version`: chart-release index. A song appears under every version that introduced one of its International ST or DX chart sets.
- Level index cards show AP/AP+ completion progress. Level detail pages can filter by song, artist, chart type, difficulty, internal level, and chart-release version; they can also hide completed AP/AP+ charts and order results by AP+, AP, then achievement rate.
- Version index rows show AP/AP+ progress excluding Re:MASTER charts. Version pages can be searched by song or artist and show BASIC, ADVANCED, EXPERT, and MASTER completion status for each ST/DX chart set.
- Song pages keep ST and DX chart sets in separate comparison tables. The records page supports version filtering and accumulates AP/AP+ records in their detected achievement order.
- The home record gallery shows the latest 12 entries from that AP/AP+ history. AP-to-AP+ promotions move back to the top, while percentage-only updates keep their original achievement time.

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
src/pages/songs/
src/pages/records/
```

Only the maimai archive is included in the public build. Previous blog posts, writing tools, comments, and uploaded media are not published from this repository state.

## Commands

```bash
npm install
npm run pin:circle-plus
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
- Display levels and internal constants are pinned from the complete Maishift `ASIA` chart set for `CiRCLE PLUS`. The build validates every chart so mixed-version level/constant pairs fail instead of being published.
- `npm run pin:circle-plus` intentionally replaces the version snapshot. Do not run it for an ordinary record refresh.
- Public personal records are generated from the [Maishift profile](https://maimai.shiftpsh.com/profile/elixir/home). The sync stores scores only; it does not store cookies, login data, or tokens.
- The site's `기록 갱신` button opens the repository's `Refresh Maishift records` workflow. Run it while signed in as a repository owner to import, commit, and deploy the latest public records without a local development environment.
- The same workflow checks for updates every day at 07:30 KST. It skips the commit and deployment when the public Maishift snapshot has not changed.
- `MAGiCAL` stays in the version index but remains empty until International-region charts exist in the source data.
- `npm run sync:records` refreshes achievements, ranks, combo/sync states, DX scores, and rating contribution. It also preserves the first detected AP time and only replaces it when an AP record becomes AP+.
- The FC, FC+, AP, and AP+ marks use the in-game image assets mirrored by the MIT-licensed [Lxns Network frontend](https://github.com/Lxns-Network/maimai-prober-frontend). See `THIRD_PARTY_NOTICES.md`.
- Song jackets are loaded from the metadata provider; the archive cover was generated specifically for this site.
- The project is not affiliated with SEGA.
- Do not commit tokens or other private data.
