import type { IdGenerator } from "@/application/training/training-repository";
import type { EvidenceSubmissionView, QuestView } from "@/components/features/view-models";
import { localDateForInstant } from "@/domain/training/calendar";
import { selectHardestFeasibleQuest } from "@/domain/training/adaptive-selector";
import { TrainingStateSchema } from "@/domain/training/schemas";
import type { QuestAssignment, QuestScope, TrainingState } from "@/domain/training/types";

const SAMPLE_COMMIT_URL = "https://github.com/barrychung1112/MLevelUp/commit/76f5f7312e25c540e611bf52987ad80445dbdc21";
const ACTIVE_STATUSES = new Set(["assigned", "in_progress", "needs_revision"]);
const SCOPE_PRIORITY: Record<QuestScope, number> = {
  penalty: 0,
  daily: 1,
  main: 2,
  calibration: 3,
};

export function createSandboxSampleEvidence(quest: QuestView): EvidenceSubmissionView {
  const types = new Set(quest.evidenceTypes);
  return {
    evidenceType: quest.evidenceTypes[0] ?? "text",
    ...(types.has("url") ? { evidenceUrl: SAMPLE_COMMIT_URL } : {}),
    ...(types.has("file") ? {
      fileMetadata: {
        name: "validation-report.md",
        size: 2048,
        type: "text/markdown",
        lastModified: 0,
      },
    } : {}),
    ...(types.has("metric") ? { metricResult: "validation_accuracy: 0.842" } : {}),
    ...(types.has("text") ? {
      evidenceText: "The reproducible baseline uses a fixed split, records validation accuracy of 0.842, and documents the next experiment.",
    } : {}),
    selfReflection: "I used a fixed validation strategy, completed the measurable baseline, recorded the result, and identified error analysis as the next experiment.",
  };
}

export function selectNextSandboxAssignment(
  state: TrainingState,
  currentAssignmentId?: string,
): QuestAssignment | undefined {
  return Object.values(state.assignments)
    .filter((assignment) =>
      assignment.id !== currentAssignmentId && ACTIVE_STATUSES.has(assignment.status),
    )
    .sort((left, right) => {
      const leftScope = state.quests[left.questId]?.scope ?? "calibration";
      const rightScope = state.quests[right.questId]?.scope ?? "calibration";
      return SCOPE_PRIORITY[leftScope] - SCOPE_PRIORITY[rightScope]
        || left.assignedAt.localeCompare(right.assignedAt)
        || left.id.localeCompare(right.id);
    })[0];
}

export function ensureNextSandboxMission(
  state: TrainingState,
  now: string,
  ids: IdGenerator,
): TrainingState {
  if (selectNextSandboxAssignment(state)) return TrainingStateSchema.parse(state);

  const next = TrainingStateSchema.parse(state);
  const usedQuestIds = Object.values(next.assignments).map((assignment) => assignment.questId);
  const quest = selectHardestFeasibleQuest({
    quests: Object.values(next.quests).filter((candidate) =>
      candidate.purpose === "training"
      && candidate.scope !== "penalty"
      && candidate.trainingContract === next.profile.contract,
    ),
    skills: next.progress.skills,
    availableMinutes: next.profile.dailyMinutes,
    resources: next.resources,
    excludedQuestIds: usedQuestIds,
  });
  if (!quest) return next;

  const assignmentId = ids.next("assignment");
  next.assignments[assignmentId] = {
    id: assignmentId,
    questId: quest.id,
    assignedDate: localDateForInstant(now, next.profile.timezone),
    slot: quest.scope === "main" ? "primary" : "secondary",
    status: "assigned",
    assignedAt: now,
    dueAt: new Date(
      new Date(now).getTime() + quest.durationDays * 24 * 60 * 60 * 1_000,
    ).toISOString(),
  };
  return TrainingStateSchema.parse(next);
}

