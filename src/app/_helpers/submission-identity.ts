import type { EvidenceRecord } from "@/domain/training/types";

type SubmissionIdentityInput = {
  assignmentId: string;
  revisionNo: number;
  evidence: readonly Omit<EvidenceRecord, "id">[];
  selfReflection: string;
};

type SubmissionIdentity = {
  idempotencyKey: string;
  evidenceIds: string[];
};

function canonicalize(value: unknown, key?: string): unknown {
  if (typeof value === "string") {
    const normalized = value.trim();
    return key === "mimeType" ? normalized.toLowerCase() : normalized;
  }
  if (Array.isArray(value)) return value.map((entry) => canonicalize(entry));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([entryKey, entry]) => [entryKey, canonicalize(entry, entryKey)]),
    );
  }
  return value;
}

async function sha256(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(canonicalize(value)));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function deriveSubmissionIdentity(
  input: SubmissionIdentityInput,
): Promise<SubmissionIdentity> {
  const digest = await sha256(input);
  return {
    idempotencyKey: `submission-sha256-${digest}`,
    evidenceIds: input.evidence.map((_, index) => `evidence-sha256-${digest}-${index}`),
  };
}
