import assert from 'node:assert/strict';
import test from 'node:test';
import { annotatePerfectAchievementTimes } from './perfect-achievement-history.mjs';

const baselineAt = '2026-09-24T12:36:06.423Z';
const detectedAt = '2026-09-25T22:30:00.000Z';

function record(chartId, combo, achievementValue, perfectAchievedAt) {
	return {
		chartId,
		combo,
		achievementValue,
		...(perfectAchievedAt ? { perfectAchievedAt } : {}),
	};
}

test('uses the baseline time for an existing AP record without history', () => {
	const previous = [record('chart-a', 'AP', 1008000)];
	const current = [record('chart-a', 'AP', 1009000)];

	const [result] = annotatePerfectAchievementTimes(current, {
		previousRecords: previous,
		detectedAt,
		baselineAt,
	});

	assert.equal(result.perfectAchievedAt, baselineAt);
});

test('marks a newly achieved AP at the detection time', () => {
	const previous = [record('chart-a', 'FC+', 1006000)];
	const current = [record('chart-a', 'AP', 1007000)];

	const [result] = annotatePerfectAchievementTimes(current, {
		previousRecords: previous,
		detectedAt,
		baselineAt,
	});

	assert.equal(result.perfectAchievedAt, detectedAt);
});

test('moves an AP record to the detection time only when it becomes AP+', () => {
	const previous = [record('chart-a', 'AP', 1009000, baselineAt)];
	const current = [record('chart-a', 'AP+', 1010000)];

	const [result] = annotatePerfectAchievementTimes(current, {
		previousRecords: previous,
		detectedAt,
		baselineAt,
	});

	assert.equal(result.perfectAchievedAt, detectedAt);
});

test('does not move an AP record when only its percentage increases', () => {
	const previous = [record('chart-a', 'AP', 1008000, baselineAt)];
	const current = [record('chart-a', 'AP', 1009500)];

	const [result] = annotatePerfectAchievementTimes(current, {
		previousRecords: previous,
		detectedAt,
		baselineAt,
	});

	assert.equal(result.perfectAchievedAt, baselineAt);
});

test('does not attach AP history to a non-perfect record', () => {
	const current = [record('chart-a', 'FC+', 1009000, baselineAt)];

	const [result] = annotatePerfectAchievementTimes(current, {
		previousRecords: current,
		detectedAt,
		baselineAt,
	});

	assert.equal('perfectAchievedAt' in result, false);
});
