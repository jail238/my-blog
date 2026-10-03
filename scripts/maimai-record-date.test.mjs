import assert from 'node:assert/strict';
import test from 'node:test';

import { formatKstDate } from '../src/utils/maimai-record-date.js';

test('record dates are formatted in Korea Standard Time', () => {
	assert.equal(formatKstDate('2026-09-24T12:36:06.423Z'), '2026.09.24');
	assert.equal(formatKstDate('2026-09-24T16:00:00.000Z'), '2026.09.25');
});

test('invalid record dates are omitted', () => {
	assert.equal(formatKstDate('not-a-date'), undefined);
});
