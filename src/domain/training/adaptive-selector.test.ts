import { describe, expect, it } from "vitest";

import type { Quest, Resource, SkillKey, SkillStats } from "./types";
import {
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
    scope: "daily",
    durationDays: 1,
    executionSteps: ["Complete the focused exercise"],
    successMetrics: ["Submit the required evidence"],
    outOfScope: [],
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
    resourceIds: ["resource-ready"],
  };
}

const resources: Resource[] = [
  {
    id: "resource-ready",
    title: "Focused training guide",
    summary: "A short resource for the selected mission.",
    url: "https://example.com/resource",
    resourceType: "article",
    difficulty: 2,
    estimatedMinutes: 5,
    skillTags: ["modeling"],
    relevance: 90,
    freshness: 80,
    credibility: 90,
    prerequisites: [],
    requiredTools: ["Python"],
    costTier: "free",
    availabilityStatus: "available",
    lastCheckedAt: "2026-07-18T08:00:00.000Z",
  },
];

describe("adaptive quest selector", () => {
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
      availableMinutes: 100,
      excludedQuestIds: [],
      resources,
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
      availableMinutes: 100,
      excludedQuestIds: [],
      resources,
    });

    expect(selected?.id).toBe("weak-close");
  });

  it("returns no quest when none fits the complete mission time budget", () => {
    const selected = selectHardestFeasibleQuest({
      quests: [quest("closest", 2, 45, "modeling"), quest("longer", 2, 70, "modeling")],
      skills: skills(20),
      availableMinutes: 49,
      excludedQuestIds: [],
      resources,
    });

    expect(selected).toBeUndefined();
  });

  it("never selects an excluded quest", () => {
    const selected = selectHardestFeasibleQuest({
      quests: [quest("used", 4, 60, "modeling"), quest("fresh", 3, 60, "modeling")],
      skills: skills(50),
      availableMinutes: 100,
      excludedQuestIds: ["used"],
      resources,
    });

    expect(selected?.id).toBe("fresh");
  });

  it("never falls back to a mission without a ready resource", () => {
    const selected = selectHardestFeasibleQuest({
      quests: [quest("unsupported", 4, 60, "modeling")],
      skills: skills(50),
      availableMinutes: 100,
      excludedQuestIds: [],
      resources: [{ ...resources[0], availabilityStatus: "unavailable" }],
    });

    expect(selected).toBeUndefined();
  });

  it("allows a complete mainline mission to use the full 300-minute capacity", () => {
    const selected = selectHardestFeasibleQuest({
      quests: [quest("mainline", 3, 295, "engineering")],
      skills: skills(40),
      availableMinutes: 300,
      excludedQuestIds: [],
      resources,
    });

    expect(selected?.id).toBe("mainline");
  });
});
