const DX_STAR_THRESHOLDS = Object.freeze([0.85, 0.9, 0.93, 0.95, 0.97]);

function isValidScore(score, maxScore) {
	return Number.isFinite(score) && Number.isFinite(maxScore) && score >= 0 && maxScore > 0;
}

export function getDxScoreStarCount(score, maxScore) {
	if (!isValidScore(score, maxScore)) return 0;

	return DX_STAR_THRESHOLDS.reduce(
		(stars, threshold) => stars + (score >= Math.ceil(maxScore * threshold) ? 1 : 0),
		0,
	);
}

export function getDxScorePercentage(score, maxScore) {
	if (!isValidScore(score, maxScore)) return 0;
	return Math.min(score / maxScore, 1) * 100;
}
