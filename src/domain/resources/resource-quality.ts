import type { Resource } from "@/domain/training/types";

const MAX_AVAILABILITY_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function availabilityScore(resource: Resource): number {
  if (resource.availabilityStatus === "available") return 100;
  if (resource.availabilityStatus === "unchecked") return 30;
  return 0;
}

export function scoreResourceQuality(resource: Resource): number {
  return Math.round(
    resource.credibility * 0.3 +
      resource.relevance * 0.25 +
      resource.freshness * 0.2 +
      (resource.taskFit ?? resource.relevance) * 0.15 +
      availabilityScore(resource) * 0.1,
  );
}

export function isMissionEligibleResource(resource: Resource, now: string): boolean {
  if (
    resource.availabilityStatus !== "available" ||
    resource.costTier !== "free" ||
    resource.relevance < 60 ||
    resource.credibility < 60 ||
    scoreResourceQuality(resource) < 65 ||
    resource.estimatedMinutes <= 0 ||
    !resource.lastCheckedAt
  ) return false;

  const checkedAt = Date.parse(resource.lastCheckedAt);
  const current = Date.parse(now);
  return Number.isFinite(checkedAt) && Number.isFinite(current) && current - checkedAt <= MAX_AVAILABILITY_AGE_MS;
}
