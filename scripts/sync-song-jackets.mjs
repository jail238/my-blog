import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import sharp from 'sharp';
import { isJacketFile, withLocalJackets } from '../src/utils/local-jackets.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MAX_DOWNLOAD_BYTES = 8 * 1024 * 1024;
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');

async function readJson(path, fallback) {
	try {
		return JSON.parse(await readFile(path, 'utf8'));
	} catch (error) {
		if (error.code !== 'ENOENT') throw error;
		return fallback;
	}
}

async function cachedJacket(directory, entry) {
	if (!entry || !isJacketFile(entry.file)) return false;
	try {
		const bytes = await readFile(resolve(directory, entry.file));
		return bytes.length === entry.bytes && digest(bytes) === entry.sha256;
	} catch (error) {
		if (error.code !== 'ENOENT') throw error;
		return false;
	}
}

async function downloadJacket(url, fetchImpl) {
	const parsed = new URL(url);
	if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw new Error('Jacket source must be a public HTTPS URL');
	let lastError;
	for (let attempt = 0; attempt < 3; attempt += 1) {
		try {
			const response = await fetchImpl(url, {
				headers: { 'user-agent': 'M.S.K. jacket archive sync' },
				signal: AbortSignal.timeout(30_000),
			});
			if (!response.ok) throw new Error(`Jacket request failed: HTTP ${response.status}`);
			if (!response.headers.get('content-type')?.startsWith('image/')) throw new Error('Jacket response is not an image');
			const chunks = [];
			let length = 0;
			for await (const chunk of response.body) {
				length += chunk.byteLength;
				if (length > MAX_DOWNLOAD_BYTES) throw new Error('Jacket exceeds the 8 MiB download limit');
				chunks.push(chunk);
			}
			const bytes = Buffer.concat(chunks);
			const image = sharp(bytes, { limitInputPixels: 16_000_000, animated: false });
			const metadata = await image.metadata();
			if (!metadata.width || !metadata.height || metadata.width < 32 || metadata.height < 32) throw new Error('Jacket dimensions are invalid');
			const encoded = await image.webp({ lossless: true, effort: 4 }).toBuffer({ resolveWithObject: true });
			return { bytes: encoded.data, width: encoded.info.width, height: encoded.info.height };
		} catch (error) {
			lastError = error;
			if (attempt < 2) await delay(500 * (attempt + 1));
		}
	}
	throw lastError;
}

export async function syncSongJackets({
	root = ROOT,
	fetchImpl = fetch,
	concurrency = 4,
	requestIntervalMs = 200,
	onProgress = () => {},
} = {}) {
	const catalog = await readJson(resolve(root, 'src/data/maimai.generated.json'));
	if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 4) throw new Error('Jacket concurrency must be between 1 and 4');
	const manifestPath = resolve(root, 'src/data/jackets.generated.json');
	const directory = resolve(root, 'public/assets/maimai/jackets');
	const previous = await readJson(manifestPath, { version: 1, jackets: {} });
	if (previous.version !== 1) throw new Error('Unsupported jacket manifest version');
	const entries = { ...previous.jackets };
	const downloads = new Map();
	let next = 0, completed = 0, downloaded = 0, reused = 0, nextRequestAt = 0;
	const failures = [];
	await mkdir(directory, { recursive: true });

	async function download(sourceUrl) {
		const scheduledAt = Math.max(Date.now(), nextRequestAt);
		nextRequestAt = scheduledAt + requestIntervalMs;
		await delay(Math.max(0, scheduledAt - Date.now()));
		const image = await downloadJacket(sourceUrl, fetchImpl);
		const sha256 = digest(image.bytes);
		const file = `${sha256.slice(0, 2)}/${sha256}.webp`;
		const path = resolve(directory, file);
		await mkdir(dirname(path), { recursive: true });
		await writeFile(path, image.bytes);
		downloaded += 1;
		return { sourceUrl, file, sha256, bytes: image.bytes.length, width: image.width, height: image.height };
	}

	await Promise.all(Array.from({ length: Math.min(concurrency, catalog.songs.length) }, async () => {
		while (next < catalog.songs.length) {
			const song = catalog.songs[next++];
			try {
				const entry = entries[song.id];
				if (entry?.sourceUrl === song.artworkUrl && await cachedJacket(directory, entry)) {
					reused += 1;
				} else {
					if (!downloads.has(song.artworkUrl)) downloads.set(song.artworkUrl, download(song.artworkUrl));
					entries[song.id] = await downloads.get(song.artworkUrl);
				}
			} catch (error) {
				failures.push(`${song.id} (${song.title}): ${error.message}`);
			} finally {
				completed += 1;
				onProgress({ completed, total: catalog.songs.length, downloaded, reused });
			}
		}
	}));

	// Save successful downloads for resuming, but fail before any build or publish.
	const manifest = { version: 1, jackets: Object.fromEntries(Object.entries(entries).sort(([a], [b]) => a.localeCompare(b, 'en', { numeric: true }))) };
	const temporaryManifest = resolve(root, '.cache/jackets.generated.json');
	await mkdir(dirname(temporaryManifest), { recursive: true });
	await writeFile(temporaryManifest, `${JSON.stringify(manifest, null, 2)}\n`);
	await rename(temporaryManifest, manifestPath);
	if (failures.length) throw new Error(`Could not cache ${failures.length} jackets:\n${failures.join('\n')}`);
	withLocalJackets(catalog.songs, manifest);
	return { total: catalog.songs.length, downloaded, reused };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const result = await syncSongJackets({ onProgress(progress) {
		if (progress.completed % 50 === 0 || progress.completed === progress.total) console.log(`Jackets ${progress.completed}/${progress.total}: ${progress.downloaded} downloaded, ${progress.reused} reused`);
	} });
	console.log(JSON.stringify(result));
}
