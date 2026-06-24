# M.S.K.

남는 것은 결국 아카이브.

## Stack

- Astro
- Markdown/MDX
- GitHub Pages

## Categories

- 수학
- 운동
- 일상

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
npm.cmd run dev
npm.cmd run build
npm.cmd run preview
```

PowerShell에서 `npm.ps1` 실행 정책 문제가 생기면 `npm.cmd`를 사용한다.

## Writing

글은 `src/content/blog/` 아래에 Markdown 파일로 추가한다.

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

- `math`
- `exercise`
- `life`
