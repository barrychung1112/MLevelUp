import type {
  AdjustmentProposal,
  CoordinatorFeedback,
} from "@/ai/contracts";

import { SKILL_KEYS } from "./constants";
import type {
  Difficulty,
  SkillWeights,
  SubmissionEvaluation,
  TrainingStatus,
} from "./types";

const MIN_AI_CONFIDENCE = 0.6;
const AI_WEIGHT_SHARE = 0.2;

export interface AiPolicyInput {
  deterministicEvaluation: SubmissionEvaluation;
  coordinator: CoordinatorFeedback;
  adjustment: AdjustmentProposal;
  baselineSkillWeights: SkillWeights;
  currentDifficulty: Difficulty;
  trainingStatus: TrainingStatus;
  hasOpenPenaltyDebt: boolean;
  eligibleQuestIds: string[];
  recommendedQuestId: string | null;
}

export interface AiPolicyResult {
  source: "ai";
  evaluation: SubmissionEvaluation;
  skillWeights: SkillWeights;
  adjustment: AdjustmentProposal;
  recommendedQuestId: string | null;
  summary: string;
  strengths: string[];
  improvements: string[];
  nextActions: string[];
  explanation: string;
  confidence: number;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalizeActiveWeights(
  weights: SkillWeights,
  baseline: SkillWeights,
): SkillWeights | null {
  const activeTotal = SKILL_KEYS.reduce(
    (total, key) => total + (baseline[key] > 0 ? weights[key] : 0),
    0,
  );
  if (!Number.isFinite(activeTotal) || activeTotal <= 0) return null;

  return Object.fromEntries(
    SKILL_KEYS.map((key) => [
      key,
      baseline[key] > 0 ? weights[key] / activeTotal : 0,
    ]),
  ) as SkillWeights;
}

function redistributeWeights(
  baseline: SkillWeights,
  suggested: SkillWeights,
): SkillWeights {
  const normalizedSuggestion = normalizeActiveWeights(suggested, baseline);
  if (!normalizedSuggestion) return { ...baseline };

  const blended = Object.fromEntries(
    SKILL_KEYS.map((key) => [
      key,
      baseline[key] === 0
        ? 0
        : baseline[key] * (1 - AI_WEIGHT_SHARE) +
          normalizedSuggestion[key] * AI_WEIGHT_SHARE,
    ]),
  ) as SkillWeights;
  const total = SKILL_KEYS.reduce((sum, key) => sum + blended[key], 0);
  if (total <= 0) return { ...baseline };

  return Object.fromEntries(
    SKILL_KEYS.map((key) => [key, blended[key] / total]),
  ) as SkillWeights;
}

function acceptedAdjustment(input: AiPolicyInput): AdjustmentProposal {
  const confident = input.adjustment.confidence >= MIN_AI_CONFIDENCE;
  let recommendedDifficulty = confident
    ? clamp(
        input.adjustment.recommendedDifficulty,
        input.currentDifficulty - 1,
        input.currentDifficulty + 1,
      )
    : input.currentDifficulty;
  recommendedDifficulty = clamp(recommendedDifficulty, 1, 5);

  if (input.trainingStatus === "recovery") {
    recommendedDifficulty = Math.min(
      recommendedDifficulty,
      input.currentDifficulty,
    );
  }

  const difficultyAction =
    recommendedDifficulty < input.currentDifficulty
      ? "decrease"
      : recommendedDifficulty > input.currentDifficulty
        ? "increase"
        : "maintain";

  return {
    ...input.adjustment,
    difficultyAction,
    recommendedDifficulty: recommendedDifficulty as Difficulty,
    granularityAction:
      input.hasOpenPenaltyDebt || input.trainingStatus === "recovery"
        ? "split"
        : confident
          ? input.adjustment.granularityAction
          : "maintain",
    targetSkills: input.adjustment.targetSkills.filter(
      (key) => input.baselineSkillWeights[key] > 0,
    ),
  };
}

export function adjudicateAiFeedback(input: AiPolicyInput): AiPolicyResult {
  const hasHardFailure =
    input.deterministicEvaluation.hardFailures.length > 0 ||
    input.deterministicEvaluation.verificationStatus !== "verified";
  const confident = input.coordinator.confidence >= MIN_AI_CONFIDENCE;
  const deterministicScore = hasHardFailure
    ? Math.min(59, input.deterministicEvaluation.qualityScore)
    : input.deterministicEvaluation.qualityScore;
  const qualityScore =
    hasHardFailure || !confident
      ? deterministicScore
      : clamp(
          input.coordinator.suggestedQualityScore,
          Math.max(0, deterministicScore - 15),
          Math.min(100, deterministicScore + 5),
        );
  const skillWeights = confident
    ? redistributeWeights(
        input.baselineSkillWeights,
        input.coordinator.suggestedSkillWeights,
      )
    : { ...input.baselineSkillWeights };
  const recommendationAllowed =
    !input.hasOpenPenaltyDebt &&
    input.trainingStatus !== "recovery" &&
    input.recommendedQuestId !== null &&
    input.eligibleQuestIds.includes(input.recommendedQuestId);

  return {
    source: "ai",
    evaluation: {
      ...input.deterministicEvaluation,
      qualityScore,
    },
    skillWeights,
    adjustment: acceptedAdjustment(input),
    recommendedQuestId: recommendationAllowed
      ? input.recommendedQuestId
      : null,
    summary: input.coordinator.summary,
    strengths: input.coordinator.strengths,
    improvements: input.coordinator.improvements,
    nextActions: input.coordinator.nextActions,
    explanation: input.coordinator.explanation,
    confidence: input.coordinator.confidence,
  };
}
