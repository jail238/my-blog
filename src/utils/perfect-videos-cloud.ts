import { plannerCloud } from './planner-cloud';
import { normalizePerfectVideoUrl } from './perfect-videos.js';

export interface PerfectVideo {
  chart_id: string;
  url: string;
  revision: number;
  deleted_at: string | null;
  updated_at: string;
}

export async function loadPerfectVideos(chartIds: string[]): Promise<PerfectVideo[]> {
  if (!plannerCloud) throw new Error('Cloud connection required.');
  if (!chartIds.length) return [];
  const { data, error } = await plannerCloud.from('chart_perfect_videos')
    .select('chart_id,url,revision,deleted_at,updated_at').in('chart_id', chartIds);
  if (error) throw error;
  return data;
}

export async function savePerfectVideo(chartId: string, value: string, previous?: PerfectVideo) {
  if (!plannerCloud) throw new Error('Cloud connection required.');
  const url = normalizePerfectVideoUrl(value);
  const table = plannerCloud.from('chart_perfect_videos');
  const result = previous
    ? await table.update({ url, deleted_at: null }).eq('chart_id', chartId).eq('revision', previous.revision).select()
    : await table.insert({ chart_id: chartId, url }).select();
  if (result.error) throw result.error;
  if (result.data.length !== 1) throw new Error('This video changed on another device. Refresh and try again.');
  return result.data[0] as PerfectVideo;
}

export async function removePerfectVideo(previous: PerfectVideo) {
  if (!plannerCloud) throw new Error('Cloud connection required.');
  const { data, error } = await plannerCloud.from('chart_perfect_videos')
    .update({ deleted_at: new Date().toISOString() }).eq('chart_id', previous.chart_id).eq('revision', previous.revision).select();
  if (error) throw error;
  if (data.length !== 1) throw new Error('This video changed on another device. Refresh and try again.');
  return data[0] as PerfectVideo;
}
