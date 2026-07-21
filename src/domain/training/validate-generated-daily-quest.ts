import type { GeneratedDailyQuestProposal } from "@/ai/daily-quest-contracts";
import type { DailyQuestGenerationContext } from "@/ai/daily-quest-context";

export type GeneratedQuestRejectionCode =
  | "over_duration_limit"
  | "over_difficulty_ceiling"
  | "missing_required_evidence"
  | "unmeasurable_acceptance"
  | "invalid_skill_weights"
  | "duplicate_recent_quest"
  | "invalid_resource_reference"
  | "unsafe_or_paid_dependency";

export type GeneratedQuestValidation =
  | { accepted: true }
  | { accepted: false; code: GeneratedQuestRejectionCode };

const UNSAFE_PATTERN = /\b(buy|purchase|paid plan|credit card|api secret|api key|password|sudo|administrator|delete all|drop table|rm -rf)\b/iu;
const MEASURABLE_PATTERN = /\b(\d+|score|metric|count|percentage|percent|difference|compare|at least|at most|latency|accuracy|precision|recall|f1|auc|rmse|mae|seconds?|minutes?|rows?|files?|commits?)\b/iu;

function tokens(value: string): Set<string> {
  return new Set(
    value
      .toLocaleLowerCase("en-US")
      .replace(/[^a-z0-9]+/gu, " ")
      .trim()
      .split(/\s+/u)
      .filter((token) => token.length > 2),
  );
}

function overlap(left: string, right: string): number {
  const leftTokens = tokens(left);
  const rightTokens = tokens(right);
  const denominator = Math.min(leftTokens.size, rightTokens.size);
  if (denominator === 0) return 0;
  let shared = 0;
  for (const token of leftTokens) if (rightTokens.has(token)) shared += 1;
  return shared / denominator;
}

export function validateGeneratedDailyQuest(input: {
  proposal: GeneratedDailyQuestProposal;
  context: DailyQuestGenerationContext;
}): GeneratedQuestValidation {
  const { proposal, context } = input;
  if (proposal.estimatedMinutes > 60) {
    return { accepted: false, code: "over_duration_limit" };
  }
  if (proposal.difficulty > context.difficultyCeiling) {
    return { accepted: false, code: "over_difficulty_ceiling" };
  }
  if (!proposal.evidenceRequirements.some((requirement) => requirement.required)) {
    return { accepted: false, code: "missing_required_evidence" };
  }
  if (!proposal.successMetrics.some((metric) => MEASURABLE_PATTERN.test(metric))) {
    return { accepted: false, code: "unmeasurable_acceptance" };
  }
  const weightTotal = Object.values(proposal.skillWeights).reduce((sum, weight) => sum + weight, 0);
  if (weightTotal < 0.99 || weightTotal > 1.01) {
    return { accepted: false, code: "invalid_skill_weights" };
  }
  if (context.recentDailyQuests.some((quest) => overlap(proposal.title, quest.title) >= 0.75)) {
    return { accepted: false, code: "duplicate_recent_quest" };
  }
  const targetedSkills = new Set(
    Object.entries(proposal.skillWeights)
      .filter(([, weight]) => weight > 0)
      .map(([skill]) => skill),
  );
  const resourcesById = new Map(context.availableResources.map((resource) => [resource.id, resource]));
  for (const resourceId of proposal.resourceIds) {
    const resource = resourcesById.get(resourceId);
    if (
      !resource ||
      resource.availabilityStatus !== "available" ||
      resource.costTier !== "free" ||
      !resource.skillTags.some((skill) => targetedSkills.has(skill))
    ) {
      return { accepted: false, code: "invalid_resource_reference" };
    }
  }
  const safetyText = [
    proposal.title,
    proposal.summary,
    proposal.instructions,
    ...proposal.executionSteps,
    ...proposal.acceptanceCriteria,
    ...proposal.successMetrics,
  ].join(" ");
  if (UNSAFE_PATTERN.test(safetyText)) {
    return { accepted: false, code: "unsafe_or_paid_dependency" };
  }
  return { accepted: true };
}
