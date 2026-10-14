const definitions = [
  { id: 'maimai', name: 'maimai', sourceName: 'maimai' },
  { id: 'pops-anime', name: 'POPS & Anime', sourceName: 'POPS＆アニメ' },
  { id: 'niconico-vocaloid', name: 'niconico & VOCALOID', sourceName: 'niconico＆ボーカロイド' },
  { id: 'touhou-project', name: 'Touhou Project', sourceName: '東方Project' },
  { id: 'game-variety', name: 'Game & Variety', sourceName: 'ゲーム＆バラエティ' },
  { id: 'ongeki-chunithm', name: 'ONGEKI & CHUNITHM', sourceName: 'オンゲキ＆CHUNITHM' },
  { id: 'other', name: 'Other', sourceName: 'UNKNOWN' },
];

export function genreInfo(sourceName = 'UNKNOWN') {
  const name = sourceName || 'UNKNOWN';
  const definition = definitions.find((genre) => genre.sourceName === name);
  if (definition) return definition;
  // Keep future source categories distinct with stable, URL-safe paths.
  return { id: `genre-${[...name].map((character) => character.codePointAt(0).toString(16)).join('-')}`, name, sourceName: name };
}

export function genreGroups(songs) {
  const groups = new Map();
  for (const song of songs) {
    const genre = genreInfo(song.genre);
    if (!groups.has(genre.id)) groups.set(genre.id, { ...genre, songs: [] });
    groups.get(genre.id).songs.push(song);
  }
  return [...groups.values()].map((group) => ({
    ...group,
    songs: group.songs.sort((a, b) => a.title.localeCompare(b.title, 'ko')),
  })).sort((a, b) => {
    const order = (id) => {
      const index = definitions.findIndex((genre) => genre.id === id);
      return index < 0 ? definitions.length : index;
    };
    return order(a.id) - order(b.id) || a.name.localeCompare(b.name, 'en');
  });
}
