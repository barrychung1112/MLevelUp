import { z } from "zod";

import { SKILL_KEYS } from "@/domain/training/constants";

const SkillKeySchema = z.enum(SKILL_KEYS);
const ConfidenceSchema = z.number().min(0).max(1);
const ShortTextSchema = z.string().trim().min(1).max(400);
const ItemListSchema = z.array(ShortTextSchema).min(1).max(3);

export const LearningStrategyProposalSchema = z.strictObject({
  recommendedQuestId: z.string().trim().min(1).max(120).nullable(),
  checkpointFocus: ShortTextSchema,
  expectedEvidence: ItemListSchema,
  successMeasures: ItemListSchema,
  reasoning: z.string().trim().min(1).max(800),
  portfolioOutcome: z.string().trim().min(1).max(80).nullable(),
  confidence: ConfidenceSchema,
});

export type LearningStrategyProposal = z.infer<
  typeof LearningStrategyProposalSchema
>;

export const AdjustmentRiskFlagSchema = z.enum([
  "repeated_revision",
  "missed_deadline",
  "open_penalty_debt",
  "recovery_active",
  "skill_gap",
  "overload_risk",
]);

export const AdjustmentProposalSchema = z.strictObject({
  difficultyAction: z.enum(["decrease", "maintain", "increase"]),
  recommendedDifficulty: z.number().int().min(1).max(5),
  granularityAction: z.enum(["split", "maintain", "combine"]),
  targetSkills: z.array(SkillKeySchema).max(2),
  reasoning: z.string().trim().min(1).max(800),
  riskFlags: z.array(AdjustmentRiskFlagSchema).max(4),
  confidence: ConfidenceSchema,
});

export type AdjustmentProposal = z.infer<typeof AdjustmentProposalSchema>;

export const AiSkillWeightsSchema = z.strictObject({
  dataHandling: z.number().min(0).max(1),
  modeling: z.number().min(0).max(1),
  evaluation: z.number().min(0).max(1),
  engineering: z.number().min(0).max(1),
  researchSense: z.number().min(0).max(1),
  productThinking: z.number().min(0).max(1),
  communication: z.number().min(0).max(1),
});

export const CoordinatorFeedbackSchema = z.strictObject({
  summary: z.string().trim().min(1).max(800),
  strengths: ItemListSchema,
  improvements: ItemListSchema,
  nextActions: ItemListSchema,
  suggestedQualityScore: z.number().int().min(0).max(100),
  suggestedSkillWeights: AiSkillWeightsSchema,
  explanation: z.string().trim().min(1).max(800),
  confidence: ConfidenceSchema,
});

export type CoordinatorFeedback = z.infer<typeof CoordinatorFeedbackSchema>;

export const AgentRunDiagnosticSchema = z.strictObject({
  agentType: z.enum(["learningStrategist", "adjuster", "coordinator"]),
  status: z.enum(["completed", "degraded"]),
  model: z.string().trim().min(1).max(120),
  promptVersion: z.string().trim().min(1).max(80),
  latencyMs: z.number().int().nonnegative(),
  inputTokens: z.number().int().nonnegative().nullable(),
  outputTokens: z.number().int().nonnegative().nullable(),
  errorCode: z.string().trim().min(1).max(80).nullable(),
  fallbackUsed: z.boolean(),
  traceId: z.string().trim().min(1).max(120),
  inputSummary: z.record(z.string(), z.unknown()),
  outputSummary: z.record(z.string(), z.unknown()),
});

export type AgentRunDiagnostic = z.infer<typeof AgentRunDiagnosticSchema>;

export const FeedbackWorkflowResultSchema = z.discriminatedUnion("source", [
  z.strictObject({
    source: z.literal("ai"),
    learningStrategy: LearningStrategyProposalSchema,
    adjustment: AdjustmentProposalSchema,
    coordinator: CoordinatorFeedbackSchema,
    diagnostics: z.array(AgentRunDiagnosticSchema).min(3).max(3),
  }),
  z.strictObject({
    source: z.literal("ai_fallback"),
    errorCode: z.string().trim().min(1).max(80),
    diagnostics: z.array(AgentRunDiagnosticSchema).max(3),
  }),
]);

export type FeedbackWorkflowResult = z.infer<
  typeof FeedbackWorkflowResultSchema
>;
