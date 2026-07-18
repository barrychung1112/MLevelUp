import { evaluateMissionReadiness } from "./mission-readiness";
import type { Difficulty, Quest, Resource, SkillStats } from "./types";

const ACTIVE_TRAINING_DAYS = 5;
const MIN_DAILY_MINUTES = 30;
const MAX_DAILY_MINUTES = 180;

export function dailyBudget(weeklyMinutes: number): number {
  const perDay = Math.round(weeklyMinutes / ACTIVE_TRAINING_DAYS);
  return Math.min(MAX_DAILY_MINUTES, Math.max(MIN_DAILY_MINUTES, perDay));
}

export function difficultyCeiling(skills: SkillStats): Difficulty {
  const values = Object.values(skills);
  const average = values.reduce((sum, skill) => sum + skill.score, 0) / values.length;

  if (average >= 65) return 5;
  if (average >= 45) return 4;
  if (average >= 30) return 3;
  return 2;
}

type SelectorInput = {
  quests: readonly Quest[];
  skills: SkillStats;
  weeklyMinutes: number;
  excludedQuestIds: readonly string[];
  resources: readonly Resource[];
};

function weaknessCoverage(quest: Quest, skills: SkillStats): number {
  return Object.entries(quest.skillWeights).reduce(
    (sum, [key, weight]) => sum + weight * (100 - skills[key as keyof SkillStats].score),
    0,
  );
}

function compareCandidates(
  left: Quest,
  right: Quest,
  skills: SkillStats,
  budget: number,
): number {
  return (
    right.difficulty - left.difficulty ||
    weaknessCoverage(right, skills) - weaknessCoverage(left, skills) ||
    Math.abs(budget - left.estimatedMinutes) - Math.abs(budget - right.estimatedMinutes) ||
    left.id.localeCompare(right.id)
  );
}

export function selectHardestFeasibleQuest(input: SelectorInput): Quest | undefined {
  const excluded = new Set(input.excludedQuestIds);
  const budget = dailyBudget(input.weeklyMinutes);
  const ceiling = difficultyCeiling(input.skills);
  const withinCeiling = input.quests.filter(
    (quest) => !excluded.has(quest.id) && quest.difficulty <= ceiling,
  );
  const candidates = withinCeiling.filter((quest) =>
    evaluateMissionReadiness({ quest, resources: input.resources, availableMinutes: budget }).ready,
  );

  return [...candidates].sort((left, right) =>
    compareCandidates(left, right, input.skills, budget),
  )[0];
}
