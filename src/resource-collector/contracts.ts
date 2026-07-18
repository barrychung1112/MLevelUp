import type { Resource } from "@/domain/training/types";
import type { ResourceSourceName } from "@/domain/resources/resource-identity";

export type FetchLike = typeof fetch;

export interface ResourceSearchInput {
  query: string;
  limit: number;
}

export interface ResourceCandidate {
  source: ResourceSourceName;
  externalId: string;
  title: string;
  summary: string;
  url: string;
  resourceType: Resource["resourceType"];
  publishedAt?: string;
  updatedAt?: string;
  credibilityHint?: number;
  freshnessHint?: number;
}

export interface ResourceSource {
  readonly source: ResourceSourceName;
  search(input: ResourceSearchInput): Promise<ResourceCandidate[]>;
}

export class ResourceSourceError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "ResourceSourceError";
  }
}

export function boundedLimit(limit: number): number {
  return Math.max(1, Math.min(20, Math.floor(limit)));
}
