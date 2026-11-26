import { addMaishiftCatalogFallbacks } from './maishift-catalog-fallback.mjs';

export function normalizeCatalogTitle(value) {
	return value.replace(/\\x([0-9a-f]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
		.replace(/\\"/g, '"').normalize('NFC').trim();
}

function identityOf(song) {
	return { title: normalizeCatalogTitle(song.title), artist: song.artist.normalize('NFC').trim() };
}

function identityKey(song) {
	const { title, artist } = identityOf(song);
	return JSON.stringify([title, artist]);
}

// Keep source identifiers separate from the permanent IDs used by URLs and cloud video links.
export class CatalogIdentities {
	constructor(catalog, stored = { version: 1, songs: [] }) {
		if (stored.version !== 1 || !Array.isArray(stored.songs)) throw new Error('Invalid catalog identity registry.');
		this.entries = new Map();
		this.sources = new Map();
		this.names = new Map();
		this.titles = new Map();
		for (const row of stored.songs) {
			if (this.entries.has(row.id) || !row.identities?.length || !Array.isArray(row.sources)) {
				throw new Error('Invalid or duplicate stored catalog identity.');
			}
			const entry = { id: row.id, sources: [], identities: [] };
			this.entries.set(row.id, entry);
			for (const name of row.identities) this.addName(entry, name);
			for (const key of row.sources) this.addSource(entry, key);
		}
		for (const song of catalog?.songs ?? []) {
			const fallback = /^maishift-(\d+)$/.exec(song.id);
			const sources = fallback ? [`track:${fallback[1]}`] : [];
			if (Number.isSafeInteger(song.sourceId) && (!fallback || Number(fallback[1]) !== song.sourceId)) sources.push(`salt:${song.sourceId}`);
			this.resolve(song, sources, song.id);
		}
	}

	addName(entry, song) {
		const name = identityOf(song);
		const key = identityKey(name);
		if (entry.identities.some((old) => identityKey(old) === key)) return;
		entry.identities.push(name);
		for (const [map, value] of [[this.names, key], [this.titles, name.title]]) {
			const ids = map.get(value) ?? new Set();
			ids.add(entry.id);
			map.set(value, ids);
		}
	}

	addSource(entry, key) {
		const old = this.sources.get(key);
		if (old && old !== entry.id) throw new Error(`Conflicting catalog source identity: ${key}`);
		this.sources.set(key, entry.id);
		if (!entry.sources.includes(key)) entry.sources.push(key);
	}

	resolve(song, sources, preferredId, allowTitleMatch = false) {
		const matches = new Set(sources.map((key) => this.sources.get(key)).filter(Boolean));
		if (matches.size > 1) throw new Error(`Ambiguous catalog source identity: ${song.title}`);
		let id = [...matches][0];
		const names = this.names.get(identityKey(song)) ?? new Set();
		if (!id) {
			const candidates = names.size ? names : allowTitleMatch ? this.titles.get(identityOf(song).title) ?? new Set() : names;
			if (candidates.size > 1) throw new Error(`Ambiguous catalog song identity: ${song.title}`);
			id = [...candidates][0];
		} else if (names.size && !names.has(id)) {
			throw new Error(`Conflicting catalog song identity: ${song.title}`);
		}
		if (!id) {
			if (this.entries.has(preferredId)) throw new Error(`Catalog ID cannot be reassigned: ${preferredId}`);
			id = preferredId;
			this.entries.set(id, { id, sources: [], identities: [] });
		}
		const entry = this.entries.get(id);
		for (const key of sources) this.addSource(entry, key);
		this.addName(entry, song);
		return id;
	}

	saltSong(song) {
		return this.resolve(song, [`salt:${song.id}`], String(song.id));
	}

	maishiftSong(song, tracks) {
		const ids = tracks.map((track) => track.i);
		return this.resolve(song, ids.map((id) => `track:${id}`), `maishift-${Math.min(...ids)}`, true);
	}

	toJSON() {
		return {
			version: 1,
			songs: [...this.entries.values()].map((row) => ({
				id: row.id,
				sources: [...row.sources].sort(),
				identities: [...row.identities].sort((a, b) => identityKey(a).localeCompare(identityKey(b), 'en')),
			})).sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true })),
		};
	}
}

export function reconcileCatalogRoster(catalog, recordsData, identities) {
	if (!Array.isArray(recordsData.songs) || !Array.isArray(recordsData.tracks) || recordsData.tracks.length === 0) {
		throw new Error('Refusing an empty or malformed active Maishift catalog.');
	}
	const tracksBySong = new Map();
	const trackIds = new Set();
	for (const track of recordsData.tracks) {
		const song = recordsData.songs[track.s];
		if (!song || !['STANDARD', 'DX'].includes(song.type) ||
			!['BASIC', 'ADVANCED', 'EXPERT', 'MASTER', 'RE_MASTER'].includes(track.d) ||
			!Number.isSafeInteger(track.i) || track.i < 1 || trackIds.has(track.i) ||
			!Number.isInteger(track.l) || track.l < 10 || track.l > 150) {
			throw new Error('Invalid or duplicate active Maishift chart.');
		}
		trackIds.add(track.i);
		const tracks = tracksBySong.get(track.s) ?? [];
		tracks.push(track);
		tracksBySong.set(track.s, tracks);
	}
	const ids = new Map([...tracksBySong].map(([index, tracks]) => [
		recordsData.songs[index], identities.maishiftSong(recordsData.songs[index], tracks),
	]));
	addMaishiftCatalogFallbacks(catalog, recordsData, { resolveSongId: (song) => ids.get(song) });
	const active = new Set(recordsData.tracks.map((track) => {
		const song = recordsData.songs[track.s];
		const difficulty = track.d === 'RE_MASTER' ? 'Re:MASTER' : track.d;
		return JSON.stringify([ids.get(song), song.type, difficulty]);
	}));
	catalog.charts = catalog.charts.filter((chart) => active.has(JSON.stringify([chart.songId, chart.type, chart.difficulty])));
	const songIds = new Set(catalog.charts.map((chart) => chart.songId));
	catalog.songs = catalog.songs.filter((song) => songIds.has(song.id));
	if (catalog.charts.length !== recordsData.tracks.length) throw new Error('Active catalog chart coverage mismatch.');
}

export function validateCatalogTransition(previous, next) {
	if (!next.songs.length || !next.charts.length) throw new Error('Refusing an empty catalog.');
	const songIds = new Set(next.songs.map((song) => song.id));
	const chartIds = new Set(next.charts.map((chart) => chart.id));
	if (songIds.size !== next.songs.length || chartIds.size !== next.charts.length ||
		next.charts.some((chart) => !songIds.has(chart.songId))) throw new Error('Invalid catalog references or duplicate IDs.');
	const removedSongs = (previous?.songs ?? []).filter((song) => !songIds.has(song.id));
	const removedCharts = (previous?.charts ?? []).filter((chart) => !chartIds.has(chart.id));
	if (removedSongs.length > Math.max(5, (previous?.songs.length ?? 0) * 0.05) ||
		removedCharts.length > Math.max(20, (previous?.charts.length ?? 0) * 0.05)) {
		throw new Error(`Refusing suspicious catalog loss: ${removedSongs.length} songs, ${removedCharts.length} charts. Existing publication is preserved.`);
	}
	const previousSongs = new Set((previous?.songs ?? []).map((song) => song.id));
	const previousCharts = new Set((previous?.charts ?? []).map((chart) => chart.id));
	return {
		addedSongs: next.songs.filter((song) => !previousSongs.has(song.id)).length,
		addedCharts: next.charts.filter((chart) => !previousCharts.has(chart.id)).length,
		removedSongs: removedSongs.length,
		removedCharts: removedCharts.length,
	};
}

export function archivedCatalogRecords(previous, current) {
	const active = new Set(current.map((record) => record.chartId));
	const history = new Map([...(previous?.archivedRecords ?? []), ...(previous?.records ?? [])]
		.map((record) => [record.chartId, record]));
	return [...history.values()].filter((record) => !active.has(record.chartId))
		.sort((a, b) => a.chartId.localeCompare(b.chartId, 'en', { numeric: true }));
}
