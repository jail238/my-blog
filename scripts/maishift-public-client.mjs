import { findProfileFunctionBinding } from './maishift-build-parser.mjs';

export const MAISHIFT_ORIGIN = 'https://maimai.shiftpsh.com';

const SPECIAL_VALUES = [undefined, null, true, false];

export function deserializeMaishiftValue(value) {
	if (!value || typeof value !== 'object') return value;

	switch (value.t) {
		case 0:
		case 1:
		case 5:
			return value.s;
		case 2:
			return SPECIAL_VALUES[value.s];
		case 9:
			return value.a.map(deserializeMaishiftValue);
		case 10:
		case 11:
			return Object.fromEntries(
				value.p.k.map((key, index) => [key, deserializeMaishiftValue(value.p.v[index])]),
			);
		default:
			throw new Error(`Unsupported Maishift serialization type: ${value.t}`);
	}
}

function serverFunctionPayload(data) {
	return {
		t: {
			t: 10,
			i: 0,
			p: {
				k: ['data'],
				v: [
					{
						t: 10,
						i: 1,
						p: {
							k: Object.keys(data),
							v: Object.values(data).map((value) => ({ t: 1, s: value })),
						},
						o: 0,
					},
				],
			},
			o: 0,
		},
		f: 63,
		m: [],
	};
}

export async function fetchMaishiftText(url) {
	const response = await fetch(url, {
		headers: { 'user-agent': 'M.S.K. archive record sync' },
	});
	if (!response.ok) throw new Error(`Request failed: ${response.status} ${url}`);
	return response.text();
}

function escapeRegExp(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function bindingHash(mainScript, binding) {
	const bindingIndex = mainScript.indexOf(`${binding}=`);
	if (bindingIndex < 0) throw new Error(`Could not find Maishift server function binding: ${binding}`);

	const match = mainScript.slice(bindingIndex, bindingIndex + 500).match(/["']([a-f0-9]{64})["']/);
	if (!match) throw new Error(`Could not find Maishift server function hash for: ${binding}`);
	return match[1];
}

function importedNameForAlias(script, alias) {
	return script.match(new RegExp(`(?:\\{|,)\\s*([$\\w]+)\\s+as\\s+${escapeRegExp(alias)}(?:,|\\})`))?.[1];
}

function bindingForExport(mainScript, exportedName) {
	const exportBlock = mainScript.slice(mainScript.lastIndexOf('export{'));
	return exportBlock.match(new RegExp(`([$\\w]+)\\s+as\\s+${escapeRegExp(exportedName)}(?:,|\\})`))?.[1];
}

export async function discoverMaishiftServerFunctions(recordsHtml) {
	const allScriptLinks = [...recordsHtml.matchAll(/<link\b[^>]*\bhref=["']([^"']+\.js)["'][^>]*>/gi)].map(
		(match) => match[1],
	);
	const routeScriptLinks = allScriptLinks.filter((path) => /\/index-[^/]+\.js$/.test(path));
	const scriptLinks = [...routeScriptLinks, ...allScriptLinks.filter((path) => !routeScriptLinks.includes(path))];

	let recordsScript;
	for (const path of scriptLinks) {
		const source = await fetchMaishiftText(new URL(path, MAISHIFT_ORIGIN));
		if (source.includes('profile-tracks')) {
			recordsScript = source;
			break;
		}
	}
	if (!recordsScript) throw new Error('Could not locate the Maishift records page script.');

	const mainPath = recordsScript.match(/from["']\.\/(main-[^"']+\.js)["']/)?.[1];
	if (!mainPath) throw new Error('Could not locate the Maishift main script.');

	const recordsAlias = recordsScript.match(
		/queryKey:\[\s*["']profile-tracks["'][\s\S]{0,800}?queryFn:\(\)=>\s*([$\w]+)\(\{data:/,
	)?.[1];
	if (!recordsAlias) throw new Error('Could not locate the Maishift records function alias.');

	const recordsImportName = importedNameForAlias(recordsScript, recordsAlias);
	if (!recordsImportName) throw new Error('Could not resolve the Maishift records function import.');

	const historyPath = allScriptLinks.find((path) => /\/RecordHistoryContext-[^/]+\.js$/.test(path));
	if (!historyPath) throw new Error('Could not locate the Maishift record history script.');
	const historyScript = await fetchMaishiftText(new URL(historyPath, MAISHIFT_ORIGIN));
	const historyQueryIndex = historyScript.search(/["']recordHistory["']/);
	if (historyQueryIndex < 0) throw new Error('Could not locate the Maishift record history query.');
	const historyAlias = historyScript.slice(historyQueryIndex, historyQueryIndex + 1_500).match(/await\s+([$\w]+)\(\{data:/)?.[1];
	if (!historyAlias) throw new Error('Could not locate the Maishift record history function alias.');
	const historyImportName = importedNameForAlias(historyScript, historyAlias);
	if (!historyImportName) throw new Error('Could not resolve the Maishift record history function import.');

	const mainScript = await fetchMaishiftText(new URL(`/assets/${mainPath}`, MAISHIFT_ORIGIN));
	const recordsBinding = bindingForExport(mainScript, recordsImportName);
	if (!recordsBinding) throw new Error('Could not resolve the Maishift records function binding.');
	const historyBinding = bindingForExport(mainScript, historyImportName);
	if (!historyBinding) throw new Error('Could not resolve the Maishift record history function binding.');
	const profileBinding = findProfileFunctionBinding(mainScript);

	return {
		profileHash: bindingHash(mainScript, profileBinding),
		recordsHash: bindingHash(mainScript, recordsBinding),
		historyHash: bindingHash(mainScript, historyBinding),
	};
}

export async function callMaishiftServerFunction(hash, data) {
	const payload = encodeURIComponent(JSON.stringify(serverFunctionPayload(data)));
	const url = `${MAISHIFT_ORIGIN}/_serverFn/${hash}?payload=${payload}`;
	let lastError;
	for (let attempt = 0; attempt < 4; attempt += 1) {
		let response;
		try {
			response = await fetch(url, {
				headers: {
					accept: 'application/json',
					'x-tsr-serverfn': 'true',
					'user-agent': 'M.S.K. archive record sync',
				},
			});
		} catch (error) {
			lastError = error;
			if (attempt === 3) throw error;
			await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
			continue;
		}

		if (response.ok) {
			const serialized = await response.json();
			const decoded = deserializeMaishiftValue(serialized);
			if (decoded.error) throw new Error(`Maishift returned an error: ${decoded.error}`);
			return decoded.result;
		}

		lastError = new Error(`Maishift server function failed: ${response.status}`);
		if (![429, 502, 503, 504].includes(response.status) || attempt === 3) throw lastError;
		await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
	}
	throw lastError ?? new Error('Maishift server function failed without a response.');
}

export function parseMaishiftRecordHistory(value) {
	if (typeof value !== 'string') throw new Error('Maishift record history payload is not a string.');
	let parsed;
	try {
		parsed = JSON.parse(value);
	} catch (error) {
		if (!value.includes('\\"')) throw error;
		parsed = JSON.parse(value.replace(/\\"/g, '"'));
	}
	if (!Array.isArray(parsed.n) || !Array.isArray(parsed.r)) {
		throw new Error('Maishift record history payload has an unsupported shape.');
	}

	return parsed.r.map(([userRecordId, capturedAt, rating, nameIndex, playedVersion]) => {
		const date = new Date(capturedAt);
		if (!Number.isFinite(Number(userRecordId)) || Number.isNaN(date.getTime())) {
			throw new Error('Maishift record history contains an invalid snapshot.');
		}
		return {
			userRecordId: Number(userRecordId),
			capturedAt: date.toISOString(),
			rating,
			name: parsed.n[nameIndex],
			playedVersion: playedVersion === -1 ? null : playedVersion,
		};
	});
}
