import { describe, expect, test } from "vitest";

import type { QuestView } from "@/components/features/view-models";
import { createTrainingSeed } from "@/mocks/training/seed";

import {
  createSandboxSampleEvidence,
  ensureNextSandboxMission,
  selectNextSandboxAssignment,
} from "./sandbox-mission-flow";

const NOW = "2026-07-21T12:00:00.000Z";

const quest: QuestView = {
  id: "assignment-calibration",
  title: "The Courage to Begin",
  summary: "Complete a measurable baseline.",
  difficulty: 4,
  estimatedMinutes: 90,
  status: "in_progress",
  primarySkill: "Modeling",
  acceptanceCriteria: ["Submit complete evidence"],
  evidenceTypes: ["url", "file", "metric", "text"],
  scope: "calibration",
  dueAt: null,
  durationDays: 1,
  executionSteps: ["Run the baseline"],
  successMetrics: ["Report one validation metric"],
  outOfScope: ["Production deployment"],
  resources: [],
};

describe("sandbox mission flow", () => {
  test("creates deterministic sample values for every evidence control", () => {
    expect(createSandboxSampleEvidence(quest)).toEqual({
      evidenceType: "url",
      evidenceUrl: "https://github.com/barrychung1112/MLevelUp/commit/76f5f7312e25c540e611bf52987ad80445dbdc21",
      fileMetadata: {
        name: "validation-report.md",
        size: 2048,
        type: "text/markdown",
        lastModified: 0,
      },
      metricResult: "validation_accuracy: 0.842",
      evidenceText: expect.stringContaining("reproducible baseline"),
      selfReflection: expect.stringContaining("validation strategy"),
    });
  });

  test("selects penalty before daily and mainline assignments", () => {
    const state = createTrainingSeed(NOW);
    const [first, second] = Object.values(state.assignments);
    state.quests[first.questId].scope = "main";
    state.quests[second.questId].scope = "daily";
    state.assignments.penalty = {
      ...second,
      id: "penalty",
      questId: "quest-penalty-daily",
      status: "assigned",
    };

    expect(selectNextSandboxAssignment(state, "completed-id")?.id).toBe("penalty");
    state.assignments.penalty.status = "completed";
    expect(selectNextSandboxAssignment(state, "completed-id")?.id).toBe(second.id);
    state.assignments[second.id].status = "completed";
    expect(selectNextSandboxAssignment(state, "completed-id")?.id).toBe(first.id);
  });

  test("assigns one unused feasible catalog mission when no active work remains", () => {
    const state = createTrainingSeed(NOW);
    for (const assignment of Object.values(state.assignments)) assignment.status = "completed";
    let sequence = 0;

    const next = ensureNextSandboxMission(state, NOW, {
      next: (prefix) => `${prefix}-continuation-${++sequence}`,
    });

    const active = Object.values(next.assignments).filter((assignment) => assignment.status === "assigned");
    expect(active).toHaveLength(1);
    expect(state.assignments[active[0].id]).toBeUndefined();
    expect(next.quests[active[0].questId].purpose).toBe("training");
  });
});

