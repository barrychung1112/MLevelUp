import { selectHardestFeasibleQuest } from "@/domain/training/adaptive-selector";
import type { QuestAssignment, TrainingState } from "@/domain/training/types";

export type DailyGenerationReason = "assigned" | "already_assigned" | "penalty_priority" | "resource_gap";

export interface DailyGenerationOutcome {
  state: TrainingState;
  reason: DailyGenerationReason;
  createdAssignment?: QuestAssignment;
}

export function generateDailyTraining(input: {
  state: TrainingState;
  now: string;
  localDate: string;
  nextId: () => string;
}): DailyGenerationOutcome {
  const state = structuredClone(input.state);
  const assignments = Object.values(state.assignments);
  const dailyAssignments = assignments.filter((assignment) =>
    assignment.assignedDate === input.localDate && state.quests[assignment.questId]?.scope === "daily",
  );
  if (dailyAssignments.length > 0) return { state, reason: "already_assigned" };

  const hasOpenPenalty = assignments.some((assignment) =>
    state.quests[assignment.questId]?.scope === "penalty" && assignment.status !== "completed",
  );
  if (hasOpenPenalty) return { state, reason: "penalty_priority" };

  const quest = selectHardestFeasibleQuest({
    quests: Object.values(state.quests).filter((candidate) =>
      candidate.scope === "daily" && candidate.trainingContract === state.profile.contract,
    ),
    skills: state.progress.skills,
    weeklyMinutes: state.profile.weeklyMinutes,
    excludedQuestIds: assignments.map((assignment) => assignment.questId),
    resources: state.resources,
  });
  if (!quest) return { state, reason: "resource_gap" };

  const createdAssignment: QuestAssignment = {
    id: input.nextId(), questId: quest.id, assignedDate: input.localDate, slot: "secondary",
    status: "assigned", assignedAt: input.now,
  };
  state.assignments[createdAssignment.id] = createdAssignment;
  return { state, reason: "assigned", createdAssignment };
}
