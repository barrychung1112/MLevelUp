import { createResourceIdentity } from "@/domain/resources/resource-identity";

import type { ResourceCandidate } from "./contracts";

export type DuplicateReason = "source_identity" | "canonical_url" | "content_fingerprint";

export interface DuplicateCandidate {
  candidate: ResourceCandidate;
  reason: DuplicateReason;
}

export interface DeduplicationResult {
  unique: ResourceCandidate[];
  duplicates: DuplicateCandidate[];
}

export function deduplicateCandidates(candidates: readonly ResourceCandidate[]): DeduplicationResult {
  const sourceIds = new Set<string>();
  const urls = new Set<string>();
  const fingerprints = new Set<string>();
  const unique: ResourceCandidate[] = [];
  const duplicates: DuplicateCandidate[] = [];

  for (const candidate of candidates) {
    const identity = createResourceIdentity(candidate);
    const sourceKey = `${identity.source}:${identity.externalId}`;
    const reason = sourceIds.has(sourceKey)
      ? "source_identity"
      : urls.has(identity.canonicalUrl)
        ? "canonical_url"
        : fingerprints.has(identity.contentFingerprint)
          ? "content_fingerprint"
          : undefined;
    if (reason) {
      duplicates.push({ candidate, reason });
      continue;
    }
    sourceIds.add(sourceKey);
    urls.add(identity.canonicalUrl);
    fingerprints.add(identity.contentFingerprint);
    unique.push(candidate);
  }
  return { unique, duplicates };
}
