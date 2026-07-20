import { evaluateMissionReadiness } from "./mission-readiness";
import type { Difficulty, Quest, Resource, SkillStats } from "./types";

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
  availableMinutes: number;
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
  const budget = input.availableMinutes;
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
