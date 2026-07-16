import type { Quest, QuestAssignment, TrainingState } from "./types";

const SLOT_ORDER: Record<QuestAssignment["slot"], number> = {
  primary: 0,
  secondary: 1,
  optional: 2,
};

export function selectAssignmentsForDate(
  state: TrainingState,
  date: string,
): QuestAssignment[] {
  return Object.values(state.assignments)
    .filter((assignment) => assignment.assignedDate === date)
    .sort((left, right) => SLOT_ORDER[left.slot] - SLOT_ORDER[right.slot]);
}

export function selectPrimaryAssignment(
  state: TrainingState,
  date: string,
): { assignment: QuestAssignment; quest: Quest } | undefined {
  const assignment = selectAssignmentsForDate(state, date).find(
    (candidate) => candidate.slot === "primary",
  );
  if (!assignment) return undefined;
  const quest = state.quests[assignment.questId];
  return quest ? { assignment, quest } : undefined;
}
