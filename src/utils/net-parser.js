export function parseNetScorePage(doc, difficulty) {
  const rows = [...doc.querySelectorAll('.w_450.m_15.p_r.f_0')];
  if (!rows.length) throw new Error(`No ${difficulty} chart list. Sign in to NET again, or retry after maintenance.`);
  const records = [];
  for (const row of rows) {
    const title = row.querySelector('.music_name_block')?.textContent?.trim();
    const scores = [...row.querySelectorAll('.music_score_block')];
    if (!scores.length) continue;
    const percent = scores.map((node) => node.textContent).find((text) => /\d+(?:\.\d+)?\s*%/.test(text));
    if (percent === undefined || title === undefined) throw new Error(`Unrecognized ${difficulty} score row. Nothing was imported.`);
    const achievementValue = Number(percent.match(/(\d+(?:\.\d+)?)\s*%/)[1]);
    const images = [...row.querySelectorAll('img')].map((img) => img.getAttribute('src') ?? '');
    const kind = images.find((src) => /music_(?:standard|dx)\./.test(src));
    const type = row.id.includes('sta_') || kind?.includes('music_standard.') ? 'STANDARD'
      : row.id.includes('dx_') || kind?.includes('music_dx.') ? 'DX' : null;
    if (!type) throw new Error('Unrecognized chart type. Nothing was imported.');
    const lamps = images.map((src) => src.match(/music_icon_(\w+)\./)?.[1]).filter(Boolean);
    const combo = ({ app: 'AP+', applus: 'AP+', ap: 'AP', fcp: 'FC+', fcplus: 'FC+', fc: 'FC' })[lamps.find((name) => /^(app|applus|ap|fcp|fcplus|fc)$/.test(name))] ?? '';
    const sync = ({ fdxp: 'FSD+', fsdp: 'FSD+', fdx: 'FSD', fsd: 'FSD', fsp: 'FS+', fs: 'FS', sync: 'SYNC' })[lamps.find((name) => /^(fdxp|fsdp|fdx|fsd|fsp|fs|sync)$/.test(name))] ?? '';
    const dxText = scores.map((node) => node.textContent).find((text) => /[\d,]+\s*\/\s*[\d,]+/.test(text));
    const dx = dxText?.match(/([\d,]+)\s*\/\s*([\d,]+)/);
    if (!dx) throw new Error(`DX score is missing for ${title}. Nothing was imported.`);
    records.push({ title, type, difficulty, achievementValue, combo, sync,
      dxScore: Number(dx[1].replaceAll(',', '')), dxScoreMax: Number(dx[2].replaceAll(',', '')) });
  }
  return records;
}

export function parseNetProfile(doc) {
  const profile = {};
  const rating = doc.querySelector('.rating_block')?.textContent?.replaceAll(',', '').trim();
  if (/^\d+$/.test(rating ?? '')) profile.rating = Number(rating);
  const badge = [...doc.querySelectorAll('img')].map((img) => img.getAttribute('src') ?? '').find((src) => /class_rank_s_\d{2}/.test(src));
  if (badge) {
    const value = Number(badge.match(/class_rank_s_(\d{2})/)[1]);
    if (value < 25) profile.className = ['B', 'A', 'S', 'SS', 'SSS'][Math.floor(value / 5)] + (5 - value % 5);
    else if (value === 25) profile.className = 'LEGEND';
  }
  for (const label of doc.querySelectorAll('th, dt, td, span, div')) {
    if (!/^(?:Total\s+)?Play\s+Count\s*:?$/i.test(label.textContent?.trim() ?? '')) continue;
    const value = label.nextElementSibling?.textContent?.replaceAll(',', '').trim();
    if (/^\d+$/.test(value ?? '')) profile.playCount = Number(value);
  }
  return profile;
}
