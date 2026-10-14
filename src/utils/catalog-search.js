export function normalizeSearch(value = '') {
  return value.normalize('NFKC').toLowerCase()
    .replace(/[\u30a1-\u30f6]/g, (character) => String.fromCharCode(character.charCodeAt(0) - 0x60))
    .replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim();
}

export function songSearchIndex(song) {
  return normalizeSearch([song.title, song.koreanTitle, song.artist, ...(song.aliases ?? [])].filter(Boolean).join(' ')).replaceAll(' ', '');
}

export function searchMatches(searchIndex = '', query = '') {
  return normalizeSearch(query).split(' ').every((term) => searchIndex.includes(term));
}

export function songMatches(song, query) {
  return searchMatches(songSearchIndex(song), query);
}
