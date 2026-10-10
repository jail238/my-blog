import assert from 'node:assert/strict';
import test from 'node:test';
import { entriesOnDate, hasOpenGoal, isDateKey, monthCells, normalizeSearch, recordMeetsTarget, shiftMonth, songMatches, statusChange, statusOnDate, todayInKorea } from '../src/utils/planner.js';

const entry = (overrides = {}) => ({ id: 'one', chart_id: '1051-dx-master', target: 'AP', start_date: '2026-10-10', status: 'pending', resolved_date: null, created_at: '2026-10-10T01:00:00Z', ...overrides });

test('planner search covers English, Korean translations and Japanese scripts', () => {
  assert.ok(songMatches({ title: 'Destr0yer', artist: '削除' }, 'DESTR0YER'));
  assert.ok(songMatches({ title: '春を告げる', koreanTitle: '봄을 알리다', artist: 'yama' }, '봄을알리다'));
  assert.ok(songMatches({ title: '春を告げる', koreanTitle: '봄을 알리다', artist: 'yama' }, '春を告げる'));
  assert.ok(songMatches({ title: 'ウッーウッーウマウマ(ﾟ∀ﾟ)', artist: 'Caramell' }, 'ｳｯｰｳｯｰｳﾏｳﾏ'));
  assert.ok(songMatches({ title: 'カタカナ', artist: 'Artist' }, 'かたかな'));
  assert.ok(songMatches({ title: 'Song', artist: 'Some Artist' }, 'ARTIST SONG'));
  assert.equal(songMatches({ title: 'Song' }, 'missing'), false);
  assert.equal(normalizeSearch('ＡＢＣ 　テスト'), 'abc てすと');
});

test('unresolved charts carry forward indefinitely but never appear before registration', () => {
  const open = entry();
  assert.deepEqual(entriesOnDate([open], '2026-10-09'), []);
  for (const day of ['2026-10-10', '2026-10-11', '2027-04-01']) assert.equal(entriesOnDate([open], day).length, 1);
  assert.equal(open.start_date, '2026-10-10');
});

test('completed and skipped close on their selected date without changing earlier history', () => {
  for (const status of ['completed', 'skipped']) {
    const closed = entry({ status, resolved_date: '2026-10-12' });
    assert.equal(statusOnDate(closed, '2026-10-11'), 'pending');
    assert.equal(statusOnDate(closed, '2026-10-12'), status);
    assert.equal(entriesOnDate([closed], '2026-10-12').length, 1);
    assert.equal(entriesOnDate([closed], '2026-10-13').length, 0);
  }
});

test('AP and SSS+ goals stay independent, including duplicate detection and filters', () => {
  const goals = [entry(), entry({ id: 'two', target: 'SSS+' })];
  assert.equal(entriesOnDate(goals, '2026-10-10', { target: 'AP' }).length, 1);
  assert.equal(entriesOnDate(goals, '2026-10-10', { target: 'SSS+' }).length, 1);
  assert.ok(hasOpenGoal(goals, '1051-dx-master', 'AP'));
  assert.equal(hasOpenGoal(goals, '1051-standard-master', 'AP'), false);
  assert.equal(hasOpenGoal([entry({ status: 'completed', resolved_date: '2026-10-10' })], '1051-dx-master', 'AP'), false);
  assert.equal(recordMeetsTarget({ combo: 'FC+', achievementValue: 100.9 }, 'AP'), false);
  assert.equal(recordMeetsTarget({ combo: 'FC+', achievementValue: 100.5 }, 'SSS+'), true);
  assert.equal(recordMeetsTarget({ combo: 'AP', achievementValue: 100.4 }, 'AP'), true);
  assert.equal(recordMeetsTarget({ combo: 'AP', achievementValue: 100.4 }, 'SSS+'), false);
  assert.equal(recordMeetsTarget({ combo: 'AP+', achievementValue: 101 }, 'AP'), true);
  assert.equal(recordMeetsTarget(undefined, 'AP'), false);
});

test('undo reopens the original goal and invalid status dates are rejected', () => {
  const closed = entry({ status: 'skipped', resolved_date: '2026-10-12' });
  const reopened = { ...closed, ...statusChange(closed, 'pending', '2026-10-12') };
  assert.equal(reopened.start_date, '2026-10-10');
  assert.equal(reopened.resolved_date, null);
  assert.equal(entriesOnDate([reopened], '2026-11-01').length, 1);
  assert.throws(() => statusChange(closed, 'other', '2026-10-12'));
  assert.throws(() => statusChange(closed, 'completed', '2026-10-09'));
  assert.throws(() => statusChange(closed, 'completed', '2026-02-30'));
});

test('date-only calendar handles leap years, month boundaries and KST midnight', () => {
  assert.equal(isDateKey('2028-02-29'), true);
  for (const invalid of ['2026-02-29', '2026-2-01', '2026-02-30', '2026-13-01', '', '1999-12-31']) assert.equal(isDateKey(invalid), false);
  const cells = monthCells('2028-02');
  assert.equal(cells.length, 42);
  assert.equal(new Set(cells).size, 42);
  assert.ok(cells.includes('2028-02-29'));
  assert.equal(new Date(`${cells[0]}T00:00:00Z`).getUTCDay(), 0);
  assert.equal(shiftMonth('2026-12', 1), '2027-01');
  assert.equal(shiftMonth('2026-01', -1), '2025-12');
  assert.equal(todayInKorea(new Date('2026-10-09T15:00:00Z')), '2026-10-10');
  assert.equal(todayInKorea(new Date('2026-10-09T14:59:59Z')), '2026-10-09');
  assert.deepEqual(entriesOnDate([entry()], 'bad'), []);
});

test('pending items sort first and closed status filters respect the viewed date', () => {
  const pending = entry({ id: 'pending' });
  const completed = entry({ id: 'completed', status: 'completed', resolved_date: '2026-10-11' });
  assert.deepEqual(entriesOnDate([completed, pending], '2026-10-11').map((row) => row.id), ['pending', 'completed']);
  assert.equal(entriesOnDate([completed], '2026-10-10', { status: 'pending' }).length, 1);
  assert.equal(entriesOnDate([completed], '2026-10-10', { status: 'completed' }).length, 0);
});
