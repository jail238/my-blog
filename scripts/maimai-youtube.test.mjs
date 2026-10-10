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

test('planner chart searches keep every difficulty and encode multilingual punctuation safely', () => {
	const title = 'Song & 曲 + 노래 #1?';
	for (const [type, label] of [['STANDARD', 'スタンダード'], ['DX', 'でらっくす']]) {
		for (const difficulty of ['BASIC', 'ADVANCED', 'EXPERT', 'MASTER', 'Re:MASTER']) {
			const url = new URL(buildMaimaiYoutubeUrl(title, type, difficulty));
			assert.equal(url.origin, 'https://www.youtube.com');
			assert.equal(url.pathname, '/results');
			assert.equal(url.searchParams.get('search_query'), `maimai ${title} ${label} ${difficulty}`);
			assert.equal(url.searchParams.size, 1);
			assert.equal(url.hash, '');
		}
	}
});
