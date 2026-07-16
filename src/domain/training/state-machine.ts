import type { AssignmentStatus } from "./types";

const TERMINAL_STATES = new Set<AssignmentStatus>([
  "completed",
  "rejected",
  "skipped",
  "expired",
]);

const ALLOWED_TRANSITIONS: Record<AssignmentStatus, readonly AssignmentStatus[]> = {
  assigned: ["in_progress", "skipped"],
  in_progress: ["submitted", "skipped"],
  submitted: ["reviewing"],
  reviewing: ["completed", "needs_revision", "rejected"],
  needs_revision: ["in_progress"],
  completed: [],
  rejected: [],
  skipped: [],
  expired: [],
};

export function transitionAssignment(
  current: AssignmentStatus,
  next: AssignmentStatus,
): AssignmentStatus {
  if (TERMINAL_STATES.has(current)) {
    throw new Error(`Assignment is in terminal state: ${current}`);
  }

  if (!ALLOWED_TRANSITIONS[current].includes(next)) {
    throw new Error(`Invalid assignment transition: ${current} -> ${next}`);
  }

  return next;
}
