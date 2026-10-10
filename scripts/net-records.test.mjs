import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { webcrypto } from 'node:crypto';
import { parseHTML } from 'linkedom';
import { PGlite } from '@electric-sql/pglite';
import { parseNetScorePage, parseNetProfile } from '../src/utils/net-parser.js';
import { runNetCollector } from '../src/utils/net-collector.js';
import { matchNetRecords, mergePublicRecord, validNetMessage, NET_ORIGIN, DIFFICULTIES } from '../src/utils/net-records.js';
import { applyLiveRecordUi, latestPerfectCharts } from '../src/utils/live-record-render.js';

const doc = (html) => parseHTML(`<html><body>${html}</body></html>`).document;
const netRecord = (extra = {}) => ({ title: 'Song', type: 'DX', difficulty: 'MASTER', achievementValue: 100.5, combo: 'AP', sync: '', dxScore: 1900, dxScoreMax: 2000, ...extra });
const payload = (records) => ({ version: 1, difficulties: DIFFICULTIES, records });
const chart = { id: '1-dx-master', songId: '1', type: 'DX', difficulty: 'MASTER', constant: 13.5, level: '13', versionId: 'circle-plus' };
const catalog = { songs: [{ id: '1', title: 'Song', artist: 'Artist', artworkUrl: '/jacket.jpg' }], charts: [chart] };

test('NET parser extracts normalized scores across lamp variants and layouts', () => {
  for (const [lamp, combo] of [['ap', 'AP'], ['app', 'AP+'], ['applus', 'AP+'], ['fcp', 'FC+'], ['fc', 'FC'], ['back', '']]) {
    const document = doc(`<div class="w_450 m_15 p_r f_0" id="dx_1"><div class="music_name_block"> Song </div><input name="token" value="never-send"><img src="/music_dx.png"><img src="/music_icon_${lamp}.png"><img src="/music_icon_fdxp.png"><div class="music_score_block w_112">100.5000%</div><div class="music_score_block">1,900 / 2,000</div></div><div class="w_450 m_15 p_r f_0"><div class="music_name_block">Unplayed</div></div>`);
    assert.deepEqual(parseNetScorePage(document, 'MASTER'), [netRecord({ combo, sync: 'FSD+' })]);
  }
  const oldLayout = doc('<div class="w_450 m_15 p_r f_0"><div class="music_name_block">TRUST</div><img src="/music_standard.png?ver=1"><div class="music_score_block w_120">0.0000%</div><div class="music_score_block">0 / 999</div></div>');
  assert.equal(parseNetScorePage(oldLayout, 'BASIC')[0].type, 'STANDARD');
  assert.equal(parseNetScorePage(oldLayout, 'BASIC')[0].achievementValue, 0);
  assert.throws(() => parseNetScorePage(doc('<form>Sign in</form>'), 'MASTER'), /No MASTER chart list/);
  assert.throws(() => parseNetScorePage(doc('<div class="w_450 m_15 p_r f_0"><div class="music_name_block">Song</div><div class="music_score_block">new layout</div></div>'), 'MASTER'), /Unrecognized/);
});

test('profile parsing omits names, identifiers and credentials', () => {
  assert.deepEqual(parseNetProfile(doc('<div class="rating_block">14,818</div><img src="/class_rank_s_01.png"><table><tr><th>Play Count</th><td>1,041</td></tr></table><div class="name_block">Private name</div><input name="idx" value="secret">')), { rating: 14818, className: 'B4', playCount: 1041 });
});

test('matching uses exact title, type and difficulty and refuses ambiguity', () => {
  const result = matchNetRecords(payload([netRecord()]), catalog);
  assert.equal(result.records[chart.id].rating, 303);
  assert.deepEqual(result.unmatched, []);
  assert.equal(result.records[chart.id].rank, 'SSS+');
  assert.equal(Object.keys(matchNetRecords(payload([netRecord({ title: 'song' }), netRecord()]), catalog).records).length, 1);
  assert.throws(() => matchNetRecords(payload([netRecord()]), { ...catalog, charts: [...catalog.charts, { ...chart, id: '2-dx-master' }] }), /No matching/);
  assert.throws(() => matchNetRecords({ ...payload([netRecord()]), difficulties: ['MASTER'] }, catalog), /five difficulties/);
  for (const extra of [{ achievementValue: 101.1 }, { achievementValue: NaN }, { achievementValue: 100.12345 }, { combo: 'UNKNOWN' }, { dxScore: 2001 }, { dxScoreMax: null }]) assert.throws(() => matchNetRecords(payload([netRecord(extra)]), catalog), /invalid chart/);
  assert.throws(() => matchNetRecords(payload([netRecord(), netRecord()]), catalog), /Duplicate/);
  assert.deepEqual(matchNetRecords({ ...payload([netRecord()]), profile: { rating: 100, name: 'Never include', cookie: 'Never include' } }, catalog).profile, { rating: 100 });
});

test('transport rejects wrong origins, windows, nonces and message types', () => {
  const source = {};
  const event = { origin: NET_ORIGIN, source, data: { channel: 'msk-net-v1', nonce: 'nonce', type: 'RECORDS' } };
  assert.ok(validNetMessage(event, source, 'nonce', 'RECORDS'));
  for (const changed of [{ origin: 'https://evil.example' }, { source: {} }, { data: { ...event.data, nonce: 'other' } }, { data: { ...event.data, type: 'READY' } }]) assert.equal(validNetMessage({ ...event, ...changed }, source, 'nonce', 'RECORDS'), false);
});

test('standalone collector reads five lists and retries only the record message until acknowledged', async () => {
  const document = doc('');
  const messages = [];
  const requests = [];
  const listeners = new Map();
  const intervals = new Map();
  let timer = 0;
  const receiver = { closed: false, postMessage: (message, origin) => messages.push({ message, origin }) };
  const scoreHtml = '<div class="w_450 m_15 p_r f_0" id="dx_1"><div class="music_name_block">Song</div><img src="/music_icon_ap.png"><div class="music_score_block">100.5000%</div><div class="music_score_block">1,900 / 2,000</div><input name="token" value="PRIVATE_TOKEN"></div>';
  const window = { addEventListener: (name, handler) => listeners.set(name, handler), removeEventListener: (name) => listeners.delete(name), open: () => receiver };
  runInNewContext(`(${runNetCollector.toString()})(${parseNetScorePage.toString()}, ${parseNetProfile.toString()}, 'https://misaki.love')`, {
    document, window, location: { origin: NET_ORIGIN, pathname: '/maimai-mobile/home/' }, crypto: webcrypto, Uint8Array, URL, AbortController,
    DOMParser: class { parseFromString(html) { return doc(html); } },
    fetch: async (path, options) => {
      requests.push({ path, credentials: options.credentials });
      return { ok: true, url: new URL(path, NET_ORIGIN).href, text: async () => path.includes('musicGenre') ? scoreHtml : '<div class="rating_block">14,818</div><div class="name_block">PRIVATE_NAME</div>' };
    },
    setTimeout: (handler, delay) => { if (delay === 400) handler(); return ++timer; }, clearTimeout: () => {},
    setInterval: (handler) => { const id = ++timer; intervals.set(id, handler); return id; }, clearInterval: (id) => intervals.delete(id),
    alert: (message) => assert.fail(message),
  });
  document.querySelector('button').onclick();
  const onMessage = listeners.get('message');
  const base = { origin: 'https://misaki.love', source: receiver, data: { channel: 'msk-net-v1', type: 'READY' } };
  await onMessage({ ...base, data: { ...base.data, nonce: 'wrong' } });
  assert.equal(requests.length, 0);
  // The popup URL is the only place the receiver obtains the generated connection nonce.
  let connection;
  window.open = (url) => { connection = new URL(url); return receiver; };
  document.querySelector('button').onclick();
  const nonce = connection.searchParams.get('nonce');
  assert.match(nonce, /^[a-f0-9]{48}$/);
  await onMessage({ ...base, data: { ...base.data, nonce } });
  assert.equal(requests.length, 7);
  assert.deepEqual(requests.slice(0, 5).map((request) => new URL(request.path, NET_ORIGIN).searchParams.get('diff')), ['0', '1', '2', '3', '4']);
  assert.ok(requests.every((request) => request.credentials === 'same-origin'));
  assert.ok(messages.every(({ origin }) => origin === 'https://misaki.love'));
  const sent = messages.find(({ message }) => message.type === 'RECORDS').message;
  assert.deepEqual(Array.from(sent.payload.difficulties), DIFFICULTIES);
  assert.equal(sent.payload.records.length, 5);
  assert.equal(sent.payload.profile.rating, 14818);
  assert.doesNotMatch(JSON.stringify(sent), /PRIVATE_TOKEN|PRIVATE_NAME|cookie|password/);
  assert.equal(intervals.size, 1);
  [...intervals.values()][0]();
  assert.equal(messages.filter(({ message }) => message.type === 'RECORDS').length, 2);
  await onMessage({ ...base, data: { ...base.data, nonce, type: 'RECEIVED' } });
  assert.equal(intervals.size, 0);
  await onMessage({ ...base, data: { ...base.data, nonce, type: 'SAVED' } });
  assert.equal(listeners.size, 0);
  assert.match(document.querySelector('p').textContent, /Saved to M.S.K./);
});

test('live rendering refreshes home, history and plate progress and escapes untrusted titles', () => {
  const document = doc('<div data-profile-metric="rating"></div><div data-profile-metric="className"></div><div data-profile-metric="playCount"></div><div data-completed-plates></div><article data-plate-id="circle"><div class="plate-progress-summary"><span></span><b></b></div><div class="plate-progress-track"><span></span></div></article><div class="record-gallery-heading-meta"><span></span></div><div class="record-gallery-grid"></div><header class="records-page-header"><p>Records</p><p><strong></strong></p></header><div id="record-list"></div>');
  const original = { document: globalThis.document, CustomEvent: globalThis.CustomEvent };
  globalThis.document = document; globalThis.CustomEvent = document.defaultView.CustomEvent;
  try {
    applyLiveRecordUi({ ...catalog, songs: [{ ...catalog.songs[0], title: '<img src=x onerror=alert(1)> & Song' }],
      charts: [{ ...chart, record: { combo: 'AP+', achievement: '101.0000%', achievementValue: 101, rank: 'SSS+', rating: 303, dxScore: 2000, dxScoreMax: 2000 } }],
      plates: [{ id: 'circle', versionIds: ['circle-plus'], includeReMaster: false }], profile: { rating: 15000, className: 'B3', playCount: 1100 }, revision: 3 });
    assert.equal(document.querySelector('[data-profile-metric="rating"]').textContent, '15,000');
    assert.equal(document.querySelector('[data-completed-plates]').textContent, '1/1 神');
    assert.equal(document.querySelector('.plate-progress-summary').textContent, '1/1100.0%');
    assert.ok(document.querySelector('[data-plate-id]').classList.contains('is-complete'));
    assert.equal(document.querySelector('.record-gallery-heading-meta').textContent, '1 CHARTS');
    assert.equal(document.querySelectorAll('.record-list-row').length, 1);
    assert.equal(document.querySelector('.record-list-song strong').textContent, '<img src=x onerror=alert(1)> & Song');
    assert.equal(document.querySelector('[onerror]'), null);
    assert.equal(document.querySelector('.record-list-row .combo-icon').getAttribute('alt'), 'ALL PERFECT+');
  } finally { globalThis.document = original.document; globalThis.CustomEvent = original.CustomEvent; }
});

test('best scores preserve independent lamps and existing milestone dates', () => {
  const previous = { achievementValue: 100.8, achievement: '100.8000%', combo: 'AP', sync: 'FSD', dxScore: 1900, dxScoreMax: 2000, apAchievedAt: '2026-10-01T00:00:00Z', perfectAchievedAt: '2026-10-01T00:00:00Z' };
  const incoming = { achievementValue: 100.6, achievement: '100.6000%', combo: 'AP+', sync: 'FS', dxScore: 1950, dxScoreMax: 2000, apPlusAchievedAt: '2026-10-02T00:00:00Z', perfectAchievedAt: '2026-10-02T00:00:00Z' };
  const result = mergePublicRecord(previous, incoming);
  assert.equal(result.combo, 'AP+'); assert.equal(result.achievementValue, 100.8); assert.equal(result.sync, 'FSD'); assert.equal(result.dxScore, 1950);
  assert.equal(result.apAchievedAt, previous.apAchievedAt); assert.equal(result.apPlusAchievedAt, incoming.apPlusAchievedAt); assert.equal(result.perfectAchievedAt, incoming.perfectAchievedAt);
  assert.equal(mergePublicRecord(undefined, incoming).apAchievedAt, undefined);
});

test('registration order is milestone-first, not percentage-update time', () => {
  const older = { ...chart, id: '1-dx-master', record: { combo: 'AP+', achievementValue: 101, perfectAchievedAt: '2026-10-01' } };
  const newer = { ...chart, id: '2-dx-master', record: { combo: 'AP', achievementValue: 100.5, perfectAchievedAt: '2026-10-02' } };
  assert.deepEqual(latestPerfectCharts([older, newer]).map((chart) => chart.id), [newer.id, older.id]);
});

test('live rendering updates AP jackets, ratios, dates and flags without changing planner data', () => {
  const document = doc(`<main class="hall-page"><header class="catalog-page-header"><p>AP</p><h1>Hall</h1><p>0/1</p></header><div class="hall-collection"><section data-constant="13.5"><span class="hall-count">0/1</span></section></div><a data-record-progress="level" data-progress-value="13"><small data-progress-count>0/1</small></a><a class="chart-row" data-chart-id="1-dx-master"><span class="chart-record"></span></a><div data-song-record="1-dx-master"></div><div id="planner-private">Private plan unchanged</div></main>`);
  const original = { document: globalThis.document, CustomEvent: globalThis.CustomEvent };
  globalThis.document = document; globalThis.CustomEvent = document.defaultView.CustomEvent;
  try {
    const record = { achievementValue: 100.5, achievement: '100.5000%', rank: 'SSS+', combo: 'AP', rating: 303, dxScore: 1900, dxScoreMax: 2000, apAchievedAt: '2026-10-10T00:00:00Z', apDateSource: 'observed' };
    const state = { ...catalog, charts: [{ ...chart, record }], plates: [], profile: {}, revision: 2 };
    applyLiveRecordUi(state);
    assert.equal(document.querySelector('.hall-count').textContent, '1/1');
    assert.equal(document.querySelector('[data-progress-count]').textContent, '1/1');
    assert.equal(document.querySelector('.chart-row').dataset.perfect, 'true');
    assert.equal(document.querySelector('.hall-achievement').textContent, '100.5000%');
    assert.match(document.querySelector('[data-song-record]').textContent, /AP confirmed/);
    assert.equal(document.getElementById('planner-private').textContent, 'Private plan unchanged');
    applyLiveRecordUi({ ...state, revision: 3 });
    assert.equal(document.querySelectorAll('.hall-chart').length, 1);
  } finally { globalThis.document = original.document; globalThis.CustomEvent = original.CustomEvent; }
});

test('database restricts publishing to owner and atomically preserves best scores and milestones', async () => {
  const db = new PGlite();
  const first = '00000000-0000-4000-8000-000000000001';
  const second = '00000000-0000-4000-8000-000000000002';
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); insert into auth.users values ('${first}'), ('${second}'); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;`);
    await db.exec(readFileSync(new URL('../supabase/migrations/202610100003_net_records.sql', import.meta.url), 'utf8'));
    await db.exec(`insert into public.record_publishers values ('${first}'); set role authenticated; select set_config('request.jwt.claim.sub','${first}',false);`);
    const value = (extra = {}) => ({ achievementValue: 100.5, rank: 'SSS+', rating: 303, combo: 'AP', sync: 'FS', dxScore: 1900, dxScoreMax: 2000, ...extra });
    const send = (records, profile = {}) => db.query('select public.import_net_records($1::jsonb,$2::jsonb) as result', [JSON.stringify(records), JSON.stringify(profile)]);
    const get = async () => (await db.query('select * from public.record_snapshot')).rows[0];
    await send({ '1-dx-master': value() }, { rating: 14818, className: 'B4', playCount: 1041 });
    const ap = (await get()).records['1-dx-master'];
    assert.ok(ap.apAchievedAt); assert.equal(ap.apDateSource, 'observed'); assert.equal(ap.apPlusAchievedAt, undefined);
    await send({ '1-dx-master': value({ achievementValue: 100.6 }) });
    assert.equal((await get()).records['1-dx-master'].perfectAchievedAt, ap.perfectAchievedAt);
    assert.equal((await send({ '1-dx-master': value({ achievementValue: 100.55, combo: 'AP+', dxScore: 1800, sync: '' }) })).rows[0].result.milestones, 1);
    const app = (await get()).records['1-dx-master'];
    assert.equal(app.achievementValue, 100.6); assert.equal(app.combo, 'AP+'); assert.equal(app.sync, 'FS'); assert.equal(app.dxScore, 1900); assert.equal(app.apAchievedAt, ap.apAchievedAt); assert.ok(app.apPlusAchievedAt);
    const replay = await send({ '1-dx-master': value({ combo: 'FC' }) });
    assert.equal(replay.rows[0].result.changed, 0); assert.equal(replay.rows[0].result.milestones, 0);
    await send({ '2-standard-basic': value({ combo: 'AP+' }) });
    assert.equal((await get()).records['2-standard-basic'].apAchievedAt, undefined);
    const before = await get();
    for (const extra of [{ combo: null }, { sync: null }, { rank: null }, { achievementValue: null }, { rating: null }, { dxScore: null }, { dxScoreMax: null }, { dxScore: -1 }, { dxScore: 2001 }, { token: 'not allowed' }, { apAchievedAt: '2000-01-01' }]) await assert.rejects(send({ '3-dx-master': value(extra) }));
    await assert.rejects(send({ '3-dx-master': value(), invalid: value() }));
    await assert.rejects(send({}));
    await assert.rejects(send({ '3-dx-master': value() }, { user_id: second }));
    await assert.rejects(send({ '3-dx-master': value() }, { className: null }));
    assert.deepEqual((await get()).records, before.records);
    await assert.rejects(db.query("update public.record_snapshot set records='{}'"), /permission denied/);
    await assert.rejects(db.query('select * from public.record_publishers'), /permission denied/);
    await db.exec(`select set_config('request.jwt.claim.sub','${second}',false);`);
    assert.equal((await db.query('select public.can_import_net_records() as allowed')).rows[0].allowed, false);
    await assert.rejects(send({ '3-dx-master': value() }), /Only the archive owner/);
    await db.exec('reset role; set role anon;');
    assert.equal((await get()).profile.rating, 14818); assert.equal(Object.hasOwn(await get(), 'user_id'), false);
    await assert.rejects(send({ '3-dx-master': value() }), /permission denied/);
    await assert.rejects(db.query('delete from public.record_snapshot'), /permission denied/);
  } finally { await db.close(); }
});
