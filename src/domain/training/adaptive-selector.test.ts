import { describe, expect, it } from "vitest";

import type { Quest, SkillKey, SkillStats } from "./types";
import {
  dailyBudget,
  difficultyCeiling,
  selectHardestFeasibleQuest,
} from "./adaptive-selector";

const skillKeys: SkillKey[] = [
  "dataHandling",
  "modeling",
  "evaluation",
  "engineering",
  "researchSense",
  "productThinking",
  "communication",
];

function skills(score: number, overrides: Partial<Record<SkillKey, number>> = {}): SkillStats {
  return Object.fromEntries(
    skillKeys.map((key) => [
      key,
      { score: overrides[key] ?? score, skillXp: 0, lastDelta: 0 },
    ]),
  ) as SkillStats;
}

function quest(
  id: string,
  difficulty: Quest["difficulty"],
  estimatedMinutes: number,
  primarySkill: SkillKey,
): Quest {
  return {
    id,
    trainingContract: "standard",
    purpose: "training",
    title: id,
    summary: id,
    instructions: id,
    questType: "modelExperiment",
    difficulty,
    estimatedMinutes,
    baseXp: 50,
    optional: false,
    acceptanceCriteria: ["complete"],
    evidenceRequirements: [{ id: "proof", type: "writtenReflection", required: true }],
    reflectionMinChars: 0,
    skillWeights: Object.fromEntries(
      skillKeys.map((key) => [key, key === primarySkill ? 1 : 0]),
    ) as Quest["skillWeights"],
    resourceIds: [],
  };
}

describe("adaptive quest selector", () => {
  it.each([
    [60, 30],
    [600, 120],
    [1_500, 180],
  ])("clamps %i weekly minutes to a %i minute daily budget", (weekly, expected) => {
    expect(dailyBudget(weekly)).toBe(expected);
  });

  it.each([
    [0, 2],
    [30, 3],
    [45, 4],
    [65, 5],
  ] as const)("maps an average skill score of %i to ceiling %i", (score, expected) => {
    expect(difficultyCeiling(skills(score))).toBe(expected);
  });

  it("chooses the highest feasible difficulty", () => {
    const selected = selectHardestFeasibleQuest({
      quests: [quest("easy", 2, 30, "modeling"), quest("hard", 4, 80, "engineering")],
      skills: skills(50),
      weeklyMinutes: 500,
      excludedQuestIds: [],
    });

    expect(selected?.id).toBe("hard");
  });

  it("breaks difficulty ties by weakest-skill coverage and then time-budget closeness", () => {
    const selected = selectHardestFeasibleQuest({
      quests: [
        quest("strong-skill", 3, 95, "modeling"),
        quest("weak-far", 3, 60, "evaluation"),
        quest("weak-close", 3, 90, "evaluation"),
      ],
      skills: skills(50, { modeling: 80, evaluation: 15 }),
      weeklyMinutes: 500,
      excludedQuestIds: [],
    });

    expect(selected?.id).toBe("weak-close");
  });

  it("falls back to the closest lower quest when none fits the time budget", () => {
    const selected = selectHardestFeasibleQuest({
      quests: [quest("closest", 2, 45, "modeling"), quest("longer", 2, 70, "modeling")],
      skills: skills(20),
      weeklyMinutes: 100,
      excludedQuestIds: [],
    });

    expect(selected?.id).toBe("closest");
  });

  it("never selects an excluded quest", () => {
    const selected = selectHardestFeasibleQuest({
      quests: [quest("used", 4, 60, "modeling"), quest("fresh", 3, 60, "modeling")],
      skills: skills(50),
      weeklyMinutes: 500,
      excludedQuestIds: ["used"],
    });

    expect(selected?.id).toBe("fresh");
  });
});
