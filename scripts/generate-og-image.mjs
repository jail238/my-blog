import sharp from 'sharp';

const svg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.55" stop-color="#f7f8fa"/>
      <stop offset="1" stop-color="#edf1f5"/>
    </linearGradient>
    <linearGradient id="panel" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#f4f6f8"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="26" stdDeviation="30" flood-color="#9aa4b2" flood-opacity="0.22"/>
    </filter>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="118" y="92" width="964" height="446" rx="54" fill="url(#panel)" stroke="#dfe5ec" filter="url(#shadow)"/>
  <text x="190" y="208" fill="#8b96a5" font-size="34" font-family="Arial, sans-serif" font-weight="700" letter-spacing="6">M.S.K.</text>
  <text x="186" y="318" fill="#202938" font-size="86" font-family="Arial, sans-serif" font-weight="800">Misaki Archive</text>
  <text x="190" y="390" fill="#667386" font-size="32" font-family="Arial, sans-serif">archive of misaki.</text>
  <rect x="190" y="442" width="186" height="54" rx="27" fill="#eef2f6" stroke="#dce3eb"/>
  <text x="232" y="477" fill="#566273" font-size="24" font-family="Arial, sans-serif" font-weight="700">misaki.love</text>
</svg>
`;

await sharp(Buffer.from(svg)).png().toFile('public/og-image.png');
