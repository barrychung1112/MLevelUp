import { describe, expect, test } from "vitest";

import type { SkillStats, SkillWeights } from "./types";
import {
  allocateSkillXp,
  calculateReward,
  calculateScoreDeltas,
  levelForXp,
  qualityMultiplier,
} from "./rewards";

const weights: SkillWeights = {
  dataHandling: 0.1,
  modeling: 0.4,
  evaluation: 0.2,
  engineering: 0.1,
  researchSense: 0.05,
  productThinking: 0.05,
  communication: 0.1,
};

const skills: SkillStats = {
  dataHandling: { score: 20, skillXp: 0, lastDelta: 0 },
  modeling: { score: 20, skillXp: 0, lastDelta: 0 },
  evaluation: { score: 20, skillXp: 0, lastDelta: 0 },
  engineering: { score: 20, skillXp: 0, lastDelta: 0 },
  researchSense: { score: 20, skillXp: 0, lastDelta: 0 },
  productThinking: { score: 20, skillXp: 0, lastDelta: 0 },
  communication: { score: 20, skillXp: 0, lastDelta: 0 },
};

describe("reward rules", () => {
  test.each([
    [59, 0],
    [60, 0.6],
    [69, 0.6],
    [70, 0.8],
    [79, 0.8],
    [80, 1],
    [89, 1],
    [90, 1.2],
    [100, 1.2],
  ])("maps quality %i to multiplier %f", (quality, expected) => {
    expect(qualityMultiplier(quality)).toBe(expected);
  });

  test("uses 500 XP level boundaries", () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(499)).toBe(1);
    expect(levelForXp(500)).toBe(2);
    expect(levelForXp(1_000)).toBe(3);
  });

  test("caps streak at 1.10 and applies artifact multiplier only at quality 80", () => {
    const at79 = calculateReward({
      baseXp: 100,
      qualityScore: 79,
      verificationStatus: "verified",
      streakDays: 99,
      artifactReady: true,
      difficulty: 3,
      skillWeights: weights,
      currentSkills: skills,
    });
    const at80 = calculateReward({
      baseXp: 100,
      qualityScore: 80,
      verificationStatus: "verified",
      streakDays: 99,
      artifactReady: true,
      difficulty: 3,
      skillWeights: weights,
      currentSkills: skills,
    });

    expect(at79.multipliers).toEqual({ quality: 0.8, streak: 1.1, artifact: 1 });
    expect(at80.multipliers).toEqual({ quality: 1, streak: 1.1, artifact: 1.25 });
  });

  test("uses largest remainder allocation without losing XP", () => {
    const allocation = allocateSkillXp(11, weights);

    expect(Object.values(allocation).reduce((sum, value) => sum + value, 0)).toBe(11);
    expect(allocation.modeling).toBe(4);
  });

  test("caps one skill score delta at two", () => {
    const deltas = calculateScoreDeltas(
      { ...allocateSkillXp(10_000, weights), modeling: 10_000 },
      skills,
      5,
    );

    expect(deltas.modeling).toBe(2);
  });

  test("awards no XP before verification", () => {
    const reward = calculateReward({
      baseXp: 100,
      qualityScore: 100,
      verificationStatus: "needs_revision",
      streakDays: 4,
      artifactReady: true,
      difficulty: 3,
      skillWeights: weights,
      currentSkills: skills,
    });

    expect(reward.awardedXp).toBe(0);
    expect(Object.values(reward.skillXp).every((value) => value === 0)).toBe(true);
  });
});
