import type { SubmitQuestInput } from "@/application/training/training-repository";
import { SKILL_KEYS } from "@/domain/training/constants";
import type {
  Quest,
  QuestAssignment,
  SubmissionEvaluation,
  TrainingState,
} from "@/domain/training/types";

const MAX_REFLECTION_CHARS = 2_000;
const MAX_EVIDENCE_TEXT_CHARS = 500;
const MAX_RECENT_OUTCOMES = 10;
const MAX_ELIGIBLE_QUESTS = 20;
const MAX_AVAILABLE_RESOURCES = 12;

function truncate(value: string | undefined, maximum: number): string | undefined {
  const normalized = value?.trim();
  if (!normalized) return undefined;
  return normalized.slice(0, maximum);
}

export interface BuildAgentContextInput {
  state: TrainingState;
  assignment: QuestAssignment;
  quest: Quest;
  input: SubmitQuestInput;
  evaluation: SubmissionEvaluation;
}

export function buildAgentContext({
  state,
  assignment,
  quest,
  input,
  evaluation,
}: BuildAgentContextInput) {
  const availableResources = state.resources
    .filter((resource) => resource.availabilityStatus === "available")
    .slice(0, MAX_AVAILABLE_RESOURCES)
    .map((resource) => ({
      id: resource.id,
      title: resource.title,
      resourceType: resource.resourceType,
      difficulty: resource.difficulty,
      estimatedMinutes: resource.estimatedMinutes,
      skillTags: resource.skillTags,
    }));
  const availableResourceIds = new Set(
    availableResources.map((resource) => resource.id),
  );
  const assignedQuestIds = new Set(
    Object.values(state.assignments).map((item) => item.questId),
  );
  const eligibleQuests = Object.values(state.quests)
    .filter(
      (candidate) =>
        candidate.purpose === "training" &&
        candidate.id !== quest.id &&
        !assignedQuestIds.has(candidate.id) &&
        candidate.resourceIds.every((id) => availableResourceIds.has(id)),
    )
    .slice(0, MAX_ELIGIBLE_QUESTS)
    .map((candidate) => ({
      id: candidate.id,
      title: candidate.title,
      scope: candidate.scope,
      difficulty: candidate.difficulty,
      estimatedMinutes: candidate.estimatedMinutes,
      successMetrics: candidate.successMetrics.slice(0, 3),
      expectedArtifactType: candidate.expectedArtifactType ?? null,
      resourceIds: candidate.resourceIds,
    }));
  const recentAssignments = Object.values(state.assignments)
    .sort((left, right) => right.assignedAt.localeCompare(left.assignedAt))
    .slice(0, MAX_RECENT_OUTCOMES);

  return {
    targetRole: state.profile.targetRole,
    dailyMinutes: state.profile.dailyMinutes,
    trainingStatus: state.profile.trainingStatus,
    consecutiveFailureDays: state.profile.consecutiveFailureDays,
    skills: Object.fromEntries(
      SKILL_KEYS.map((key) => [key, state.progress.skills[key].score]),
    ),
    currentAssignment: {
      id: assignment.id,
      status: assignment.status,
      checkpointIndex: assignment.checkpointIndex ?? null,
      dueAt: assignment.dueAt ?? null,
      hasPenaltySource: Boolean(assignment.penaltySourceAssignmentId),
    },
    currentQuest: {
      id: quest.id,
      title: quest.title,
      scope: quest.scope,
      difficulty: quest.difficulty,
      estimatedMinutes: quest.estimatedMinutes,
      acceptanceCriteria: quest.acceptanceCriteria.slice(0, 5),
      successMetrics: quest.successMetrics.slice(0, 5),
      evidenceRequirements: quest.evidenceRequirements.map((requirement) => ({
        id: requirement.id,
        type: requirement.type,
        required: requirement.required,
      })),
      expectedArtifactType: quest.expectedArtifactType ?? null,
      skillWeights: quest.skillWeights,
    },
    evidence: input.evidence.slice(0, 10).map((record) => ({
      requirementId: record.requirementId,
      type: record.type,
      hasUrl: Boolean(record.url),
      host: record.url ? safeHost(record.url) : null,
      text: truncate(record.text, MAX_EVIDENCE_TEXT_CHARS),
      metricName: truncate(record.metricName, 80),
      metricValue: record.metricValue,
    })),
    selfReflection: truncate(input.selfReflection, MAX_REFLECTION_CHARS) ?? "",
    deterministicEvaluation: evaluation,
    recentOutcomes: {
      total: recentAssignments.length,
      completed: recentAssignments.filter((item) => item.status === "completed").length,
      needsRevision: recentAssignments.filter(
        (item) => item.status === "needs_revision",
      ).length,
      expired: recentAssignments.filter((item) => item.status === "expired").length,
    },
    openPenaltyDebt: Object.values(state.assignments).some(
      (item) =>
        state.quests[item.questId]?.scope === "penalty" &&
        item.status !== "completed",
    ),
    eligibleQuests,
    availableResources,
  };
}

function safeHost(value: string): string | null {
  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
}

export type AgentContext = ReturnType<typeof buildAgentContext>;
