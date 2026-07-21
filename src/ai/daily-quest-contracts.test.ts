import { describe, expect, it } from "vitest";

import { GeneratedDailyQuestProposalSchema } from "./daily-quest-contracts";

const validProposal = {
  title: "Compare two validation strategies",
  summary: "Measure how a random split and a time-based split change model estimates.",
  instructions: "Create validation-report.md with both scores, the observed gap, and a recommendation.",
  questType: "evaluationPractice",
  difficulty: 3,
  estimatedMinutes: 60,
  executionSteps: [
    "Load the supplied dataset and identify its time column.",
    "Run the same baseline model with random and time-based splits.",
    "Write validation-report.md with the results and recommendation.",
  ],
  acceptanceCriteria: [
    "The report lists both validation scores.",
    "The same model configuration is used for both runs.",
    "The report recommends one strategy with a concrete reason.",
  ],
  successMetrics: ["Report the absolute difference between the two validation scores."],
  evidenceRequirements: [
    { id: "report", type: "systemDesignNote", required: true },
  ],
  skillWeights: {
    dataHandling: 0.1,
    modeling: 0.15,
    evaluation: 0.45,
    engineering: 0.1,
    researchSense: 0.05,
    productThinking: 0.05,
    communication: 0.1,
  },
  expectedArtifactType: "systemDesignNote",
  resourceIds: [],
  outOfScope: ["Do not tune model hyperparameters."],
};

describe("GeneratedDailyQuestProposalSchema", () => {
  it("accepts a complete evidence-producing daily quest", () => {
    expect(GeneratedDailyQuestProposalSchema.safeParse(validProposal).success).toBe(true);
  });

  it("rejects extra fields", () => {
    expect(GeneratedDailyQuestProposalSchema.safeParse({ ...validProposal, baseXp: 900 }).success).toBe(false);
  });

  it("rejects more than five execution steps", () => {
    expect(GeneratedDailyQuestProposalSchema.safeParse({
      ...validProposal,
      executionSteps: [...validProposal.executionSteps, "Fourth", "Fifth", "Sixth"],
    }).success).toBe(false);
  });

  it("rejects proposals without mandatory evidence", () => {
    expect(GeneratedDailyQuestProposalSchema.safeParse({
      ...validProposal,
      evidenceRequirements: [{ id: "report", type: "systemDesignNote", required: false }],
    }).success).toBe(false);
  });

  it("rejects unsupported quest and evidence types", () => {
    expect(GeneratedDailyQuestProposalSchema.safeParse({ ...validProposal, questType: "watchVideos" }).success).toBe(false);
    expect(GeneratedDailyQuestProposalSchema.safeParse({
      ...validProposal,
      evidenceRequirements: [{ id: "report", type: "verbalPromise", required: true }],
    }).success).toBe(false);
  });

  it("rejects skill weights outside zero through one", () => {
    expect(GeneratedDailyQuestProposalSchema.safeParse({
      ...validProposal,
      skillWeights: { ...validProposal.skillWeights, evaluation: 1.2 },
    }).success).toBe(false);
  });
});
