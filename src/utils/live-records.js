import { validatePlannerConfig } from './planner-config.js';
import { mergePublicRecord } from './net-records.js';

const config = validatePlannerConfig(import.meta.env.PUBLIC_SUPABASE_URL, import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY);
let catalogPromise;
let latest;
let lastAttempt = 0;
let loading;
const listeners = new Set();

export function getRecordCatalog() {
  if (!catalogPromise) catalogPromise = fetch('/record-catalog.json').then((response) => {
    if (!response.ok) throw new Error('Record catalog unavailable');
    return response.json();
  }).catch((error) => { catalogPromise = undefined; throw error; });
  return catalogPromise;
}

export function onLiveRecords(listener) {
  listeners.add(listener);
  if (latest) listener(latest);
  return () => listeners.delete(listener);
}

export async function refreshLiveRecords(force = false) {
  if (!config || loading || (!force && Date.now() - lastAttempt < 30000)) return loading;
  lastAttempt = Date.now();
  loading = (async () => {
    try {
      if (latest) {
        const revisionResponse = await fetch(`${config.url}/rest/v1/record_snapshot?select=revision&id=eq.true`, {
          headers: { apikey: config.key }, signal: AbortSignal.timeout(12000), cache: 'no-store',
        });
        if (!revisionResponse.ok) return;
        const [revision] = await revisionResponse.json();
        if (revision?.revision === latest.revision) return;
      }
      const response = await fetch(`${config.url}/rest/v1/record_snapshot?select=records,profile,revision,updated_at&id=eq.true`, {
        headers: { apikey: config.key }, signal: AbortSignal.timeout(12000), cache: 'no-store',
      });
      if (!response.ok) return;
      const [snapshot] = await response.json();
      if (!snapshot?.updated_at || snapshot.revision === latest?.revision || typeof snapshot.records !== 'object') return;
      const catalog = await getRecordCatalog();
      const charts = catalog.charts.map((chart) => ({ ...chart, record: mergePublicRecord(chart.record, snapshot.records[chart.id]) }));
      latest = { ...catalog, charts, profile: { ...catalog.profile, ...snapshot.profile }, revision: snapshot.revision, updatedAt: snapshot.updated_at };
      for (const listener of listeners) {
        try { listener(latest); } catch (error) { console.error('Could not update a record view.', error); }
      }
    } catch { /* Keep the build-time archive when the server is unreachable. */ }
    finally { loading = undefined; }
  })();
  return loading;
}

export function startLiveRecords() {
  refreshLiveRecords();
  const visibleRefresh = () => { if (document.visibilityState === 'visible') refreshLiveRecords(); };
  window.addEventListener('focus', visibleRefresh);
  document.addEventListener('visibilitychange', visibleRefresh);
  let timer;
  let channel;
  const resume = () => {
    clearInterval(timer);
    channel?.close();
    timer = setInterval(visibleRefresh, 300000);
    try { channel = new BroadcastChannel('msk-records'); channel.onmessage = () => refreshLiveRecords(true); } catch {}
  };
  resume();
  window.addEventListener('pageshow', (event) => { if (event.persisted) { resume(); visibleRefresh(); } });
  window.addEventListener('pagehide', () => { clearInterval(timer); channel?.close(); });
}
