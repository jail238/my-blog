export const NET_ORIGIN = 'https://maimaidx-eng.com';
export const COMBOS = ['', 'FC', 'FC+', 'AP', 'AP+'];
export const SYNCS = ['', 'SYNC', 'FS', 'FS+', 'FSD', 'FSD+'];
export const DIFFICULTIES = ['BASIC', 'ADVANCED', 'EXPERT', 'MASTER', 'Re:MASTER'];
const ranks = [[100.5, 'SSS+', 22.4], [100, 'SSS', 21.6], [99.5, 'SS+', 21.1], [99, 'SS', 20.8], [98, 'S+', 20.3], [97, 'S', 20], [94, 'AAA', 16.8], [90, 'AA', 15.2], [80, 'A', 13.6], [75, 'BBB', 12], [70, 'BB', 11.2], [60, 'B', 9.6], [50, 'C', 8], [0, 'D', 0]];

export function scoreRank(value) {
  return ranks.find(([threshold]) => value >= threshold)?.[1] ?? 'D';
}

export function chartRating(value, constant) {
  const factor = ranks.find(([threshold]) => value >= threshold)?.[2] ?? 0;
  return Math.floor((Number(constant) || 0) * Math.min(value, 100.5) * factor / 100 + 1e-8);
}

export function isPerfect(record) {
  return record?.combo === 'AP' || record?.combo === 'AP+';
}

export function mergePublicRecord(previous, incoming) {
  if (!incoming) return previous;
  if (!previous) return incoming;
  const best = incoming.achievementValue >= previous.achievementValue ? incoming : previous;
  const comboBest = COMBOS.indexOf(incoming.combo ?? '') > COMBOS.indexOf(previous.combo ?? '') ? incoming : previous;
  const syncBest = SYNCS.indexOf(incoming.sync ?? '') > SYNCS.indexOf(previous.sync ?? '') ? incoming : previous;
  const dxBest = incoming.dxScoreMax !== previous.dxScoreMax || incoming.dxScore > previous.dxScore ? incoming : previous;
  return {
    ...previous, ...best, combo: comboBest.combo, sync: syncBest.sync,
    dxScore: dxBest.dxScore, dxScoreMax: dxBest.dxScoreMax,
    perfectAchievedAt: comboBest.perfectAchievedAt ?? previous.perfectAchievedAt ?? incoming.perfectAchievedAt,
    apAchievedAt: previous.apAchievedAt ?? incoming.apAchievedAt,
    apPlusAchievedAt: previous.apPlusAchievedAt ?? incoming.apPlusAchievedAt,
    apDateSource: previous.apAchievedAt ? previous.apDateSource : incoming.apDateSource,
    apPlusDateSource: previous.apPlusAchievedAt ? previous.apPlusDateSource : incoming.apPlusDateSource,
  };
}

export function matchNetRecords(payload, catalog) {
  if (payload?.version !== 1 || !Array.isArray(payload.records) || payload.records.length < 1 || payload.records.length > 10000) throw new Error('Invalid or empty NET import.');
  if (!Array.isArray(payload.difficulties) || DIFFICULTIES.some((d) => !payload.difficulties.includes(d))) throw new Error('All five difficulties must be collected.');
  const songs = new Map(catalog.songs.map((song) => [song.id, song]));
  const index = new Map();
  const keyFor = (title, type, difficulty) => JSON.stringify([title.trim(), type, difficulty]);
  for (const chart of catalog.charts) {
    const song = songs.get(chart.songId);
    if (!song) continue;
    const key = keyFor(song.title, chart.type, chart.difficulty);
    index.set(key, [...(index.get(key) ?? []), chart]);
  }
  const records = Object.create(null);
  const unmatched = [];
  for (const item of payload.records) {
    if (typeof item.title !== 'string' || item.title.length > 1000 || !['STANDARD', 'DX'].includes(item.type) || !DIFFICULTIES.includes(item.difficulty)
      || typeof item.achievementValue !== 'number' || !Number.isFinite(item.achievementValue) || item.achievementValue < 0 || item.achievementValue > 101
      || Math.abs(item.achievementValue * 10000 - Math.round(item.achievementValue * 10000)) > 0.00001
      || !COMBOS.includes(item.combo) || !SYNCS.includes(item.sync)
      || !Number.isInteger(item.dxScore) || !Number.isInteger(item.dxScoreMax) || item.dxScore < 0 || item.dxScoreMax < item.dxScore || item.dxScoreMax > 100000) throw new Error('NET returned an invalid chart record. Nothing was saved.');
    const matches = index.get(keyFor(item.title, item.type, item.difficulty)) ?? [];
    if (matches.length !== 1) { unmatched.push(`${item.title} · ${item.type} ${item.difficulty}`); continue; }
    const chart = matches[0];
    if (records[chart.id]) throw new Error('Duplicate chart record. Nothing was saved.');
    records[chart.id] = {
      achievementValue: item.achievementValue, rank: scoreRank(item.achievementValue),
      rating: chartRating(item.achievementValue, chart.constant), combo: item.combo, sync: item.sync,
      dxScore: item.dxScore, dxScoreMax: item.dxScoreMax,
    };
  }
  if (!Object.keys(records).length) throw new Error('No matching charts. Update the song catalog before retrying.');
  const profile = {};
  if (payload.profile && typeof payload.profile === 'object') {
    for (const name of ['rating', 'playCount']) {
      const value = payload.profile[name];
      if (Number.isInteger(value) && value >= 0 && value <= (name === 'rating' ? 100000 : 100000000)) profile[name] = value;
    }
    if (/^(B[1-5]|A[1-5]|S[1-5]|SS[1-5]|SSS[1-5]|LEGEND)$/.test(payload.profile.className)) profile.className = payload.profile.className;
  }
  return { records, profile, unmatched };
}

export function validNetMessage(event, source, nonce, type) {
  return event.origin === NET_ORIGIN && event.source === source && event.data?.channel === 'msk-net-v1'
    && event.data.nonce === nonce && event.data.type === type;
}
