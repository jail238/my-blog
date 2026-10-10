import { validatePlannerConfig } from '../src/utils/planner-config.js';

try {
  const config = validatePlannerConfig(process.env.PUBLIC_SUPABASE_URL, process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  if (!config) throw new Error('Set both public Supabase planner variables before publishing.');
  console.log('Planner cloud configuration valid.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
