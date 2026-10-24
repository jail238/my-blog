import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { withLocalJackets } from '../src/utils/local-jackets.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export async function checkSongJackets(root = ROOT) {
	const catalog = JSON.parse(await readFile(resolve(root, 'src/data/maimai.generated.json'), 'utf8'));
	const manifest = JSON.parse(await readFile(resolve(root, 'src/data/jackets.generated.json'), 'utf8'));
	withLocalJackets(catalog.songs, manifest);
	const files = new Set();
	let bytes = 0;
	for (const song of catalog.songs) {
		const entry = manifest.jackets[song.id];
		if (files.has(entry.file)) continue;
		const image = await readFile(resolve(root, 'public/assets/maimai/jackets', entry.file));
		const hash = createHash('sha256').update(image).digest('hex');
		const metadata = await sharp(image).metadata();
		if (hash !== entry.sha256 || entry.file !== `${hash.slice(0, 2)}/${hash}.webp` || image.length !== entry.bytes || metadata.format !== 'webp' || metadata.width !== entry.width || metadata.height !== entry.height) {
			throw new Error(`Invalid local jacket for ${song.id}; run npm run sync:jackets`);
		}
		files.add(entry.file);
		bytes += image.length;
	}
	return { songs: catalog.songs.length, files: files.size, bytes };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	console.log(JSON.stringify(await checkSongJackets()));
}
