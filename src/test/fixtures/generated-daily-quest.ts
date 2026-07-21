import type { GeneratedDailyQuestProposal } from "@/ai/daily-quest-contracts";

export const validGeneratedProposal: GeneratedDailyQuestProposal = {
  title: "Measure validation stability",
  summary: "Measure how a validation score changes across two random seeds.",
  instructions: "Create validation-stability.md with both scores and their absolute difference.",
  questType: "evaluationPractice",
  difficulty: 2,
  estimatedMinutes: 55,
  executionSteps: ["Run seed 11.", "Run seed 29.", "Write validation-stability.md."],
  acceptanceCriteria: ["Use one model configuration.", "Report both scores.", "Explain the absolute score difference."],
  successMetrics: ["Report two scores and their absolute difference to three decimals."],
  evidenceRequirements: [{ id: "report", type: "modelEvaluationReport", required: true }],
  skillWeights: {
    dataHandling: 0.05, modeling: 0.15, evaluation: 0.5, engineering: 0.1,
    researchSense: 0.05, productThinking: 0.05, communication: 0.1,
  },
  expectedArtifactType: "modelEvaluationReport",
  resourceIds: [],
  outOfScope: ["Do not tune hyperparameters."],
};
