import { describe, expect, test } from "vitest";

import { TRAINING_CONTRACTS } from "@/domain/training/constants";
import type { TrainingContract } from "@/domain/training/types";

import { createTrainingSeed, SEED_VERSION } from "./seed";

const now = "2026-07-16T16:00:00.000Z";

describe("deterministic mock seed", () => {
  test("returns identical state for the same clock value", () => {
    expect(createTrainingSeed(now)).toEqual(createTrainingSeed(now));
    expect(createTrainingSeed(now).seedVersion).toBe(SEED_VERSION);
  });

  test.each([
    ["foundation", 45],
    ["standard", 100],
    ["intensive", 195],
  ] as const)("keeps the %s plan within its time contract", (contract, total) => {
    const state = createTrainingSeed(now);
    const minutes = Object.values(state.quests)
      .filter((quest) => quest.trainingContract === contract)
      .reduce((sum, quest) => sum + quest.estimatedMinutes, 0);
    const limits = TRAINING_CONTRACTS[contract as TrainingContract].dailyMinutes;

    expect(minutes).toBe(total);
    expect(minutes).toBeGreaterThanOrEqual(limits.min);
    if (limits.max !== null) expect(minutes).toBeLessThanOrEqual(limits.max);
  });

  test("starts with only standard assignments and all seven skill stats", () => {
    const state = createTrainingSeed(now);

    expect(Object.values(state.assignments)).toHaveLength(2);
    expect(
      Object.values(state.assignments).every(
        (assignment) =>
          state.quests[assignment.questId].trainingContract === "standard",
      ),
    ).toBe(true);
    expect(Object.keys(state.progress.skills)).toHaveLength(7);
  });

  test("assigns quests on the profile local date rather than the UTC date", () => {
    const state = createTrainingSeed(
      "2026-07-16T00:30:00.000Z",
      "America/Los_Angeles",
    );

    expect(
      new Set(Object.values(state.assignments).map((item) => item.assignedDate)),
    ).toEqual(new Set(["2026-07-15"]));
  });

  test("seeds every resource with explicit quality signals", () => {
    for (const resource of createTrainingSeed(now).resources) {
      expect(resource.relevance).toBeGreaterThanOrEqual(0);
      expect(resource.freshness).toBeGreaterThanOrEqual(0);
      expect(resource.credibility).toBeGreaterThanOrEqual(0);
      expect(resource.relevance).toBeLessThanOrEqual(100);
      expect(resource.freshness).toBeLessThanOrEqual(100);
      expect(resource.credibility).toBeLessThanOrEqual(100);
    }
  });
});
