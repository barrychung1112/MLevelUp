import { describe, expect, it, vi } from "vitest";

import type { AiWorkflowOutcome } from "@/ai/run-feedback-workflow";
import { createTrainingSeed } from "@/mocks/training/seed";

import {
  SubmissionAssignmentNotFoundError,
  submitWithFeedback,
  type AiSubmissionRepository,
} from "./submit-with-feedback";

function fixtureRepository() {
  const state = createTrainingSeed("2026-07-18T18:00:00.000Z");
  const assignment = Object.values(state.assignments)[0];
  assignment.status = "in_progress";
  const submitQuestWithAdjudication = vi.fn();
  return {
    state,
    assignment,
    repository: {
      getSnapshot: vi.fn().mockResolvedValue(state),
      submitQuestWithAdjudication,
    } as unknown as AiSubmissionRepository,
    submitQuestWithAdjudication,
  };
}

describe("submitWithFeedback", () => {
  it("returns an idempotent prior submission without invoking AI", async () => {
    const { state, assignment, repository, submitQuestWithAdjudication } =
      fixtureRepository();
    const prior = {
      id: "submission-prior",
      idempotencyKey: "same-key",
      assignmentId: assignment.id,
      revisionNo: 1,
      evidence: [],
      selfReflection: "Prior reflection",
      verificationStatus: "verified" as const,
      verificationMethod: "automatic" as const,
      qualityScore: 80,
      scoreBreakdown: {
        evidenceCompleteness: 35,
        evidenceValidity: 20,
        reflection: 15,
        artifactReadiness: 10,
      },
      hardFailures: [],
      submittedAt: "2026-07-18T18:00:00.000Z",
    };
    state.submissions[prior.id] = prior;
    const workflow = vi.fn();

    const result = await submitWithFeedback(
      {
        idempotencyKey: "same-key",
        assignmentId: assignment.id,
        evidence: [],
        selfReflection: "Retry",
      },
      { repository, workflow },
    );

    expect(result.submission).toBe(prior);
    expect(workflow).not.toHaveBeenCalled();
    expect(submitQuestWithAdjudication).not.toHaveBeenCalled();
  });

  it("runs deterministic evaluation before workflow and persists its adjudication", async () => {
    const { state, assignment, repository, submitQuestWithAdjudication } =
      fixtureRepository();
    const quest = state.quests[assignment.questId];
    const workflowResult: AiWorkflowOutcome = {
      source: "ai_fallback",
      errorCode: "missing_configuration",
      adjudication: {
        source: "ai_fallback",
        evaluation: {
          qualityScore: 0,
          verificationStatus: "needs_revision",
          verificationMethod: null,
          scoreBreakdown: {
            evidenceCompleteness: 0,
            evidenceValidity: 0,
            reflection: 0,
            artifactReadiness: 0,
          },
          artifactReady: false,
          hardFailures: [`Missing required evidence: ${quest.evidenceRequirements[0].id}`],
        },
        skillWeights: quest.skillWeights,
        summary: "Evidence needs revision.",
        strengths: [],
        improvements: ["Add the required evidence."],
        nextActions: ["Submit a new revision."],
        explanation: "Deterministic fallback.",
      },
      diagnostics: [],
    };
    const workflow = vi.fn().mockResolvedValue(workflowResult);
    submitQuestWithAdjudication.mockResolvedValue({ ok: true });
    const input = {
      idempotencyKey: "new-key",
      assignmentId: assignment.id,
      evidence: [],
      selfReflection: "",
    };

    await submitWithFeedback(input, { repository, workflow });

    expect(workflow).toHaveBeenCalledWith(
      expect.objectContaining({
        deterministicEvaluation: expect.objectContaining({
          verificationStatus: "needs_revision",
        }),
      }),
    );
    expect(submitQuestWithAdjudication).toHaveBeenCalledWith(
      input,
      workflowResult.adjudication,
      [],
    );
  });

  it("rejects unknown assignments before invoking AI", async () => {
    const { repository } = fixtureRepository();
    const workflow = vi.fn();

    await expect(
      submitWithFeedback(
        {
          idempotencyKey: "unknown-key",
          assignmentId: "unknown-assignment",
          evidence: [],
          selfReflection: "",
        },
        { repository, workflow },
      ),
    ).rejects.toBeInstanceOf(SubmissionAssignmentNotFoundError);
    expect(workflow).not.toHaveBeenCalled();
  });
});
