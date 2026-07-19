import type { SupabaseClient } from "@supabase/supabase-js";

import type { Resource } from "@/domain/training/types";

import type { ResourceCatalogRepository, StoredCollectionRun } from "./collect-resources";

function resourceRow(resource: Resource) {
  return {
    id: resource.id, title: resource.title, summary: resource.summary, url: resource.url,
    resource_type: resource.resourceType, difficulty: resource.difficulty, estimated_minutes: resource.estimatedMinutes,
    skill_tags: resource.skillTags, relevance: resource.relevance, freshness: resource.freshness, credibility: resource.credibility,
    prerequisites: resource.prerequisites, required_tools: resource.requiredTools, cost_tier: resource.costTier,
    availability_status: resource.availabilityStatus, last_checked_at: resource.lastCheckedAt, source: resource.source,
    external_id: resource.externalId, canonical_url: resource.canonicalUrl, content_fingerprint: resource.contentFingerprint,
    quality_score: resource.qualityScore, task_fit: resource.taskFit, published_at: resource.publishedAt,
    updated_at: resource.updatedAt, ingested_at: resource.ingestedAt, metadata_version: resource.metadataVersion,
  };
}

export class SupabaseResourceCatalogRepository implements ResourceCatalogRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findRun(runKey: string): Promise<StoredCollectionRun | null> {
    const { data, error } = await this.client.from("resource_collection_runs").select("status, inserted_count, updated_count, duplicate_count, rejected_count").eq("run_key", runKey).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data || data.status === "running") return null;
    return { status: data.status as StoredCollectionRun["status"], inserted: data.inserted_count, updated: data.updated_count, duplicates: data.duplicate_count, rejected: data.rejected_count };
  }

  async startRun(input: { runKey: string; now: string }): Promise<string> {
    const { data, error } = await this.client.from("resource_collection_runs").insert({ run_key: input.runKey, source: "catalog", status: "running", started_at: input.now }).select("id").single();
    if (error || !data) throw new Error(error?.message ?? "Unable to create resource collection run");
    return data.id;
  }

  async upsertResource(resource: Resource): Promise<"inserted" | "updated"> {
    const { data: existing, error: lookupError } = await this.client.from("resources").select("id").eq("source", resource.source!).eq("external_id", resource.externalId!).maybeSingle();
    if (lookupError) throw new Error(lookupError.message);
    const { error } = await this.client.from("resources").upsert(resourceRow(resource), { onConflict: "source,external_id" });
    if (error) throw new Error(error.message);
    return existing ? "updated" : "inserted";
  }

  async recordItem(input: { runId: string; source: string; externalId: string; canonicalUrl: string; disposition: string }): Promise<void> {
    const { error } = await this.client.from("resource_collection_items").insert({ run_id: input.runId, source: input.source, external_id: input.externalId, canonical_url: input.canonicalUrl, disposition: input.disposition });
    if (error) throw new Error(error.message);
  }

  async finishRun(runId: string, outcome: Omit<StoredCollectionRun, "failed">): Promise<void> {
    const { error } = await this.client.from("resource_collection_runs").update({ status: outcome.status, inserted_count: outcome.inserted, updated_count: outcome.updated, duplicate_count: outcome.duplicates, rejected_count: outcome.rejected, completed_at: new Date().toISOString() }).eq("id", runId);
    if (error) throw new Error(error.message);
  }
}
