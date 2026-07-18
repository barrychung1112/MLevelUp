import { describe, expect, it } from "vitest";

import type {
  AdjustmentProposal,
  CoordinatorFeedback,
} from "@/ai/contracts";

import { adjudicateAiFeedback } from "./ai-policy";
import type { SkillWeights, SubmissionEvaluation } from "./types";

const baselineWeights: SkillWeights = {
  dataHandling: 0.1,
  modeling: 0.4,
  evaluation: 0.2,
  engineering: 0.2,
  researchSense: 0,
  productThinking: 0,
  communication: 0.1,
};

function evaluation(
  overrides: Partial<SubmissionEvaluation> = {},
): SubmissionEvaluation {
  return {
    qualityScore: 80,
    verificationStatus: "verified",
    verificationMethod: "mock",
    scoreBreakdown: {
      evidenceCompleteness: 35,
      evidenceValidity: 20,
      reflection: 15,
      artifactReadiness: 10,
    },
    artifactReady: true,
    hardFailures: [],
    ...overrides,
  };
}

function coordinator(
  overrides: Partial<CoordinatorFeedback> = {},
): CoordinatorFeedback {
  return {
    summary: "The evidence is reproducible.",
    strengths: ["The metric is recorded."],
    improvements: ["Add segmented error analysis."],
    nextActions: ["Inspect the largest error segment."],
    suggestedQualityScore: 80,
    suggestedSkillWeights: baselineWeights,
    explanation: "The submission satisfies the measurable checkpoint.",
    confidence: 0.8,
    ...overrides,
  };
}

function adjustment(
  overrides: Partial<AdjustmentProposal> = {},
): AdjustmentProposal {
  return {
    difficultyAction: "maintain",
    recommendedDifficulty: 3,
    granularityAction: "maintain",
    targetSkills: ["modeling"],
    reasoning: "Continue at the current challenge level.",
    riskFlags: [],
    confidence: 0.8,
    ...overrides,
  };
}

describe("adjudicateAiFeedback", () => {
  it("never lets AI override a deterministic hard failure", () => {
    const result = adjudicateAiFeedback({
      deterministicEvaluation: evaluation({
        qualityScore: 55,
        verificationStatus: "needs_revision",
        hardFailures: ["Missing required evidence"],
      }),
      coordinator: coordinator({ suggestedQualityScore: 100 }),
      adjustment: adjustment(),
      baselineSkillWeights: baselineWeights,
      currentDifficulty: 3,
      trainingStatus: "normal",
      hasOpenPenaltyDebt: false,
      eligibleQuestIds: ["quest-next"],
      recommendedQuestId: "quest-next",
    });

    expect(result.evaluation.verificationStatus).toBe("needs_revision");
    expect(result.evaluation.qualityScore).toBe(55);
    expect(result.evaluation.qualityScore).toBeLessThanOrEqual(59);
  });

  it("uses the deterministic score below the confidence threshold", () => {
    const result = adjudicateAiFeedback({
      deterministicEvaluation: evaluation({ qualityScore: 80 }),
      coordinator: coordinator({
        suggestedQualityScore: 60,
        confidence: 0.59,
      }),
      adjustment: adjustment(),
      baselineSkillWeights: baselineWeights,
      currentDifficulty: 3,
      trainingStatus: "normal",
      hasOpenPenaltyDebt: false,
      eligibleQuestIds: [],
      recommendedQuestId: null,
    });

    expect(result.evaluation.qualityScore).toBe(80);
    expect(result.skillWeights).toEqual(baselineWeights);
  });

  it.each([
    { suggested: 10, expected: 65 },
    { suggested: 100, expected: 85 },
    { suggested: 82, expected: 82 },
  ])("clamps score suggestion $suggested to $expected", ({ suggested, expected }) => {
    const result = adjudicateAiFeedback({
      deterministicEvaluation: evaluation({ qualityScore: 80 }),
      coordinator: coordinator({ suggestedQualityScore: suggested }),
      adjustment: adjustment(),
      baselineSkillWeights: baselineWeights,
      currentDifficulty: 3,
      trainingStatus: "normal",
      hasOpenPenaltyDebt: false,
      eligibleQuestIds: [],
      recommendedQuestId: null,
    });

    expect(result.evaluation.qualityScore).toBe(expected);
  });

  it("limits skill redistribution and never activates a zero-weight skill", () => {
    const result = adjudicateAiFeedback({
      deterministicEvaluation: evaluation(),
      coordinator: coordinator({
        suggestedSkillWeights: {
          dataHandling: 0,
          modeling: 0,
          evaluation: 0,
          engineering: 0,
          researchSense: 1,
          productThinking: 0,
          communication: 0,
        },
      }),
      adjustment: adjustment(),
      baselineSkillWeights: baselineWeights,
      currentDifficulty: 3,
      trainingStatus: "normal",
      hasOpenPenaltyDebt: false,
      eligibleQuestIds: [],
      recommendedQuestId: null,
    });

    const total = Object.values(result.skillWeights).reduce(
      (sum, value) => sum + value,
      0,
    );
    const totalMovement = Object.keys(baselineWeights).reduce(
      (sum, key) =>
        sum +
        Math.abs(
          result.skillWeights[key as keyof SkillWeights] -
            baselineWeights[key as keyof SkillWeights],
        ),
      0,
    );

    expect(result.skillWeights.researchSense).toBe(0);
    expect(result.skillWeights.productThinking).toBe(0);
    expect(total).toBeCloseTo(1, 8);
    expect(totalMovement).toBeLessThanOrEqual(0.4);
  });

  it("limits difficulty changes to one level", () => {
    const result = adjudicateAiFeedback({
      deterministicEvaluation: evaluation(),
      coordinator: coordinator(),
      adjustment: adjustment({
        difficultyAction: "increase",
        recommendedDifficulty: 5,
      }),
      baselineSkillWeights: baselineWeights,
      currentDifficulty: 3,
      trainingStatus: "normal",
      hasOpenPenaltyDebt: false,
      eligibleQuestIds: [],
      recommendedQuestId: null,
    });

    expect(result.adjustment.recommendedDifficulty).toBe(4);
    expect(result.adjustment.difficultyAction).toBe("increase");
  });

  it("blocks difficulty increases and normal recommendations during recovery", () => {
    const result = adjudicateAiFeedback({
      deterministicEvaluation: evaluation(),
      coordinator: coordinator(),
      adjustment: adjustment({
        difficultyAction: "increase",
        recommendedDifficulty: 4,
      }),
      baselineSkillWeights: baselineWeights,
      currentDifficulty: 3,
      trainingStatus: "recovery",
      hasOpenPenaltyDebt: true,
      eligibleQuestIds: ["quest-next"],
      recommendedQuestId: "quest-next",
    });

    expect(result.adjustment.recommendedDifficulty).toBe(3);
    expect(result.adjustment.difficultyAction).toBe("maintain");
    expect(result.recommendedQuestId).toBeNull();
    expect(result.adjustment.granularityAction).toBe("split");
  });

  it("rejects an ineligible quest recommendation", () => {
    const result = adjudicateAiFeedback({
      deterministicEvaluation: evaluation(),
      coordinator: coordinator(),
      adjustment: adjustment(),
      baselineSkillWeights: baselineWeights,
      currentDifficulty: 3,
      trainingStatus: "normal",
      hasOpenPenaltyDebt: false,
      eligibleQuestIds: ["quest-allowed"],
      recommendedQuestId: "quest-invented",
    });

    expect(result.recommendedQuestId).toBeNull();
  });
});
