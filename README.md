# M.S.K.

Personal maimai record archive built with Astro.

## Site

- URL: https://misaki.love
- Framework: Astro
- Deploy: GitHub Pages + GitHub Actions

## Archive

The primary catalog has two views.

- `Level`: chart-based index. STANDARD and DELUXE charts are stored and displayed separately as `ST` and `DX`.
- `Version`: song-based index. Each song appears once under its first recorded version.

The public catalog is generated from the current International-region chart data. Public play records are imported from the Maishift profile and mapped to the same chart catalog.

```text
src/data/maimai.ts
src/data/maimai.generated.json
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
npm run sync:catalog
npm run sync:records
npm run sync:data
npm run dev
npm run build
npm run preview
```

## Data Notes

- Catalog metadata and jacket URLs are generated from [SaltMeta](https://github.com/realtvop/SaltMeta), filtered to charts available in the `intl` region.
- Public personal records are generated from the [Maishift profile](https://maimai.shiftpsh.com/profile/elixir/home). The sync stores scores only; it does not store cookies, login data, or tokens.
- The site's `기록 갱신` button opens the repository's `Refresh Maishift records` workflow. Run it while signed in as a repository owner to import, commit, and deploy the latest public records without a local development environment.
- `MAGiCAL` stays in the version index but remains empty until International-region charts exist in the source data.
- `npm run sync:records` refreshes achievements, ranks, combo/sync states, DX scores, and rating contribution.
- Song jackets are loaded from the metadata provider; the archive cover was generated specifically for this site.
- The project is not affiliated with SEGA.
- Do not commit tokens or other private data.
