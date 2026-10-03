const PERFECT_RANK = {
	AP: 1,
	'AP+': 2,
};

function perfectRank(combo) {
	return PERFECT_RANK[combo] ?? 0;
}

export function backfillPerfectAchievementTimes(records, snapshots) {
	const targets = new Map(
		records
			.filter((record) => perfectRank(record.combo) > 0 && Number.isFinite(record.maishiftTrackId))
			.map((record) => [
				String(record.maishiftTrackId),
				{ targetRank: perfectRank(record.combo), capturedAt: undefined },
			]),
	);

	const orderedSnapshots = [...snapshots].sort(
		(a, b) => Date.parse(a.capturedAt) - Date.parse(b.capturedAt),
	);
	for (const snapshot of orderedSnapshots) {
		for (const record of snapshot.records) {
			const target = targets.get(String(record.maishiftTrackId));
			if (!target || target.capturedAt || perfectRank(record.combo) < target.targetRank) continue;
			target.capturedAt = snapshot.capturedAt;
		}
	}

	return records.map((record) => {
		const capturedAt = targets.get(String(record.maishiftTrackId))?.capturedAt;
		if (!capturedAt) return record;

		const existingTime = Date.parse(record.perfectAchievedAt ?? '');
		const capturedTime = Date.parse(capturedAt);
		if (Number.isFinite(existingTime) && existingTime <= capturedTime) return record;
		return { ...record, perfectAchievedAt: capturedAt };
	});
}

export function annotatePerfectAchievementTimes(
	records,
	{ previousRecords = [], detectedAt, baselineAt = detectedAt },
) {
	const previousByChartId = new Map(previousRecords.map((record) => [record.chartId, record]));
	const hasPreviousSnapshot = previousRecords.length > 0;

	return records.map((record) => {
		const { perfectAchievedAt: _stalePerfectAchievedAt, ...nextRecord } = record;
		const currentRank = perfectRank(record.combo);
		if (currentRank === 0) return nextRecord;

		const previousRecord = previousByChartId.get(record.chartId);
		const previousRank = perfectRank(previousRecord?.combo);
		const perfectAchievedAt = !hasPreviousSnapshot
			? baselineAt
			: currentRank > previousRank
			? detectedAt
			: previousRecord?.perfectAchievedAt ?? baselineAt;

		return { ...nextRecord, perfectAchievedAt };
	});
}
