import assert from 'node:assert/strict';
import test from 'node:test';
import { finishPlannerSignIn, plannerRedirectUrl } from '../src/utils/planner-auth.js';

test('GitHub sign-in returns to the current planner without arbitrary query or fragment', () => {
  assert.equal(plannerRedirectUrl('https://misaki.love/planner/?next=https://example.com/#token'), 'https://misaki.love/planner/');
  assert.equal(plannerRedirectUrl('http://127.0.0.1:4321/planner/'), 'http://127.0.0.1:4321/planner/');
});

test('PKCE callback removes the one-time code before exchanging it once', async () => {
  const calls = [];
  await finishPlannerSignIn({ exchangeCodeForSession: async (code) => { calls.push(['exchange', code]); return { error: null }; } },
    'https://misaki.love/planner/?build=preview&code=test-code', (url) => calls.push(['replace', url]));
  assert.deepEqual(calls, [['replace', '/planner/?build=preview'], ['exchange', 'test-code']]);
});

test('ordinary visits do not attempt an OAuth code exchange', async () => {
  await finishPlannerSignIn({ exchangeCodeForSession: () => assert.fail('unexpected exchange') },
    'https://misaki.love/planner/?build=preview', () => assert.fail('unexpected URL change'));
});

test('cancelled and failed OAuth flows remove sensitive callback parameters', async () => {
  for (const callback of ['?error=access_denied&error_description=private-details', '#error=access_denied&error_description=private-details']) {
    let cleaned;
    await assert.rejects(finishPlannerSignIn({ exchangeCodeForSession: () => assert.fail('unexpected exchange') },
      `https://misaki.love/planner/${callback}`, (url) => { cleaned = url; }), /not completed/);
    assert.equal(cleaned, '/planner/');
  }
  await assert.rejects(finishPlannerSignIn({ exchangeCodeForSession: async () => ({ error: { message: 'internal-details' } }) },
    'https://misaki.love/planner/?code=expired', () => {}), /expired or failed/);
});
