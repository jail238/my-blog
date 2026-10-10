import { CHARTS, DIFFICULTIES, SONGS, versionById } from '../../data/maimai';

export function GET() {
  return new Response(JSON.stringify({
    songs: SONGS,
    charts: [...CHARTS].sort((a, b) => a.type !== b.type ? (a.type === 'STANDARD' ? -1 : 1) : DIFFICULTIES.indexOf(a.difficulty) - DIFFICULTIES.indexOf(b.difficulty)).map((chart) => ({
      id: chart.id, songId: chart.songId, type: chart.type, difficulty: chart.difficulty,
      level: chart.level, constant: chart.constant, version: versionById.get(chart.versionId)?.shortName,
      record: chart.record ? { achievement: chart.record.achievement, achievementValue: chart.record.achievementValue, combo: chart.record.combo } : undefined,
    })),
  }), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
