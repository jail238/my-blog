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

## Legacy Posts

The existing Markdown blog and writing tools remain available under `/blog/` and `/write/`, but they are not part of the primary archive navigation.

Blog posts are stored in:

```text
src/content/blog/
```

Media files are stored in:

```text
public/media/
```

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
- The project is not affiliated with SEGA.
- Do not commit tokens or other private data.
