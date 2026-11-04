export function catalogGenre(title, artist, genre) {
	// SEGA lists this song in the maimai folder: https://maimai.sega.jp/song/maimai/
	if ((!genre || genre === 'UNKNOWN') && title.trim() === 'OV3RCLOCK' && artist.trim() === 'Alicemetix') {
		return 'maimai';
	}
	return genre;
}
