import { describe, expect, test } from "vitest";

import { createTrainingSeed } from "@/mocks/training/seed";

import { executeSubmitQuest } from "./submit-quest";

describe("submit quest use case", () => {
  test("canonicalizes input before evaluation and state persistence", () => {
    const now = "2026-07-16T16:00:00.000Z";
    const state = createTrainingSeed(now);
    const assignment = Object.values(state.assignments).find(
      (candidate) => !state.quests[candidate.questId].optional,
    );
    if (!assignment) throw new Error("missing primary assignment");
    assignment.status = "in_progress";
    let sequence = 0;

    const outcome = executeSubmitQuest(
      state,
      {
        idempotencyKey: "  canonical-use-case  ",
        assignmentId: `  ${assignment.id}  `,
        evidence: [
          {
            id: "  evidence-canonical  ",
            requirementId: "  commit  ",
            type: "githubCommit",
            url: "  https://github.com/acme/ml-project/commit/abcdef  ",
          },
        ],
        selfReflection:
          "  This experiment documents the validation split, baseline tradeoffs, and the next evaluation step in enough detail.  ",
      },
      {
        now,
        ids: { next: (prefix) => `${prefix}-canonical-${++sequence}` },
      },
    );

    expect(outcome.submission.verificationStatus).toBe("verified");
    expect(outcome.submission.idempotencyKey).toBe("canonical-use-case");
    expect(outcome.submission.assignmentId).toBe(assignment.id);
    expect(outcome.submission.evidence[0]).toMatchObject({
      id: "evidence-canonical",
      requirementId: "commit",
      url: "https://github.com/acme/ml-project/commit/abcdef",
    });
  });

  test("uses evidence for the expected artifact type as the portfolio URL", () => {
    const now = "2026-07-16T16:00:00.000Z";
    const state = createTrainingSeed(now);
    const assignment = Object.values(state.assignments).find(
      (candidate) => !state.quests[candidate.questId].optional,
    );
    if (!assignment) throw new Error("missing primary assignment");
    assignment.status = "in_progress";
    state.quests[assignment.questId].evidenceRequirements.push({
      id: "demo",
      type: "deployedApp",
      required: false,
    });
    let sequence = 0;

    const outcome = executeSubmitQuest(
      state,
      {
        idempotencyKey: "artifact-url-selection",
        assignmentId: assignment.id,
        evidence: [
          {
            id: "evidence-demo",
            requirementId: "demo",
            type: "deployedApp",
            url: "https://demo.example.com",
          },
          {
            id: "evidence-commit",
            requirementId: "commit",
            type: "githubCommit",
            url: "https://github.com/acme/ml-project/commit/abcdef",
          },
        ],
        selfReflection:
          "This experiment documents the validation split, baseline tradeoffs, and the next evaluation step in enough detail.",
      },
      {
        now,
        ids: { next: (prefix) => `${prefix}-artifact-${++sequence}` },
      },
    );

    expect(outcome.state.artifacts).toHaveLength(1);
    expect(outcome.state.artifacts[0].artifactUrl).toBe(
      "https://github.com/acme/ml-project/commit/abcdef",
    );
  });
});
