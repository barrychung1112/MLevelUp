import { describe, expect, test } from "vitest";

import type { EvidenceRecord } from "@/domain/training/types";

import { deriveSubmissionIdentity } from "./submission-identity";

const evidence: Omit<EvidenceRecord, "id">[] = [{
  requirementId: "commit",
  type: "githubCommit",
  url: "https://github.com/example/project/commit/abc123",
}];

describe("deriveSubmissionIdentity", () => {
  test("returns stable SHA-256 identities for the same logical payload", async () => {
    const payload = {
      assignmentId: "assignment-1",
      revisionNo: 1,
      evidence,
      selfReflection: "A substantive reflection with the same exact logical content.",
    };

    const first = await deriveSubmissionIdentity(payload);
    const second = await deriveSubmissionIdentity(structuredClone(payload));

    expect(second).toEqual(first);
    expect(first.idempotencyKey).toMatch(/^submission-sha256-[a-f0-9]{64}$/u);
    expect(first.evidenceIds[0]).toMatch(/^evidence-sha256-[a-f0-9]{64}-0$/u);
  });

  test("changes the identity when payload or revision changes", async () => {
    const base = {
      assignmentId: "assignment-1",
      revisionNo: 1,
      evidence,
      selfReflection: "A substantive reflection with the same exact logical content.",
    };
    const [original, changedPayload, changedRevision] = await Promise.all([
      deriveSubmissionIdentity(base),
      deriveSubmissionIdentity({ ...base, selfReflection: `${base.selfReflection} changed` }),
      deriveSubmissionIdentity({ ...base, revisionNo: 2 }),
    ]);

    expect(changedPayload.idempotencyKey).not.toBe(original.idempotencyKey);
    expect(changedRevision.idempotencyKey).not.toBe(original.idempotencyKey);
  });

  test("uses the same identity as submission validation for whitespace and MIME casing", async () => {
    const canonical = await deriveSubmissionIdentity({
      assignmentId: "assignment-1",
      revisionNo: 1,
      evidence: [{
        requirementId: "commit",
        type: "modelEvaluationReport",
        fileName: "experiment.md",
        mimeType: "text/markdown",
      }],
      selfReflection: "A substantive reflection.",
    });
    const userInput = await deriveSubmissionIdentity({
      assignmentId: " assignment-1 ",
      revisionNo: 1,
      evidence: [{
        requirementId: " commit ",
        type: "modelEvaluationReport",
        fileName: " experiment.md ",
        mimeType: " TEXT/MARKDOWN ",
      }],
      selfReflection: " A substantive reflection. ",
    });

    expect(userInput).toEqual(canonical);
  });
});
