export function validatePlannerConfig(url, key) {
  const endpoint = url?.trim() ?? '';
  const publishableKey = key?.trim() ?? '';
  if (!endpoint && !publishableKey) return null;
  if (!endpoint || !publishableKey) throw new Error('Set both public Supabase planner variables.');
  const parsed = new URL(endpoint);
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash || !['', '/'].includes(parsed.pathname)) {
    throw new Error('Planner requires a valid HTTPS Supabase project URL.');
  }
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey)) {
    throw new Error('Planner requires a publishable Supabase key. Never use a secret or service-role key.');
  }
  return { url: parsed.origin, key: publishableKey };
}
