import assert from 'node:assert/strict';
import test from 'node:test';
import {
	annotatePerfectAchievementTimes,
	backfillPerfectAchievementTimes,
} from './perfect-achievement-history.mjs';

const baselineAt = '2026-09-24T12:36:06.423Z';
const detectedAt = '2026-09-25T22:30:00.000Z';

function record(chartId, combo, achievementValue, dates = {}) {
	return { chartId, combo, achievementValue, ...dates };
}

test('uses the profile baseline for the first imported AP snapshot', () => {
	const current = [record('chart-a', 'AP', 1009000)];
	const [result] = annotatePerfectAchievementTimes(current, {
		previousRecords: [],
		detectedAt,
		baselineAt,
	});

	assert.equal(result.perfectAchievedAt, baselineAt);
	assert.equal(result.apAchievedAt, baselineAt);
	assert.equal('apPlusAchievedAt' in result, false);
});

test('treats an initial AP+ snapshot as a direct AP+ achievement', () => {
	const current = [record('chart-a', 'AP+', 1010000)];
	const [result] = annotatePerfectAchievementTimes(current, {
		previousRecords: [],
		detectedAt,
		baselineAt,
	});

	assert.equal(result.perfectAchievedAt, baselineAt);
	assert.equal('apAchievedAt' in result, false);
	assert.equal(result.apPlusAchievedAt, baselineAt);
});

test('migrates a legacy AP date without moving it', () => {
	const previous = [record('chart-a', 'AP', 1008000, { perfectAchievedAt: baselineAt })];
	const current = [record('chart-a', 'AP', 1009000)];
	const [result] = annotatePerfectAchievementTimes(current, {
		previousRecords: previous,
		detectedAt,
		baselineAt,
	});

	assert.equal(result.perfectAchievedAt, baselineAt);
	assert.equal(result.apAchievedAt, baselineAt);
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
	assert.equal(result.apAchievedAt, detectedAt);
});

test('preserves AP and adds a separate AP+ date on promotion', () => {
	const previous = [record('chart-a', 'AP', 1009000, {
		perfectAchievedAt: baselineAt,
		apAchievedAt: baselineAt,
	})];
	const current = [record('chart-a', 'AP+', 1010000)];
	const [result] = annotatePerfectAchievementTimes(current, {
		previousRecords: previous,
		detectedAt,
		baselineAt,
	});

	assert.equal(result.perfectAchievedAt, detectedAt);
	assert.equal(result.apAchievedAt, baselineAt);
	assert.equal(result.apPlusAchievedAt, detectedAt);
});

test('does not invent an AP date when a chart goes directly to AP+', () => {
	const previous = [record('chart-a', 'FC+', 1006000)];
	const current = [record('chart-a', 'AP+', 1010000)];
	const [result] = annotatePerfectAchievementTimes(current, {
		previousRecords: previous,
		detectedAt,
		baselineAt,
	});

	assert.equal(result.perfectAchievedAt, detectedAt);
	assert.equal('apAchievedAt' in result, false);
	assert.equal(result.apPlusAchievedAt, detectedAt);
});

test('does not move an AP date when only its percentage increases', () => {
	const previous = [record('chart-a', 'AP', 1008000, {
		perfectAchievedAt: baselineAt,
		apAchievedAt: baselineAt,
	})];
	const current = [record('chart-a', 'AP', 1009500)];
	const [result] = annotatePerfectAchievementTimes(current, {
		previousRecords: previous,
		detectedAt,
		baselineAt,
	});

	assert.equal(result.perfectAchievedAt, baselineAt);
	assert.equal(result.apAchievedAt, baselineAt);
});

test('does not attach perfect history to a non-perfect record', () => {
	const current = [record('chart-a', 'FC+', 1009000, {
		perfectAchievedAt: baselineAt,
		apAchievedAt: baselineAt,
		apPlusAchievedAt: detectedAt,
	})];
	const [result] = annotatePerfectAchievementTimes(current, {
		previousRecords: current,
		detectedAt,
		baselineAt,
	});

	assert.equal('perfectAchievedAt' in result, false);
	assert.equal('apAchievedAt' in result, false);
	assert.equal('apPlusAchievedAt' in result, false);
});

test('backfills an AP from the first exact AP snapshot', () => {
	const current = [{
		...record('chart-a', 'AP', 1009000, { perfectAchievedAt: detectedAt, apAchievedAt: detectedAt }),
		maishiftTrackId: 10,
	}];
	const snapshots = [
		{ capturedAt: '2026-03-03T00:00:00.000Z', records: [{ maishiftTrackId: 10, combo: 'AP' }] },
		{ capturedAt: '2026-03-01T00:00:00.000Z', records: [{ maishiftTrackId: 10, combo: 'FC+' }] },
	];
	const [result] = backfillPerfectAchievementTimes(current, snapshots);

	assert.equal(result.perfectAchievedAt, '2026-03-03T00:00:00.000Z');
	assert.equal(result.apAchievedAt, '2026-03-03T00:00:00.000Z');
});

test('backfills separate AP and AP+ dates from promotion history', () => {
	const current = [{
		...record('chart-a', 'AP+', 1010000, { perfectAchievedAt: detectedAt, apPlusAchievedAt: detectedAt }),
		maishiftTrackId: 10,
	}];
	const snapshots = [
		{ capturedAt: '2026-03-01T00:00:00.000Z', records: [{ maishiftTrackId: 10, combo: 'AP' }] },
		{ capturedAt: '2026-03-05T00:00:00.000Z', records: [{ maishiftTrackId: 10, combo: 'AP+' }] },
	];
	const [result] = backfillPerfectAchievementTimes(current, snapshots);

	assert.equal(result.perfectAchievedAt, '2026-03-05T00:00:00.000Z');
	assert.equal(result.apAchievedAt, '2026-03-01T00:00:00.000Z');
	assert.equal(result.apPlusAchievedAt, '2026-03-05T00:00:00.000Z');
});

test('backfills only AP+ when the first perfect snapshot is already AP+', () => {
	const current = [{
		...record('chart-a', 'AP+', 1010000, { perfectAchievedAt: detectedAt, apPlusAchievedAt: detectedAt }),
		maishiftTrackId: 10,
	}];
	const snapshots = [
		{ capturedAt: '2026-03-01T00:00:00.000Z', records: [{ maishiftTrackId: 10, combo: 'FC+' }] },
		{ capturedAt: '2026-03-05T00:00:00.000Z', records: [{ maishiftTrackId: 10, combo: 'AP+' }] },
	];
	const [result] = backfillPerfectAchievementTimes(current, snapshots);

	assert.equal(result.perfectAchievedAt, '2026-03-05T00:00:00.000Z');
	assert.equal('apAchievedAt' in result, false);
	assert.equal(result.apPlusAchievedAt, '2026-03-05T00:00:00.000Z');
});

test('keeps an existing AP milestone when fetched history is later', () => {
	const current = [{
		...record('chart-a', 'AP', 1009000, {
			perfectAchievedAt: '2026-03-02T00:00:00.000Z',
			apAchievedAt: '2026-03-02T00:00:00.000Z',
		}),
		maishiftTrackId: 10,
	}];
	const snapshots = [
		{ capturedAt: '2026-03-03T00:00:00.000Z', records: [{ maishiftTrackId: 10, combo: 'AP' }] },
	];
	const [result] = backfillPerfectAchievementTimes(current, snapshots);

	assert.equal(result.perfectAchievedAt, '2026-03-02T00:00:00.000Z');
	assert.equal(result.apAchievedAt, '2026-03-02T00:00:00.000Z');
});
