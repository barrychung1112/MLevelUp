import { describe, expect, it, vi } from "vitest";

import { createTrainingSeed } from "@/mocks/training/seed";

import {
  ServerSubmitError,
  createServerSubmitClient,
} from "./server-submit-client";

function outcome() {
  const state = createTrainingSeed("2026-07-18T18:00:00.000Z");
  const assignment = Object.values(state.assignments)[0];
  const submission = {
    id: "submission-1",
    idempotencyKey: "submit-key",
    assignmentId: assignment.id,
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
  state.submissions[submission.id] = submission;
  return {
    state,
    submission,
    evaluation: {
      qualityScore: 0,
      verificationStatus: "needs_revision" as const,
      verificationMethod: null,
      scoreBreakdown: submission.scoreBreakdown,
      artifactReady: false,
      hardFailures: submission.hardFailures,
    },
  };
}

describe("server submission client", () => {
  it("posts only the bounded input with the current bearer token", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      Response.json(outcome(), { status: 200 }),
    );
    const client = createServerSubmitClient(
      { auth: { getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "session-token" } }, error: null,
      }) } },
      fetcher,
    );
    const input = {
      idempotencyKey: "submit-key",
      assignmentId: "assignment-1",
      evidence: [],
      selfReflection: "A reflection",
    };

    await expect(client.submit(input)).resolves.toMatchObject({
      submission: { id: "submission-1" },
    });
    expect(fetcher).toHaveBeenCalledWith(
      "/api/training/submit",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ authorization: "Bearer session-token" }),
        body: JSON.stringify(input),
      }),
    );
    expect(fetcher.mock.calls[0][1].body).not.toContain("OPENAI_API_KEY");
  });

  it("fails before fetch when the session is absent", async () => {
    const fetcher = vi.fn();
    const client = createServerSubmitClient(
      { auth: { getSession: vi.fn().mockResolvedValue({
        data: { session: null }, error: null,
      }) } },
      fetcher,
    );

    await expect(client.submit({
      idempotencyKey: "key",
      assignmentId: "assignment",
      evidence: [],
      selfReflection: "",
    })).rejects.toMatchObject({ code: "session_required", retryable: false });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("marks service failures retryable and rejects malformed success data", async () => {
    const auth = { auth: { getSession: vi.fn().mockResolvedValue({
      data: { session: { access_token: "session-token" } }, error: null,
    }) } };
    const unavailable = createServerSubmitClient(
      auth,
      vi.fn().mockResolvedValue(Response.json({ error: "down" }, { status: 503 })),
    );
    await expect(unavailable.submit({
      idempotencyKey: "key",
      assignmentId: "assignment",
      evidence: [],
      selfReflection: "",
    })).rejects.toMatchObject({ code: "service_unavailable", retryable: true });

    const malformed = createServerSubmitClient(
      auth,
      vi.fn().mockResolvedValue(Response.json({ ok: true }, { status: 200 })),
    );
    const error = await malformed.submit({
      idempotencyKey: "key-2",
      assignmentId: "assignment",
      evidence: [],
      selfReflection: "",
    }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ServerSubmitError);
    expect(error).toMatchObject({ code: "invalid_response", retryable: true });
  });
});
