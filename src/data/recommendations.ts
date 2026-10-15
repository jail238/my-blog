import { CHARTS, SONGS, MAISHIFT_SOURCE, songById } from './maimai';
import { CHART_STUDIES, STUDY_SKILLS, STUDY_SOURCES } from './chart-study.js';
import { songSearchIndex } from '../utils/catalog-search.js';
import { buildRecommendations, indexStudies, isSssPlus, validAchievement } from '../utils/recommendations.js';

export interface RecommendationItem {
  id: string;
  songId: string;
  title: string;
  koreanTitle?: string;
  artworkUrl: string;
  searchIndex: string;
  type: string;
  difficulty: string;
  level: string;
  constant: number | null;
  achievement: number | null;
  gap: number | null;
  baseline: number | null;
  modes: string[];
  skills: string[];
  sharedSkills: string[];
  note: string;
  source: { name: string; url: string } | null;
  references: { songId: string; title: string; type: string; difficulty: string; constant: number; achievement: number }[];
}

const studies = indexStudies(CHARTS, SONGS, CHART_STUDIES, STUDY_SOURCES, STUDY_SKILLS);
export const recommendationItems: RecommendationItem[] = buildRecommendations(CHARTS, studies).map((item) => {
  const { chart } = item;
  const song = songById.get(chart.songId)!;
  return {
    id: chart.id, songId: song.id, title: song.title, koreanTitle: song.koreanTitle,
    artworkUrl: song.artworkUrl, searchIndex: songSearchIndex(song),
    type: chart.type, difficulty: chart.difficulty, level: chart.level,
    constant: chart.constant ?? null, achievement: item.achievement, gap: item.gap,
    baseline: item.baseline, modes: item.modes, skills: item.study?.skills ?? [],
    sharedSkills: item.sharedSkills, note: item.study?.note ?? '',
    source: item.study ? STUDY_SOURCES[item.study.source as keyof typeof STUDY_SOURCES] : null,
    references: item.references.map((reference) => ({
      songId: reference.songId, title: songById.get(reference.songId)!.title,
      type: reference.type, difficulty: reference.difficulty, constant: reference.constant!,
      achievement: reference.record!.achievementValue,
    })),
  };
});

export const recommendationSummary = {
  recorded: CHARTS.filter((chart) => validAchievement(chart.record) !== null).length,
  reached: CHARTS.filter(isSssPlus).length,
  push: recommendationItems.filter((item) => item.modes.includes('push')).length,
  reviewed: studies.size,
  updatedAt: MAISHIFT_SOURCE.generatedAt.slice(0, 10),
};

export const patternResults = Object.entries(STUDY_SKILLS).map(([id, name]) => {
  const charts = CHARTS.filter((chart) => studies.get(chart.id)?.skills.includes(id));
  return { id, name, total: charts.length, recorded: charts.filter((chart) => validAchievement(chart.record) !== null).length, reached: charts.filter(isSssPlus).length };
});
