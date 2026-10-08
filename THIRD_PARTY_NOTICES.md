# Third-party notices

## Self-hosted typefaces

The site uses Poppins for display headings and Pretendard JP Variable for
body text, numbers, Korean, and Japanese. Font binaries are served locally,
with no font CDN requests from visitors. Pretendard JP's official
unicode-range subsets load only the character groups used on each page.

- Poppins by Indian Type Foundry: https://github.com/itfoundry/Poppins
  Latin WOFF2 files are distributed by Google Fonts.
- Pretendard JP v1.3.9 by Kil Hyung-jin:
  https://github.com/orioncactus/pretendard/tree/v1.3.9/packages/pretendard-jp
- Noto Sans JP by the Noto Project Authors:
  https://github.com/google/fonts/tree/main/ofl/notosansjp
  Version 2.004-H2 is subsetted to 11 symbols missing from the Pretendard JP
  files used by the catalog, plus parentheses so combining halfwidth marks
  can shape in the same font. The modified 400/700 WOFF2 faces are renamed
  Archive Symbols and only render those Unicode characters. Rebuild them
  with `python scripts/subset-symbol-fonts.py NotoSansJP.ttf` using FontTools
  with Brotli support and the official variable TTF source.

All active typefaces are licensed under the SIL Open Font License 1.1.
Full license and copyright notices are included in
`src/assets/fonts/Poppins-LICENSE.txt` and
`src/assets/fonts/Pretendard-LICENSE.txt` and
`src/assets/fonts/ArchiveSymbols-LICENSE.txt`.

Previous typeface assets retained in the repository are not loaded by the
current interface:

- SUITE by Sun: https://github.com/sun-typeface/SUITE
- Zen Kaku Gothic New by Yoshimichi Ohira and the Zen Project Authors:
  https://github.com/googlefonts/zen-kakugothic

Both previous typefaces are licensed under the SIL Open Font License 1.1. Full license
and copyright notices are included in `src/assets/fonts/SUITE-LICENSE.txt`
and `src/assets/fonts/ZenKakuGothicNew-LICENSE.txt`. The Zen Kaku Gothic New
files were losslessly converted from the Google Fonts TTF distribution to
WOFF2; no glyphs or names were changed.

## Carol extension

Korean display titles for Japanese song names are synchronized from the Carol
extension translation service:

https://github.com/team-carol/carol-extension

MIT License

Copyright (c) 2026 team-carol

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Lxns Network maimai prober frontend

The files under `public/assets/maimai/music-icon/` and the `.webp` files under
`public/assets/maimai/dx-score/` were obtained from the Lxns Network maimai
prober frontend asset mirror:

https://github.com/Lxns-Network/maimai-prober-frontend

DX score star source snapshot:

https://github.com/Lxns-Network/maimai-prober-frontend/tree/cebc0910f62780e22f8f2798c1e2216ecb6f6f11/public/assets/maimai/dx_score

MIT License

Copyright (c) 2026 Lxns-Network

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## SEGA maimai numbered DX star assets

The numbered PNG files under `public/assets/maimai/dx-score/` were obtained
from the official International maimai DX NET asset endpoint:

https://maimaidx-eng.com/maimai-mobile/img/music_icon_dxstar_1.png

The final filename number ranges from `1` through `5`.

Copyright © SEGA. The images are used to identify the corresponding DX score
star tier. This project is not affiliated with or endorsed by SEGA.

## SEGA maimai plate assets

The numbered PNG files under `public/assets/maimai/plate/` are in-game
nameplate images obtained from the Lxns Network maimai asset mirror:

https://maimai.lxns.net/docs/api/maimai

Copyright © SEGA. The images are used to identify the corresponding plate
progress goals. This project is not affiliated with or endorsed by SEGA.
