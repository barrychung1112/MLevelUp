import { describe, expect, it } from "vitest";

import {
  AdjustmentProposalSchema,
  CoordinatorFeedbackSchema,
  LearningStrategyProposalSchema,
} from "./contracts";

const weights = {
  dataHandling: 0.2,
  modeling: 0.2,
  evaluation: 0.2,
  engineering: 0.2,
  researchSense: 0.1,
  productThinking: 0.05,
  communication: 0.05,
};

describe("Phase 3 AI contracts", () => {
  it("accepts a bounded learning strategy proposal", () => {
    const result = LearningStrategyProposalSchema.parse({
      recommendedQuestId: "quest-next",
      checkpointFocus: "Run one reproducible baseline.",
      expectedEvidence: ["Notebook URL"],
      successMeasures: ["Validation score is recorded"],
      reasoning: "A baseline exposes the next modeling bottleneck.",
      portfolioOutcome: "notebook",
      confidence: 0.8,
    });

    expect(result.recommendedQuestId).toBe("quest-next");
  });

  it("rejects more than two adjustment target skills", () => {
    expect(() =>
      AdjustmentProposalSchema.parse({
        difficultyAction: "maintain",
        recommendedDifficulty: 3,
        granularityAction: "split",
        targetSkills: ["modeling", "evaluation", "engineering"],
        reasoning: "The checkpoint needs a narrower feedback loop.",
        riskFlags: ["repeated_revision"],
        confidence: 0.75,
      }),
    ).toThrow();
  });

  it.each(["xpAwarded", "assignmentStatus", "deadline", "penalty", "recoveryDeadline"])(
    "rejects forbidden coordinator authority field %s",
    (field) => {
      expect(() =>
        CoordinatorFeedbackSchema.parse({
          summary: "The evidence is clear and reproducible.",
          strengths: ["Metric is recorded."],
          improvements: ["Add error analysis."],
          nextActions: ["Inspect the largest error segment."],
          suggestedQualityScore: 82,
          suggestedSkillWeights: weights,
          explanation: "The submission meets the measurable checkpoint.",
          confidence: 0.8,
          [field]: field === "xpAwarded" ? 999 : "forbidden",
        }),
      ).toThrow();
    },
  );

  it("rejects out-of-range confidence and unknown risk flags", () => {
    expect(() =>
      AdjustmentProposalSchema.parse({
        difficultyAction: "increase",
        recommendedDifficulty: 4,
        granularityAction: "maintain",
        targetSkills: ["modeling"],
        reasoning: "Raise the challenge.",
        riskFlags: ["invented-risk"],
        confidence: 1.2,
      }),
    ).toThrow();
  });
});
