function publishSequence(id) {
	const match = id.match(/-(\d+)$/);
	return match ? Number(match[1]) : 0;
}

export function comparePostsNewestFirst(a, b) {
	const dateDiff = b.data.pubDate.valueOf() - a.data.pubDate.valueOf();
	if (dateDiff !== 0) {
		return dateDiff;
	}

	const sequenceDiff = publishSequence(b.id) - publishSequence(a.id);
	if (sequenceDiff !== 0) {
		return sequenceDiff;
	}

	return b.id.localeCompare(a.id, undefined, { numeric: true });
}
