export function isJacketFile(file) {
	return typeof file === 'string' && /^[a-f0-9]{2}\/[a-f0-9]{64}\.webp$/.test(file) && file.slice(0, 2) === file.slice(3, 5);
}

export function withLocalJackets(songs, manifest, base = '/') {
	if (manifest.version !== 1) throw new Error('Unsupported jacket manifest version');
	const prefix = base.endsWith('/') ? base : `${base}/`;
	return songs.map((song) => {
		const entry = manifest.jackets[song.id];
		if (!entry || !isJacketFile(entry.file) || entry.sourceUrl !== song.artworkUrl) {
			throw new Error(`Missing or outdated local jacket for ${song.id}; run npm run sync:jackets`);
		}
		return { ...song, artworkUrl: `${prefix}assets/maimai/jackets/${entry.file}` };
	});
}
