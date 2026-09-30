const TYPE_SEARCH_LABELS = Object.freeze({
	STANDARD: 'スタンダード',
	DX: 'でらっくす',
});

export function buildMaimaiYoutubeQuery(title, type, difficulty) {
	const typeLabel = TYPE_SEARCH_LABELS[type];
	if (!typeLabel) throw new Error(`Unsupported maimai chart type: ${type}`);
	return `maimai ${title} ${typeLabel} ${difficulty}`;
}

export function buildMaimaiYoutubeUrl(title, type, difficulty) {
	const params = new URLSearchParams({
		search_query: buildMaimaiYoutubeQuery(title, type, difficulty),
	});
	return `https://www.youtube.com/results?${params.toString()}`;
}
