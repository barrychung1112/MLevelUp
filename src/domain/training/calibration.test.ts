import { describe, expect, it } from "vitest";

import type { SkillStats, SubmissionEvaluation } from "./types";
import { calibrateSkills } from "./calibration";

const current: SkillStats = {
  dataHandling: { score: 20, skillXp: 0, lastDelta: 0 },
  modeling: { score: 20, skillXp: 0, lastDelta: 0 },
  evaluation: { score: 20, skillXp: 0, lastDelta: 0 },
  engineering: { score: 20, skillXp: 0, lastDelta: 0 },
  researchSense: { score: 20, skillXp: 0, lastDelta: 0 },
  productThinking: { score: 20, skillXp: 0, lastDelta: 0 },
  communication: { score: 20, skillXp: 0, lastDelta: 0 },
};

function evaluation(
  evidenceCompleteness: number,
  evidenceValidity: number,
  reflection: number,
  artifactReadiness: number,
): SubmissionEvaluation {
  const qualityScore = evidenceCompleteness + evidenceValidity + reflection + artifactReadiness;
  return {
    qualityScore,
    verificationStatus: qualityScore >= 60 ? "verified" : "needs_revision",
    verificationMethod: "mock",
    scoreBreakdown: { evidenceCompleteness, evidenceValidity, reflection, artifactReadiness },
    artifactReady: artifactReadiness > 0,
    hardFailures: qualityScore >= 60 ? [] : ["partial evidence"],
  };
}

describe("courage challenge calibration", () => {
  it("raises observable skills from a complete submission", () => {
    const result = calibrateSkills(current, evaluation(45, 25, 20, 10));

    expect(result.modeling.score).toBeGreaterThanOrEqual(70);
    expect(result.engineering.score).toBeGreaterThanOrEqual(70);
    expect(result.communication.score).toBeGreaterThanOrEqual(70);
  });

  it("produces bounded evidence-based scores from a partial submission", () => {
    const result = calibrateSkills(current, evaluation(20, 10, 10, 0));

    for (const key of ["dataHandling", "modeling", "evaluation", "engineering", "communication"] as const) {
      expect(result[key].score).toBeGreaterThanOrEqual(10);
      expect(result[key].score).toBeLessThan(70);
    }
  });

  it("keeps unobserved research and product skills at their baseline", () => {
    const result = calibrateSkills(current, evaluation(0, 0, 0, 0));

    expect(result.researchSense).toEqual(current.researchSense);
    expect(result.productThinking).toEqual(current.productThinking);
    expect(result.modeling.score).toBe(10);
  });
});
