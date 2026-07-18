import { describe, expect, it, vi } from "vitest";

import { SubmissionAssignmentNotFoundError } from "@/application/training/submit-with-feedback";
import { createTrainingSeed } from "@/mocks/training/seed";

import {
  ServerAuthenticationError,
  createSubmitQuestHandler,
} from "./route";

function validBody() {
  return {
    idempotencyKey: "route-key",
    assignmentId: "assignment-1",
    evidence: [],
    selfReflection: "A reflection",
  };
}

describe("POST /api/training/submit", () => {
  it("rejects missing bearer authentication before submission", async () => {
    const authenticate = vi.fn();
    const submit = vi.fn();
    const handler = createSubmitQuestHandler({ authenticate, submit });

    const response = await handler(
      new Request("http://localhost/api/training/submit", {
        method: "POST",
        body: JSON.stringify(validBody()),
      }),
    );

    expect(response.status).toBe(401);
    expect(authenticate).not.toHaveBeenCalled();
    expect(submit).not.toHaveBeenCalled();
  });

  it("rejects oversized payloads before authentication", async () => {
    const authenticate = vi.fn();
    const submit = vi.fn();
    const handler = createSubmitQuestHandler({ authenticate, submit });
    const response = await handler(
      new Request("http://localhost/api/training/submit", {
        method: "POST",
        headers: { authorization: "Bearer token" },
        body: JSON.stringify({ ...validBody(), selfReflection: "x".repeat(70_000) }),
      }),
    );

    expect(response.status).toBe(413);
    expect(authenticate).not.toHaveBeenCalled();
  });

  it("maps invalid tokens, malformed input, and unknown assignments", async () => {
    const invalidAuth = createSubmitQuestHandler({
      authenticate: vi.fn().mockRejectedValue(new ServerAuthenticationError()),
      submit: vi.fn(),
    });
    expect((await invalidAuth(new Request("http://localhost/api/training/submit", {
      method: "POST",
      headers: { authorization: "Bearer invalid" },
      body: JSON.stringify(validBody()),
    }))).status).toBe(401);

    const malformed = createSubmitQuestHandler({
      authenticate: vi.fn().mockResolvedValue({}),
      submit: vi.fn(),
    });
    expect((await malformed(new Request("http://localhost/api/training/submit", {
      method: "POST",
      headers: { authorization: "Bearer token" },
      body: JSON.stringify({ assignmentId: "assignment-1" }),
    }))).status).toBe(400);

    const unknown = createSubmitQuestHandler({
      authenticate: vi.fn().mockResolvedValue({}),
      submit: vi.fn().mockRejectedValue(new SubmissionAssignmentNotFoundError()),
    });
    expect((await unknown(new Request("http://localhost/api/training/submit", {
      method: "POST",
      headers: { authorization: "Bearer token" },
      body: JSON.stringify(validBody()),
    }))).status).toBe(404);
  });

  it("returns a bounded successful outcome", async () => {
    const state = createTrainingSeed("2026-07-18T18:00:00.000Z");
    const submission = {
      id: "submission-1",
      idempotencyKey: "route-key",
      assignmentId: Object.values(state.assignments)[0].id,
      revisionNo: 1,
      evidence: [],
      selfReflection: "A reflection",
      verificationStatus: "needs_revision" as const,
      verificationMethod: null,
      qualityScore: 0,
      scoreBreakdown: {
        evidenceCompleteness: 0,
        evidenceValidity: 0,
        reflection: 0,
        artifactReadiness: 0,
      },
      hardFailures: ["Missing evidence"],
      submittedAt: "2026-07-18T18:00:00.000Z",
    };
    const handler = createSubmitQuestHandler({
      authenticate: vi.fn().mockResolvedValue({ repository: true }),
      submit: vi.fn().mockResolvedValue({
        state,
        submission,
        evaluation: {
          qualityScore: 0,
          verificationStatus: "needs_revision",
          verificationMethod: null,
          scoreBreakdown: submission.scoreBreakdown,
          artifactReady: false,
          hardFailures: submission.hardFailures,
        },
      }),
    });

    const response = await handler(new Request("http://localhost/api/training/submit", {
      method: "POST",
      headers: { authorization: "Bearer token" },
      body: JSON.stringify(validBody()),
    }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.submission.id).toBe("submission-1");
    expect(JSON.stringify(body)).not.toContain("output_parsed");
  });
});
