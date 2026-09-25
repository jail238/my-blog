const PERFECT_RANK = {
	AP: 1,
	'AP+': 2,
};

function perfectRank(combo) {
	return PERFECT_RANK[combo] ?? 0;
}

export function annotatePerfectAchievementTimes(
	records,
	{ previousRecords = [], detectedAt, baselineAt = detectedAt },
) {
	const previousByChartId = new Map(previousRecords.map((record) => [record.chartId, record]));

	return records.map((record) => {
		const { perfectAchievedAt: _stalePerfectAchievedAt, ...nextRecord } = record;
		const currentRank = perfectRank(record.combo);
		if (currentRank === 0) return nextRecord;

		const previousRecord = previousByChartId.get(record.chartId);
		const previousRank = perfectRank(previousRecord?.combo);
		const perfectAchievedAt = currentRank > previousRank
			? detectedAt
			: previousRecord?.perfectAchievedAt ?? baselineAt;

		return { ...nextRecord, perfectAchievedAt };
	});
}
