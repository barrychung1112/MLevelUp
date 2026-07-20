import { createResourceIdentity } from "@/domain/resources/resource-identity";
import { scoreResourceQuality } from "@/domain/resources/resource-quality";
import type { Difficulty, Resource } from "@/domain/training/types";

import { deduplicateCandidates } from "./deduplicate";
import type { AvailabilityCheck } from "./check-availability";
import type { ResourceSource, ResourceCandidate } from "./contracts";
import type { ResourceCuration } from "./curator";

export interface StoredCollectionRun {
  status: "completed" | "degraded" | "failed";
  inserted: number;
  updated: number;
  duplicates: number;
  rejected: number;
  candidateCount: number;
  fallbackCount: number;
  unavailableCount: number;
  uncheckedCount: number;
}

export interface ResourceCatalogRepository {
  findRun(runKey: string): Promise<StoredCollectionRun | null>;
  startRun(input: { runKey: string; now: string; model?: string; promptVersion?: string }): Promise<string>;
  upsertResource(resource: Resource): Promise<"inserted" | "updated">;
  recordItem(input: { runId: string; source: string; externalId: string; canonicalUrl: string; disposition: string }): Promise<void>;
  finishRun(runId: string, outcome: Omit<StoredCollectionRun, "failed">): Promise<void>;
}

export interface CollectionOutcome extends StoredCollectionRun {
  replayed: boolean;
  sourceFailures: string[];
}

export interface CollectResourcesInput {
  runKey: string;
  now: string;
  query: string;
  limit: number;
  sources: readonly ResourceSource[];
  repository: ResourceCatalogRepository;
  curate(candidate: ResourceCandidate): Promise<ResourceCuration>;
  checkAvailability(url: string): Promise<AvailabilityCheck>;
  runMetadata?: { model?: string; promptVersion?: string };
}

function toResource(
  candidate: ResourceCandidate,
  curation: ResourceCuration,
  availability: AvailabilityCheck,
  now: string,
): Resource {
  const identity = createResourceIdentity(candidate);
  const resource: Resource = {
    id: `resource-${identity.contentFingerprint.slice(0, 24)}`,
    title: candidate.title,
    summary: curation.summary,
    url: identity.canonicalUrl,
    resourceType: candidate.resourceType,
    difficulty: curation.difficulty as Difficulty,
    estimatedMinutes: curation.estimatedMinutes,
    skillTags: curation.skillTags,
    relevance: curation.relevance,
    freshness: candidate.freshnessHint ?? 70,
    credibility: candidate.credibilityHint ?? 70,
    prerequisites: curation.prerequisites,
    requiredTools: [],
    costTier: "free",
    availabilityStatus: availability.status,
    lastCheckedAt: now,
    source: identity.source,
    externalId: identity.externalId,
    canonicalUrl: identity.canonicalUrl,
    contentFingerprint: identity.contentFingerprint,
    taskFit: curation.taskFit,
    publishedAt: candidate.publishedAt,
    updatedAt: candidate.updatedAt,
    ingestedAt: now,
    metadataVersion: "phase4-resource-v1",
  };
  return { ...resource, qualityScore: scoreResourceQuality(resource) };
}

export async function collectResources(input: CollectResourcesInput): Promise<CollectionOutcome> {
  const existing = await input.repository.findRun(input.runKey);
  if (existing && existing.status !== "failed") {
    return { ...existing, replayed: true, sourceFailures: [] };
  }

  const runId = await input.repository.startRun({
    runKey: input.runKey,
    now: input.now,
    ...input.runMetadata,
  });
  const settled = await Promise.allSettled(
    input.sources.map(async (source) => ({ source: source.source, candidates: await source.search({ query: input.query, limit: input.limit }) })),
  );
  const sourceFailures = settled.flatMap((result, index) => result.status === "rejected" ? [input.sources[index]!.source] : []);
  const candidates = settled.flatMap((result) => result.status === "fulfilled" ? result.value.candidates : []);
  const deduplicated = deduplicateCandidates(candidates);
  let inserted = 0;
  let updated = 0;
  let rejected = 0;
  let fallbackCount = 0;
  let unavailableCount = 0;
  let uncheckedCount = 0;

  for (const candidate of deduplicated.unique) {
    try {
      const identity = createResourceIdentity(candidate);
      const [curation, availability] = await Promise.all([
        input.curate(candidate),
        input.checkAvailability(identity.canonicalUrl).catch(() => ({
          status: "unchecked" as const,
          errorCode: "network_error" as const,
        })),
      ]);
      if (curation.fallbackUsed) fallbackCount += 1;
      if (availability.status === "unavailable") unavailableCount += 1;
      if (availability.status === "unchecked") uncheckedCount += 1;
      const resource = toResource(candidate, curation, availability, input.now);
      const disposition = await input.repository.upsertResource(resource);
      if (disposition === "inserted") inserted += 1;
      else updated += 1;
      const itemDisposition = curation.fallbackUsed
        ? "fallback"
        : availability.status === "unavailable"
          ? "unavailable"
          : disposition;
      await input.repository.recordItem({
        runId,
        source: candidate.source,
        externalId: candidate.externalId,
        canonicalUrl: resource.canonicalUrl!,
        disposition: itemDisposition,
      });
    } catch {
      rejected += 1;
    }
  }

  const degraded = sourceFailures.length > 0 || rejected > 0 || fallbackCount > 0 || unavailableCount > 0 || uncheckedCount > 0;
  const status = degraded ? "degraded" : "completed";
  const outcome = {
    status,
    inserted,
    updated,
    duplicates: deduplicated.duplicates.length,
    rejected,
    candidateCount: candidates.length,
    fallbackCount,
    unavailableCount,
    uncheckedCount,
  } as const;
  await input.repository.finishRun(runId, outcome);
  return { ...outcome, replayed: false, sourceFailures };
}
