export function formatKstDate(value) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return undefined;

	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone: 'Asia/Seoul',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	}).formatToParts(date);
	const partByType = new Map(parts.map((part) => [part.type, part.value]));
	return `${partByType.get('year')}.${partByType.get('month')}.${partByType.get('day')}`;
}
