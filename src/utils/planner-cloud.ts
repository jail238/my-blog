import { createClient } from '@supabase/supabase-js';
import { validatePlannerConfig } from './planner-config.js';

export interface PlannerEntry {
  id: string;
  user_id: string;
  chart_id: string;
  target: 'AP' | 'SSS+';
  start_date: string;
  status: 'pending' | 'completed' | 'skipped';
  resolved_date: string | null;
  deleted_at: string | null;
  revision: number;
  created_at: string;
  updated_at: string;
}

const config = validatePlannerConfig(import.meta.env.PUBLIC_SUPABASE_URL, import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY);
export const plannerCloud = config ? createClient(config.url, config.key, {
  auth: { flowType: 'pkce', detectSessionInUrl: false, storageKey: 'msk-planner-auth' },
}) : null;

export async function loadPlannerEntries(userId: string): Promise<PlannerEntry[]> {
  if (!plannerCloud) throw new Error('Cloud connection required.');
  const entries: PlannerEntry[] = [];
  for (let page = 0; page < 100; page++) {
    const { data, error } = await plannerCloud.from('planner_entries').select('*').eq('user_id', userId).is('deleted_at', null)
      .order('id').range(page * 1000, page * 1000 + 999);
    if (error) throw error;
    entries.push(...data);
    if (data.length < 1000) return entries;
  }
  throw new Error('Planner is too large to load safely.');
}

export async function addPlannerEntries(userId: string, chartIds: string[], target: 'AP' | 'SSS+', date: string) {
  if (!plannerCloud) throw new Error('Cloud connection required.');
  const { data, error } = await plannerCloud.from('planner_entries')
    .insert(chartIds.map((chart_id) => ({ user_id: userId, chart_id, target, start_date: date }))).select();
  if (error) throw error;
  return data as PlannerEntry[];
}

export async function changePlannerEntry(entry: PlannerEntry, change: Partial<Pick<PlannerEntry, 'status' | 'resolved_date' | 'start_date' | 'target' | 'deleted_at'>>) {
  if (!plannerCloud) throw new Error('Cloud connection required.');
  const { data, error } = await plannerCloud.from('planner_entries').update(change)
    .eq('id', entry.id).eq('user_id', entry.user_id).eq('revision', entry.revision).select();
  if (error) throw error;
  if (data.length !== 1) throw new Error('This item changed on another device. Refresh and try again.');
  return data[0] as PlannerEntry;
}
