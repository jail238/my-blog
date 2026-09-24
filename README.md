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

The public catalog is generated from the current International-region chart data. Personal play records remain as local overrides in `src/data/maimai.ts`.

```text
src/data/maimai.ts
src/data/maimai.generated.json
scripts/sync-maimai-catalog.mjs
src/pages/levels/
src/pages/versions/
src/pages/songs/
```

Only the maimai archive is included in the public build. Previous blog posts, writing tools, comments, and uploaded media are not published from this repository state.

## Commands

```bash
npm install
npm run sync:catalog
npm run dev
npm run build
npm run preview
```

## Data Notes

- Catalog metadata and jacket URLs are generated from [SaltMeta](https://github.com/realtvop/SaltMeta), filtered to charts available in the `intl` region.
- `MAGiCAL` stays in the version index but remains empty until International-region charts exist in the source data.
- Personal results are static entries for now.
- Song jackets are loaded from the metadata provider; the archive cover was generated specifically for this site.
- The project is not affiliated with SEGA.
- Do not commit tokens or other private data.
