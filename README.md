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

Song, chart, and play-record data are separated in `src/data/maimai.ts`. Adding data there automatically updates the level, version, and song-detail routes.

```text
src/data/maimai.ts
src/pages/levels/
src/pages/versions/
src/pages/songs/
```

Only the maimai archive is included in the public build. Previous blog posts, writing tools, comments, and uploaded media are not published from this repository state.

## Commands

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Data Notes

- Public song and level references are checked against the official maimai song list where available.
- Personal results are static entries for now.
- The cover artwork was generated specifically for the current archive and does not reuse previous uploads.
- The project is not affiliated with SEGA.
- Do not commit tokens or other private data.
