import { describe, expect, it } from "vitest";

import type { GeneratedDailyQuestProposal } from "@/ai/daily-quest-contracts";
import type { DailyQuestGenerationContext } from "@/ai/daily-quest-context";

import { validateGeneratedDailyQuest } from "./validate-generated-daily-quest";

const context: DailyQuestGenerationContext = {
  targetRole: "machine-learning-engineer",
  trainingStatus: "normal",
  difficultyCeiling: 3,
  weakestSkills: ["evaluation", "communication"],
  skills: {
    dataHandling: 35, modeling: 32, evaluation: 20, engineering: 30,
    researchSense: 28, productThinking: 25, communication: 22,
  },
  recentDailyQuests: [{ title: "Audit validation leakage", status: "completed", qualityScore: 84 }],
  portfolioArtifactCounts: {},
  availableResources: [{
    id: "resource-validation", title: "Validation guide", resourceType: "article",
    difficulty: 2, estimatedMinutes: 15, skillTags: ["evaluation"], costTier: "free",
    availabilityStatus: "available",
  }],
};

const proposal: GeneratedDailyQuestProposal = {
  title: "Compare two validation strategies",
  summary: "Compare estimates from random and time-based validation.",
  instructions: "Create validation-report.md containing both scores and a recommendation.",
  questType: "evaluationPractice",
  difficulty: 3,
  estimatedMinutes: 60,
  executionSteps: ["Prepare one dataset split.", "Run both validation strategies.", "Write validation-report.md."],
  acceptanceCriteria: ["Report both scores.", "Use the same model configuration.", "Explain the measured score gap."],
  successMetrics: ["Report the absolute score difference to three decimal places."],
  evidenceRequirements: [{ id: "report", type: "modelEvaluationReport", required: true }],
  skillWeights: {
    dataHandling: 0.1, modeling: 0.15, evaluation: 0.45, engineering: 0.1,
    researchSense: 0.05, productThinking: 0.05, communication: 0.1,
  },
  expectedArtifactType: "modelEvaluationReport",
  resourceIds: [],
  outOfScope: ["Do not tune hyperparameters."],
};

describe("validateGeneratedDailyQuest", () => {
  it("accepts a measurable self-contained quest without resources", () => {
    expect(validateGeneratedDailyQuest({ proposal, context })).toEqual({ accepted: true });
  });

  it.each([
    ["over_difficulty_ceiling", { difficulty: 4 }],
    ["missing_required_evidence", { evidenceRequirements: [{ id: "report", type: "modelEvaluationReport", required: false }] }],
    ["unmeasurable_acceptance", { successMetrics: ["Do a good job."] }],
    ["invalid_skill_weights", { skillWeights: { ...proposal.skillWeights, evaluation: 0.8 } }],
    ["invalid_resource_reference", { resourceIds: ["missing-resource"] }],
    ["duplicate_recent_quest", { title: "Audit validation leakage today" }],
    ["unsafe_or_paid_dependency", { instructions: "Buy a paid GPU plan and paste your API secret into validation-report.md." }],
  ] as const)("rejects %s", (code, patch) => {
    expect(validateGeneratedDailyQuest({ proposal: { ...proposal, ...patch } as GeneratedDailyQuestProposal, context })).toEqual({ accepted: false, code });
  });

  it("accepts a referenced available resource with target-skill overlap", () => {
    expect(validateGeneratedDailyQuest({
      proposal: { ...proposal, resourceIds: ["resource-validation"] },
      context,
    })).toEqual({ accepted: true });
  });
});
