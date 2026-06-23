# my-blog

개발, 수학, 공부, 독서, 러닝 기록을 남기는 개인 블로그입니다.

## Stack

- Astro
- Markdown/MDX
- GitHub Pages

## Categories

- 개발 기록
- 수학 기록
- 공부 기록
- 독서 기록
- 러닝 기록

## Project Structure

```text
public/
src/
  components/
  content/blog/
  layouts/
  pages/
astro.config.mjs
package.json
```

## Commands

```sh
npm run dev
npm run build
npm run preview
```

PowerShell에서 `npm.ps1` 실행 정책 문제가 나면 `npm.cmd run dev`처럼 `npm.cmd`를 사용합니다.

## Writing

새 글은 `src/content/blog/` 아래에 Markdown 파일로 추가합니다.

```md
---
title: '글 제목'
description: '짧은 설명'
category: 'math'
tags: ['수학']
pubDate: 2026-06-23
---

본문
```

사용 가능한 category:

- `development`
- `math`
- `study`
- `reading`
- `running`
