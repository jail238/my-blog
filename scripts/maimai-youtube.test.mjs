import assert from 'node:assert/strict';
import test from 'node:test';

import { buildMaimaiYoutubeQuery, buildMaimaiYoutubeUrl } from '../src/utils/maimai-youtube.js';

test('STANDARD chart search uses the requested Japanese chart label', () => {
	const query = buildMaimaiYoutubeQuery('天ノ弱', 'STANDARD', 'Re:MASTER');
	assert.equal(query, 'maimai 天ノ弱 スタンダード Re:MASTER');
	assert.equal(new URL(buildMaimaiYoutubeUrl('天ノ弱', 'STANDARD', 'Re:MASTER')).searchParams.get('search_query'), query);
});

test('DX chart search uses the requested Japanese chart label', () => {
	const query = buildMaimaiYoutubeQuery('春を告げる', 'DX', 'MASTER');
	assert.equal(query, 'maimai 春を告げる でらっくす MASTER');
	assert.equal(new URL(buildMaimaiYoutubeUrl('春を告げる', 'DX', 'MASTER')).searchParams.get('search_query'), query);
});

test('unknown chart types are rejected instead of producing a misleading search', () => {
	assert.throws(() => buildMaimaiYoutubeQuery('曲', 'UNKNOWN', 'MASTER'), /Unsupported maimai chart type/);
});
