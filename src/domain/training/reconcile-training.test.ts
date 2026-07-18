import { describe, expect, it } from "vitest";

import type { IdGenerator } from "@/application/training/training-repository";
import { createTrainingSeed } from "@/mocks/training/seed";

import type { Quest, QuestAssignment, TrainingState } from "./types";
import {
  abandonTraining,
  beginRecovery,
  reconcileTrainingState,
} from "./reconcile-training";

const NOW = "2026-07-25T08:00:00.000Z";

function ids(): IdGenerator {
  let value = 0;
  return { next: (prefix) => `${prefix}-${++value}` };
}

function assignment(
  id: string,
  questId: string,
  dueAt: string,
  status: QuestAssignment["status"] = "assigned",
): QuestAssignment {
  return {
    id,
    questId,
    assignedDate: dueAt.slice(0, 10),
    slot: "primary",
    status,
    assignedAt: "2026-07-24T08:00:00.000Z",
    dueAt,
  };
}

function state(): TrainingState {
  const seeded = createTrainingSeed(NOW);
  const main = seeded.quests["quest-standard-baseline"];
  const daily = seeded.quests["quest-standard-report"];
  const penalty = (id: string, title: string): Quest => ({
    ...daily,
    id,
    title,
    scope: "penalty",
    estimatedMinutes: 45,
    baseXp: 0,
  });

  return {
    ...seeded,
    quests: {
      [main.id]: main,
      [daily.id]: daily,
      "quest-penalty-main": penalty("quest-penalty-main", "Mainline recovery drill"),
      "quest-penalty-daily": penalty("quest-penalty-daily", "Daily recovery drill"),
    },
    assignments: {},
    submissions: {},
    feedback: {},
    artifacts: [{
      id: "artifact-archived",
      submissionId: "submission-old",
      assignmentId: "assignment-old",
      artifactType: "technicalWriteup",
      title: "Archived work",
      description: "Must survive a reset.",
      skillTags: ["communication"],
      qualityScore: 80,
      verificationStatus: "verified",
      createdAt: "2026-07-01T08:00:00.000Z",
    }],
    activity: [],
    xpEvents: [],
  };
}

describe("training reconciliation", () => {
  it("expires a daily mission exactly at its due time", () => {
    const current = state();
    current.assignments.daily = assignment(
      "daily",
      "quest-standard-report",
      NOW,
    );

    const result = reconcileTrainingState(current, NOW, ids());

    expect(result.state.assignments.daily).toMatchObject({ status: "expired", expiredAt: NOW });
  });

  it("compares deadlines as instants when Supabase returns a timezone offset", () => {
    const current = state();
    current.assignments.daily = assignment(
      "daily",
      "quest-standard-report",
      "2026-07-25T10:00:00+02:00",
    );

    const result = reconcileTrainingState(current, NOW, ids());

    expect(result.state.assignments.daily.status).toBe("expired");
  });

  it("creates one penalty for each missed mainline and daily obligation", () => {
    const current = state();
    current.assignments.main = assignment("main", "quest-standard-baseline", NOW);
    current.assignments.daily = assignment("daily", "quest-standard-report", NOW);

    const result = reconcileTrainingState(current, NOW, ids());
    const penalties = Object.values(result.state.assignments).filter(
      (item) => result.state.quests[item.questId].scope === "penalty",
    );

    expect(penalties).toHaveLength(2);
    expect(penalties.map((item) => item.penaltySourceAssignmentId).sort()).toEqual(["daily", "main"]);
    expect(penalties.every((item) => item.dueAt === "2026-07-26T08:00:00.000Z")).toBe(true);
    expect(penalties.find((item) => item.penaltySourceAssignmentId === "main")?.questId)
      .toBe("quest-penalty-main");
    expect(penalties.find((item) => item.penaltySourceAssignmentId === "daily")?.questId)
      .toBe("quest-penalty-daily");
  });

  it("does not duplicate penalties or failure-day increments when reconciliation repeats", () => {
    const current = state();
    current.assignments.daily = assignment("daily", "quest-standard-report", NOW);

    const first = reconcileTrainingState(current, NOW, ids());
    const second = reconcileTrainingState(first.state, NOW, ids());

    expect(Object.keys(second.state.assignments)).toHaveLength(2);
    expect(second.state.profile.consecutiveFailureDays).toBe(1);
    expect(second.effects).toEqual([]);
  });

  it("counts multiple failed obligations on one date as one failure day", () => {
    const current = state();
    current.assignments.main = assignment("main", "quest-standard-baseline", NOW);
    current.assignments.daily = assignment("daily", "quest-standard-report", NOW);

    const result = reconcileTrainingState(current, NOW, ids());

    expect(result.state.profile.consecutiveFailureDays).toBe(1);
  });

  it("requires a decision after the seventh consecutive failure day", () => {
    const current = state();
    current.profile.consecutiveFailureDays = 6;
    current.assignments.daily = assignment("daily", "quest-standard-report", NOW);

    const result = reconcileTrainingState(current, NOW, ids());

    expect(result.state.profile.trainingStatus).toBe("failure_review");
    expect(result.effects).toContainEqual({ type: "failure_review_required" });
  });

  it("starts a 72-hour recovery window", () => {
    const current = state();
    current.profile.trainingStatus = "failure_review";

    const result = beginRecovery(current, NOW);

    expect(result.profile).toMatchObject({
      trainingStatus: "recovery",
      recoveryStartedAt: NOW,
      recoveryDeadline: "2026-07-28T08:00:00.000Z",
    });
  });

  it("does not expire or assign new work while recovery debt remains", () => {
    const current = state();
    current.profile.trainingStatus = "recovery";
    current.profile.recoveryStartedAt = "2026-07-24T08:00:00.000Z";
    current.profile.recoveryDeadline = "2026-07-27T08:00:00.000Z";
    current.assignments.penalty = {
      ...assignment("penalty", "quest-penalty-daily", "2026-07-24T20:00:00.000Z"),
      penaltySourceAssignmentId: "old-daily",
    };
    current.assignments.daily = assignment("daily", "quest-standard-report", NOW);

    const result = reconcileTrainingState(current, NOW, ids());

    expect(result.state.assignments).toEqual(current.assignments);
    expect(result.effects).toEqual([]);
  });

  it("returns to normal after every penalty debt is completed", () => {
    const current = state();
    current.profile.trainingStatus = "recovery";
    current.profile.recoveryStartedAt = "2026-07-24T08:00:00.000Z";
    current.profile.recoveryDeadline = "2026-07-27T08:00:00.000Z";
    current.assignments.penalty = {
      ...assignment("penalty", "quest-penalty-daily", "2026-07-26T08:00:00.000Z", "completed"),
      completedAt: NOW,
      penaltySourceAssignmentId: "old-daily",
    };

    const result = reconcileTrainingState(current, NOW, ids());

    expect(result.state.profile).toMatchObject({
      trainingStatus: "normal",
      consecutiveFailureDays: 0,
      recoveryStartedAt: null,
      recoveryDeadline: null,
    });
    expect(result.effects).toContainEqual({ type: "recovery_completed" });
  });

  it("automatically resets progress after an expired recovery window and preserves artifacts", () => {
    const current = state();
    current.profile.onboardingCompleted = true;
    current.profile.challengeAcceptedAt = "2026-07-01T08:00:00.000Z";
    current.profile.trainingStatus = "recovery";
    current.profile.recoveryStartedAt = "2026-07-22T08:00:00.000Z";
    current.profile.recoveryDeadline = NOW;
    current.progress.totalXp = 500;
    current.progress.level = 4;
    current.assignments.penalty = {
      ...assignment("penalty", "quest-penalty-daily", NOW),
      penaltySourceAssignmentId: "old-daily",
    };

    const result = reconcileTrainingState(current, NOW, ids());

    expect(result.effects).toContainEqual({ type: "training_reset_required" });
    expect(result.state.progress).toMatchObject({ totalXp: 0, level: 1, currentStreak: 0 });
    expect(result.state.assignments).toEqual({});
    expect(result.state.profile).toMatchObject({
      onboardingCompleted: false,
      challengeAcceptedAt: null,
      trainingStatus: "normal",
    });
    expect(result.state.artifacts.map((artifact) => artifact.id)).toEqual(["artifact-archived"]);
    expect(result.state.activity).toContainEqual(expect.objectContaining({ type: "trainingReset" }));
  });

  it("uses the same reset behavior when the user abandons the challenge", () => {
    const current = state();
    current.progress.totalXp = 500;
    current.assignments.daily = assignment("daily", "quest-standard-report", NOW);

    const result = abandonTraining(current, NOW);

    expect(result.progress.totalXp).toBe(0);
    expect(result.assignments).toEqual({});
    expect(result.artifacts).toHaveLength(1);
  });
});
