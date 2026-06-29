# M.S.K.

Misaki Archive.

Astro와 GitHub Pages로 운영하는 개인 블로그입니다.

## Site

- URL: https://misaki.love
- Framework: Astro
- Deploy: GitHub Pages + GitHub Actions
- Categories: 수학, 운동, 일상, 음악

## Writing

글은 Markdown 파일로 관리합니다.

```text
src/content/blog/
```

파일 이름은 날짜, 분류, 중복 방지 값을 포함합니다.

```text
YYYY-MM-DD-category-HHMMSS.md
YYYY-MM-DD-category-issueNumber.md
```

기본 frontmatter 예시는 다음과 같습니다.

```md
---
title: '글 제목'
description: '짧은 설명'
category: 'life'
tags: ['일상']
pubDate: 2026-06-25
---

본문
```

## Media

사진과 영상 파일은 `public/media/`에 둡니다.

본문에서는 아래처럼 불러옵니다. 한 줄에 `/media/파일명` 또는 `public/media/파일명`만 적어도 자동으로 표시됩니다.

```md
public/media/photo.jpg

/media/movie.mp4
```

YouTube 링크는 한 줄에 따로 적으면 자동으로 영상 플레이어로 표시됩니다.

```text
https://youtu.be/VIDEO_ID
```

## Comments

댓글은 giscus를 사용하며 GitHub Discussions에 저장됩니다.

## Commands

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Notes

- 수식 렌더링은 KaTeX를 사용합니다.
- 사이트맵과 RSS는 빌드 시 생성됩니다.
- 공개 저장소이므로 민감한 정보는 커밋하지 않습니다.
