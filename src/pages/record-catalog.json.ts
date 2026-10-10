import { CHARTS, SONGS, PLAYER_PROFILE } from '../data/maimai';
import { PLATE_GROUPS } from '../data/plates';

export function GET() {
  const charts = CHARTS.map(({ record, ...chart }) => {
    if (!record) return chart;
    const { maishiftTrackId, ...publicRecord } = record;
    return { ...chart, record: publicRecord };
  });
  return new Response(JSON.stringify({ songs: SONGS, charts, plates: PLATE_GROUPS,
    profile: { rating: PLAYER_PROFILE.rating, playCount: PLAYER_PROFILE.playCount, className: 'B4' } }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
