import type { IdGenerator } from "@/application/training/training-repository";

import {
  FAILURE_REVIEW_THRESHOLD_DAYS,
  PENALTY_DUE_HOURS,
  RECOVERY_WINDOW_HOURS,
  SKILL_KEYS,
} from "./constants";
import type {
  QuestAssignment,
  QuestScope,
  SkillStats,
  TrainingState,
} from "./types";

export type TrainingEffect =
  | { type: "penalty_assigned"; sourceAssignmentId: string; assignmentId: string }
  | { type: "failure_review_required" }
  | { type: "recovery_completed" }
  | { type: "training_reset_required" };

function addHours(timestamp: string, hours: number): string {
  return new Date(new Date(timestamp).getTime() + hours * 60 * 60 * 1_000).toISOString();
}

function isAtOrAfter(timestamp: string, deadline: string): boolean {
  return new Date(timestamp).getTime() >= new Date(deadline).getTime();
}

function utcDate(timestamp: string): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function addUtcDays(date: string, days: number): string {
  const timestamp = new Date(`${date}T00:00:00.000Z`).getTime();
  return new Date(timestamp + days * 24 * 60 * 60 * 1_000).toISOString().slice(0, 10);
}

function isOpenObligation(assignment: QuestAssignment): boolean {
  return ["assigned", "in_progress", "needs_revision"].includes(assignment.status);
}

function isSourceScope(scope: QuestScope): scope is "main" | "daily" {
  return scope === "main" || scope === "daily";
}

function resetTraining(state: TrainingState, now: string): TrainingState {
  const next = structuredClone(state);
  const skills = Object.fromEntries(
    SKILL_KEYS.map((key) => [key, { score: 0, skillXp: 0, lastDelta: 0 }]),
  ) as SkillStats;

  next.profile = {
    ...next.profile,
    onboardingCompleted: false,
    challengeAcceptedAt: null,
    consecutiveFailureDays: 0,
    trainingStatus: "normal",
    recoveryStartedAt: null,
    recoveryDeadline: null,
  };
  next.progress = {
    totalXp: 0,
    level: 1,
    currentStreak: 0,
    longestStreak: 0,
    lastQualifiedDate: null,
    skills,
  };
  next.assignments = {};
  next.submissions = {};
  next.feedback = {};
  next.xpEvents = [];
  next.activity = [{
    id: `training-reset-${now}`,
    type: "trainingReset",
    sourceId: next.profile.id,
    title: "Training progress reset",
    summary: "The recovery window ended before all training debt was cleared.",
    occurredAt: now,
  }];

  return next;
}

function openPenaltyDebt(state: TrainingState): QuestAssignment[] {
  return Object.values(state.assignments).filter((assignment) => {
    const quest = state.quests[assignment.questId];
    return quest?.scope === "penalty" && assignment.status !== "completed";
  });
}

function selectPenaltyTemplate(state: TrainingState, sourceScope: "main" | "daily") {
  const templates = Object.values(state.quests)
    .filter((quest) => quest.scope === "penalty")
    .sort((left, right) => left.id.localeCompare(right.id));
  if (templates.length === 0) return undefined;
  return templates.find((quest) => quest.id.includes(sourceScope)) ?? templates[0];
}

function assignPendingPenalties(
  state: TrainingState,
  now: string,
  ids: IdGenerator,
): TrainingEffect[] {
  const effects: TrainingEffect[] = [];
  const today = utcDate(now);
  const assignments = Object.values(state.assignments);
  const coveredSources = new Set(
    assignments.flatMap((assignment) =>
      assignment.penaltySourceAssignmentId ? [assignment.penaltySourceAssignmentId] : [],
    ),
  );
  const scopesAssignedToday = new Set<"main" | "daily">();

  for (const penalty of assignments) {
    if (penalty.assignedDate !== today || !penalty.penaltySourceAssignmentId) continue;
    const source = state.assignments[penalty.penaltySourceAssignmentId];
    const sourceScope = source && state.quests[source.questId]?.scope;
    if (sourceScope && isSourceScope(sourceScope)) scopesAssignedToday.add(sourceScope);
  }

  const uncoveredFailures = assignments
    .filter((assignment) => {
      const scope = state.quests[assignment.questId]?.scope;
      return assignment.status === "expired" && scope && isSourceScope(scope) && !coveredSources.has(assignment.id);
    })
    .sort(
      (left, right) =>
        new Date(left.expiredAt ?? 0).getTime() - new Date(right.expiredAt ?? 0).getTime(),
    );

  for (const source of uncoveredFailures) {
    const sourceScope = state.quests[source.questId].scope;
    if (!isSourceScope(sourceScope) || scopesAssignedToday.has(sourceScope)) continue;
    const template = selectPenaltyTemplate(state, sourceScope);
    if (!template) continue;

    const assignmentId = ids.next("assignment");
    state.assignments[assignmentId] = {
      id: assignmentId,
      questId: template.id,
      assignedDate: today,
      slot: "secondary",
      status: "assigned",
      assignedAt: now,
      dueAt: addHours(now, PENALTY_DUE_HOURS),
      penaltySourceAssignmentId: source.id,
    };
    scopesAssignedToday.add(sourceScope);
    effects.push({ type: "penalty_assigned", sourceAssignmentId: source.id, assignmentId });
  }

  return effects;
}

function updateFailureStreak(
  state: TrainingState,
  previousFailureDates: readonly string[],
  today: string,
): void {
  if (previousFailureDates.includes(today)) return;
  const latestFailureDate = [...previousFailureDates].sort().at(-1);
  const continued = latestFailureDate === addUtcDays(today, -1) ||
    (latestFailureDate === undefined && state.profile.consecutiveFailureDays > 0);
  state.profile.consecutiveFailureDays = continued
    ? state.profile.consecutiveFailureDays + 1
    : 1;
}

export function reconcileTrainingState(
  state: TrainingState,
  now: string,
  ids: IdGenerator,
): { state: TrainingState; effects: TrainingEffect[] } {
  const next = structuredClone(state);

  if (next.profile.trainingStatus === "failure_review") {
    return { state: next, effects: [] };
  }

  if (next.profile.trainingStatus === "recovery") {
    if (openPenaltyDebt(next).length === 0) {
      next.profile.trainingStatus = "normal";
      next.profile.consecutiveFailureDays = 0;
      next.profile.recoveryStartedAt = null;
      next.profile.recoveryDeadline = null;
      return { state: next, effects: [{ type: "recovery_completed" }] };
    }
    if (next.profile.recoveryDeadline && isAtOrAfter(now, next.profile.recoveryDeadline)) {
      return {
        state: resetTraining(next, now),
        effects: [{ type: "training_reset_required" }],
      };
    }
    return { state: next, effects: [] };
  }

  const previousFailureDates = Object.values(next.assignments)
    .filter((assignment) => {
      const scope = next.quests[assignment.questId]?.scope;
      return Boolean(assignment.expiredAt && scope && isSourceScope(scope));
    })
    .map((assignment) => utcDate(assignment.expiredAt!));
  const newlyExpired: QuestAssignment[] = [];

  for (const assignment of Object.values(next.assignments)) {
    if (!assignment.dueAt || !isOpenObligation(assignment) || !isAtOrAfter(now, assignment.dueAt)) {
      continue;
    }
    const scope = next.quests[assignment.questId]?.scope;
    if (!scope || !isSourceScope(scope)) continue;
    assignment.status = "expired";
    assignment.expiredAt = now;
    newlyExpired.push(assignment);
  }

  const effects = assignPendingPenalties(next, now, ids);
  if (newlyExpired.length > 0) {
    updateFailureStreak(next, previousFailureDates, utcDate(now));
  }
  if (next.profile.consecutiveFailureDays >= FAILURE_REVIEW_THRESHOLD_DAYS) {
    next.profile.trainingStatus = "failure_review";
    effects.push({ type: "failure_review_required" });
  }

  return { state: next, effects };
}

export function beginRecovery(state: TrainingState, now: string): TrainingState {
  if (state.profile.trainingStatus !== "failure_review") {
    throw new Error("Recovery can only begin from failure review");
  }
  const next = structuredClone(state);
  next.profile.trainingStatus = "recovery";
  next.profile.recoveryStartedAt = now;
  next.profile.recoveryDeadline = addHours(now, RECOVERY_WINDOW_HOURS);
  return next;
}

export function abandonTraining(state: TrainingState, now: string): TrainingState {
  return resetTraining(state, now);
}
