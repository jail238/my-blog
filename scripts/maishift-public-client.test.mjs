import assert from 'node:assert/strict';
import test from 'node:test';
import { parseMaishiftRecordHistory } from './maishift-public-client.mjs';

test('parses the compact Maishift record history payload', () => {
	const payload = JSON.stringify({
		n: ['ELIXIR', 'XANAX'],
		r: [
			[133455, '2026-03-07T08:00:00.000Z', 7678, 0, -1],
			[235422, '2026-10-01T07:53:00.000Z', 14808, 1, 27],
		],
	});

	assert.deepEqual(parseMaishiftRecordHistory(payload), [
		{
			userRecordId: 133455,
			capturedAt: '2026-03-07T08:00:00.000Z',
			rating: 7678,
			name: 'ELIXIR',
			playedVersion: null,
		},
		{
			userRecordId: 235422,
			capturedAt: '2026-10-01T07:53:00.000Z',
			rating: 14808,
			name: 'XANAX',
			playedVersion: 27,
		},
	]);
});

test('parses the escaped string returned by the Maishift server function', () => {
	const payload = String.raw`{\"n\":[\"ELIXIR\"],\"r\":[[133455,1772870436807,7678,0,25]]}`;

	const [snapshot] = parseMaishiftRecordHistory(payload);

	assert.equal(snapshot.userRecordId, 133455);
	assert.equal(snapshot.name, 'ELIXIR');
	assert.equal(snapshot.capturedAt, new Date(1772870436807).toISOString());
});
