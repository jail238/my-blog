const artworkOverrides = new Map([
	// Same official jacket filename, mirrored by https://maimai-songs.zetaraku.dev/songs/OV3RCLOCK.
	['OV3RCLOCK\u0000Alicemetix', 'https://dp4p6x0xfi5o9.cloudfront.net/maimai/img/cover/ed2b18829927219282dd0047513bbbbcfc7099d7bbd90cc7e6eb4c4be467fc43.png'],
]);

export function catalogArtworkUrl(title, artist, fallbackUrl) {
	const identity = `${title.normalize('NFC').trim()}\u0000${artist.normalize('NFC').trim()}`;
	return artworkOverrides.get(identity) ?? fallbackUrl;
}
