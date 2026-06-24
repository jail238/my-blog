export function comparePostsNewestFirst(a, b) {
	const dateDiff = b.data.pubDate.valueOf() - a.data.pubDate.valueOf();
	if (dateDiff !== 0) {
		return dateDiff;
	}

	return b.id.localeCompare(a.id, undefined, { numeric: true });
}
