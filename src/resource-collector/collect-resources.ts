import { createResourceIdentity } from "@/domain/resources/resource-identity";
import { scoreResourceQuality } from "@/domain/resources/resource-quality";
import type { Resource } from "@/domain/training/types";

import { deduplicateCandidates } from "./deduplicate";
import type { ResourceSource, ResourceCandidate } from "./contracts";

export interface StoredCollectionRun {
  status: "completed" | "degraded" | "failed";
  inserted: number;
  updated: number;
  duplicates: number;
  rejected: number;
}

export interface ResourceCatalogRepository {
  findRun(runKey: string): Promise<StoredCollectionRun | null>;
  startRun(input: { runKey: string; now: string }): Promise<string>;
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
}

function toResource(candidate: ResourceCandidate, now: string): Resource {
  const identity = createResourceIdentity(candidate);
  const relevance = candidate.credibilityHint ?? 70;
  const resource: Resource = {
    id: `resource-${identity.contentFingerprint.slice(0, 24)}`,
    title: candidate.title,
    summary: candidate.summary,
    url: identity.canonicalUrl,
    resourceType: candidate.resourceType,
    difficulty: candidate.resourceType === "paper" ? 4 : 3,
    estimatedMinutes: candidate.resourceType === "paper" ? 60 : 45,
    skillTags: candidate.resourceType === "paper" ? ["researchSense"] : ["engineering"],
    relevance,
    freshness: candidate.freshnessHint ?? 70,
    credibility: candidate.credibilityHint ?? 70,
    prerequisites: [],
    requiredTools: [],
    costTier: "free",
    availabilityStatus: "available",
    lastCheckedAt: now,
    source: identity.source,
    externalId: identity.externalId,
    canonicalUrl: identity.canonicalUrl,
    contentFingerprint: identity.contentFingerprint,
    taskFit: relevance,
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

  const runId = await input.repository.startRun({ runKey: input.runKey, now: input.now });
  const settled = await Promise.allSettled(
    input.sources.map(async (source) => ({ source: source.source, candidates: await source.search({ query: input.query, limit: input.limit }) })),
  );
  const sourceFailures = settled.flatMap((result, index) => result.status === "rejected" ? [input.sources[index]!.source] : []);
  const candidates = settled.flatMap((result) => result.status === "fulfilled" ? result.value.candidates : []);
  const deduplicated = deduplicateCandidates(candidates);
  let inserted = 0;
  let updated = 0;
  let rejected = 0;

  for (const candidate of deduplicated.unique) {
    try {
      const resource = toResource(candidate, input.now);
      const disposition = await input.repository.upsertResource(resource);
      if (disposition === "inserted") inserted += 1;
      else updated += 1;
      await input.repository.recordItem({ runId, source: candidate.source, externalId: candidate.externalId, canonicalUrl: resource.canonicalUrl!, disposition });
    } catch {
      rejected += 1;
    }
  }

  const status = sourceFailures.length > 0 ? "degraded" : "completed";
  const outcome = { status, inserted, updated, duplicates: deduplicated.duplicates.length, rejected } as const;
  await input.repository.finishRun(runId, outcome);
  return { ...outcome, replayed: false, sourceFailures };
}
