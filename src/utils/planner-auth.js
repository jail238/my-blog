const callbackKeys = ['code', 'error', 'error_code', 'error_description'];

export function plannerRedirectUrl(href) {
  const url = new URL(href);
  url.search = '';
  url.hash = '';
  return url.href;
}

export async function finishPlannerSignIn(auth, href, replaceUrl) {
  const url = new URL(href);
  const hash = new URLSearchParams(url.hash.slice(1));
  const code = url.searchParams.get('code');
  const failed = url.searchParams.has('error') || hash.has('error');
  const isCallback = callbackKeys.some((key) => url.searchParams.has(key) || hash.has(key));
  if (!isCallback) return;

  for (const key of callbackKeys) url.searchParams.delete(key);
  url.hash = '';
  replaceUrl(`${url.pathname}${url.search}`);
  if (failed || !code) throw new Error('GitHub sign-in was not completed. Please try again.');

  const { error } = await auth.exchangeCodeForSession(code);
  if (error) throw new Error('GitHub sign-in expired or failed. Please sign in again.');
}
