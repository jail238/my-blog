const PERFECT_RANK = {
	AP: 1,
	'AP+': 2,
};

function perfectRank(combo) {
	return PERFECT_RANK[combo] ?? 0;
}

function earlierDate(first, second) {
	if (!first) return second;
	if (!second) return first;
	return Date.parse(first) <= Date.parse(second) ? first : second;
}

function existingMilestones(record) {
	const rank = perfectRank(record?.combo);
	return {
		apAchievedAt: record?.apAchievedAt ?? (rank === 1 ? record?.perfectAchievedAt : undefined),
		apPlusAchievedAt: record?.apPlusAchievedAt ?? (rank === 2 ? record?.perfectAchievedAt : undefined),
	};
}

function withMilestones(record, { apAchievedAt, apPlusAchievedAt }) {
	const {
		perfectAchievedAt: _perfectAchievedAt,
		apAchievedAt: _apAchievedAt,
		apPlusAchievedAt: _apPlusAchievedAt,
		...nextRecord
	} = record;
	const rank = perfectRank(record.combo);

	if (rank === 1 && apAchievedAt) {
		return { ...nextRecord, perfectAchievedAt: apAchievedAt, apAchievedAt };
	}
	if (rank === 2 && apPlusAchievedAt) {
		const apTime = Date.parse(apAchievedAt ?? '');
		const apPlusTime = Date.parse(apPlusAchievedAt);
		return {
			...nextRecord,
			perfectAchievedAt: apPlusAchievedAt,
			...(Number.isFinite(apTime) && apTime < apPlusTime ? { apAchievedAt } : {}),
			apPlusAchievedAt,
		};
	}
	return nextRecord;
}

export function backfillPerfectAchievementTimes(records, snapshots) {
	const targets = new Map(
		records
			.filter((record) => perfectRank(record.combo) > 0 && Number.isFinite(record.maishiftTrackId))
			.map((record) => [
				String(record.maishiftTrackId),
				{ apAchievedAt: undefined, apPlusAchievedAt: undefined },
			]),
	);

	const orderedSnapshots = [...snapshots].sort(
		(a, b) => Date.parse(a.capturedAt) - Date.parse(b.capturedAt),
	);
	for (const snapshot of orderedSnapshots) {
		for (const record of snapshot.records) {
			const target = targets.get(String(record.maishiftTrackId));
			if (!target) continue;
			if (record.combo === 'AP' && !target.apAchievedAt && !target.apPlusAchievedAt) {
				target.apAchievedAt = snapshot.capturedAt;
			}
			if (record.combo === 'AP+' && !target.apPlusAchievedAt) {
				target.apPlusAchievedAt = snapshot.capturedAt;
			}
		}
	}

	return records.map((record) => {
		const target = targets.get(String(record.maishiftTrackId));
		if (!target) return record;
		const existing = existingMilestones(record);
		return withMilestones(record, {
			apAchievedAt: earlierDate(existing.apAchievedAt, target.apAchievedAt),
			apPlusAchievedAt: earlierDate(existing.apPlusAchievedAt, target.apPlusAchievedAt),
		});
	});
}

export function annotatePerfectAchievementTimes(
	records,
	{ previousRecords = [], detectedAt, baselineAt = detectedAt },
) {
	const previousByChartId = new Map(previousRecords.map((record) => [record.chartId, record]));
	const hasPreviousSnapshot = previousRecords.length > 0;

	return records.map((record) => {
		const currentRank = perfectRank(record.combo);
		if (currentRank === 0) return withMilestones(record, {});

		const previousRecord = previousByChartId.get(record.chartId);
		const previousRank = perfectRank(previousRecord?.combo);
		const previous = existingMilestones(previousRecord);

		if (currentRank === 1) {
			const apAchievedAt = !hasPreviousSnapshot
				? baselineAt
				: previousRank >= 1
					? previous.apAchievedAt ?? baselineAt
					: detectedAt;
			return withMilestones(record, { apAchievedAt });
		}

		if (!hasPreviousSnapshot) {
			return withMilestones(record, { apPlusAchievedAt: baselineAt });
		}
		if (previousRank === 2) {
			return withMilestones(record, {
				apAchievedAt: previous.apAchievedAt,
				apPlusAchievedAt: previous.apPlusAchievedAt ?? baselineAt,
			});
		}
		if (previousRank === 1) {
			return withMilestones(record, {
				apAchievedAt: previous.apAchievedAt ?? baselineAt,
				apPlusAchievedAt: detectedAt,
			});
		}
		return withMilestones(record, { apPlusAchievedAt: detectedAt });
	});
}
