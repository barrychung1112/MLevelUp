import { describe, expect, test } from "vitest";

import { createTrainingSeed } from "@/mocks/training/seed";

import { executeSubmitQuest } from "./submit-quest";

describe("submit quest use case", () => {
  test("uses only policy-gated score, skill weights, and feedback prose", () => {
    const now = "2026-07-18T18:00:00.000Z";
    const state = createTrainingSeed(now);
    const assignment = Object.values(state.assignments).find(
      (candidate) => !state.quests[candidate.questId].optional,
    );
    if (!assignment) throw new Error("missing primary assignment");
    assignment.status = "in_progress";
    const quest = state.quests[assignment.questId];
    let sequence = 0;

    const outcome = executeSubmitQuest(
      state,
      {
        idempotencyKey: "ai-enriched-submission",
        assignmentId: assignment.id,
        evidence: [{
          id: "evidence-commit",
          requirementId: "commit",
          type: "githubCommit",
          url: "https://github.com/acme/ml-project/commit/abcdef",
        }],
        selfReflection:
          "This experiment records the validation split, baseline tradeoffs, error pattern, and the next measurable evaluation step.",
      },
      {
        now,
        ids: { next: (prefix) => `${prefix}-ai-${++sequence}` },
        adjudication: {
          source: "ai",
          evaluation: {
            qualityScore: 80,
            verificationStatus: "verified",
            verificationMethod: "mock",
            scoreBreakdown: {
              evidenceCompleteness: 45,
              evidenceValidity: 25,
              reflection: 15,
              artifactReadiness: 10,
            },
            artifactReady: true,
            hardFailures: [],
          },
          skillWeights: {
            ...quest.skillWeights,
            modeling: quest.skillWeights.modeling - 0.1,
            evaluation: quest.skillWeights.evaluation + 0.1,
          },
          summary: "The evidence is complete, but error analysis can improve.",
          strengths: ["The experiment is reproducible."],
          improvements: ["Segment the largest errors."],
          nextActions: ["Create one error slice table."],
          explanation: "Evaluation needs more deliberate practice.",
          confidence: 0.84,
          model: "gpt-5.6-terra",
          promptVersion: "phase3-v1",
          recommendedQuestId: "quest-next",
        },
      },
    );

    const feedback = Object.values(outcome.state.feedback).find(
      (item) => item.submissionId === outcome.submission.id,
    );
    expect(outcome.submission.qualityScore).toBe(80);
    expect(outcome.evaluation.qualityScore).toBe(80);
    expect(feedback).toMatchObject({
      source: "ai",
      summary: "The evidence is complete, but error analysis can improve.",
      model: "gpt-5.6-terra",
      promptVersion: "phase3-v1",
      aiConfidence: 0.84,
      adjustmentExplanation: "Evaluation needs more deliberate practice.",
      recommendedQuestId: "quest-next",
    });
    expect(outcome.state.progress.skills.evaluation.skillXp).toBeGreaterThan(
      state.progress.skills.evaluation.skillXp,
    );
  });

  test("keeps deterministic Demo feedback when no adjudication is supplied", () => {
    const now = "2026-07-18T18:00:00.000Z";
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
        idempotencyKey: "demo-submission",
        assignmentId: assignment.id,
        evidence: [{
          id: "evidence-commit",
          requirementId: "commit",
          type: "githubCommit",
          url: "https://github.com/acme/ml-project/commit/abcdef",
        }],
        selfReflection:
          "This experiment records the validation split, baseline tradeoffs, error pattern, and the next measurable evaluation step.",
      },
      {
        now,
        ids: { next: (prefix) => `${prefix}-demo-${++sequence}` },
      },
    );
    const feedback = Object.values(outcome.state.feedback).find(
      (item) => item.submissionId === outcome.submission.id,
    );

    expect(feedback?.source).toBe("demo");
    expect(feedback?.summary).toContain("Demo mode");
  });

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
