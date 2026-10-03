import assert from 'node:assert/strict';
import test from 'node:test';

import { getDxScorePercentage, getDxScoreStarCount } from '../src/utils/maimai-dx-score.js';

test('DX star thresholds use the rounded-up score boundary', () => {
	const maxScore = 756;

	assert.equal(getDxScoreStarCount(642, maxScore), 0);
	assert.equal(getDxScoreStarCount(643, maxScore), 1);
	assert.equal(getDxScoreStarCount(681, maxScore), 2);
	assert.equal(getDxScoreStarCount(704, maxScore), 3);
	assert.equal(getDxScoreStarCount(719, maxScore), 4);
	assert.equal(getDxScoreStarCount(734, maxScore), 5);
});

test('719 out of 756 is displayed as four stars', () => {
	assert.equal(getDxScoreStarCount(719, 756), 4);
	assert.equal(getDxScorePercentage(719, 756).toFixed(1), '95.1');
});

test('DX star helpers handle invalid and over-max scores', () => {
	assert.equal(getDxScoreStarCount(100, 0), 0);
	assert.equal(getDxScorePercentage(100, 0), 0);
	assert.equal(getDxScoreStarCount(800, 756), 5);
	assert.equal(getDxScorePercentage(800, 756), 100);
});
