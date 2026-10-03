function normalize(value) {
	return value.normalize('NFC').trim();
}

function normalizeTitle(value) {
	return value
		.replace(/\\x([0-9a-f]{2})/gi, (_match, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
		.replace(/\\"/g, '"')
		.normalize('NFC')
		.trim();
}

function songIdentity(song) {
	return `${normalizeTitle(song.title)}\u0000${normalize(song.artist)}`;
}

function difficultyLabel(value) {
	return value === 'RE_MASTER' ? 'Re:MASTER' : value;
}

function chartId(songId, type, difficulty) {
	return `${songId}-${type.toLowerCase()}-${difficulty.toLowerCase().replace(':', '')}`;
}

function displayLevel(internalLevelTenths) {
	const baseLevel = Math.floor(internalLevelTenths / 10);
	const decimal = internalLevelTenths % 10;
	return baseLevel >= 7 && baseLevel < 15 && decimal >= 6 ? `${baseLevel}+` : String(baseLevel);
}

export function addMaishiftCatalogFallbacks(catalog, recordsData) {
	const songsByTitle = new Map();
	for (const song of catalog.songs) {
		const title = normalizeTitle(song.title);
		const matches = songsByTitle.get(title) ?? [];
		matches.push(song);
		songsByTitle.set(title, matches);
	}
	const chartKeys = new Set(
		catalog.charts.map((chart) => `${chart.songId}\u0000${chart.type}\u0000${chart.difficulty}`),
	);
	const minimumTrackIdBySongIndex = new Map();

	for (const track of recordsData.tracks) {
		const current = minimumTrackIdBySongIndex.get(track.s);
		if (current === undefined || track.i < current) minimumTrackIdBySongIndex.set(track.s, track.i);
	}

	let addedSongs = 0;
	let addedCharts = 0;
	for (const track of recordsData.tracks) {
		const sourceSong = recordsData.songs[track.s];
		if (!sourceSong) throw new Error(`Maishift track has no song: ${track.i}`);

		const normalizedTitle = normalizeTitle(sourceSong.title);
		const titleMatches = songsByTitle.get(normalizedTitle) ?? [];
		let song = titleMatches.length === 1
			? titleMatches[0]
			: titleMatches.find((candidate) => songIdentity(candidate) === songIdentity(sourceSong));
		if (!song) {
			const sourceId = minimumTrackIdBySongIndex.get(track.s);
			if (sourceId === undefined) throw new Error(`Maishift song has no tracks: ${sourceSong.title}`);
			song = {
				id: `maishift-${sourceId}`,
				sourceId,
				title: normalizeTitle(sourceSong.title),
				artist: sourceSong.artist,
				genre: sourceSong.genre,
				artworkUrl: sourceSong.jacketUrl,
				metadataSource: 'maishift',
			};
			catalog.songs.push(song);
			const matches = songsByTitle.get(normalizedTitle) ?? [];
			matches.push(song);
			songsByTitle.set(normalizedTitle, matches);
			addedSongs += 1;
		}

		const difficulty = difficultyLabel(track.d);
		const type = sourceSong.type;
		const key = `${song.id}\u0000${type}\u0000${difficulty}`;
		if (chartKeys.has(key)) continue;

		const version = catalog.versions.find((candidate) => candidate.order === sourceSong.songVersion + 1);
		if (!version) {
			throw new Error(`No catalog version for Maishift song ${sourceSong.title}: ${sourceSong.songVersion}`);
		}

		catalog.charts.push({
			id: chartId(song.id, type, difficulty),
			songId: song.id,
			type,
			difficulty,
			versionId: version.id,
			level: displayLevel(track.l),
			constant: track.l / 10,
			metadataSource: 'maishift',
		});
		chartKeys.add(key);
		addedCharts += 1;
	}

	return { addedSongs, addedCharts };
}
