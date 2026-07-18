import { describe, expect, test } from "vitest";

import type { Resource } from "@/domain/training/types";

import {
  isMissionEligibleResource,
  scoreResourceQuality,
} from "./resource-quality";

const now = "2026-07-18T12:00:00.000Z";

const resource = {
  id: "resource-quality",
  title: "Verified resource",
  summary: "A verified and useful machine learning engineering resource.",
  url: "https://example.com/resource",
  resourceType: "repository",
  difficulty: 3,
  estimatedMinutes: 45,
  skillTags: ["engineering"],
  relevance: 90,
  freshness: 80,
  credibility: 90,
  taskFit: 80,
  prerequisites: [],
  requiredTools: ["Git"],
  costTier: "free",
  availabilityStatus: "available",
  lastCheckedAt: "2026-07-15T12:00:00.000Z",
} as Resource;

describe("resource quality", () => {
  test("scores verified high-quality resources as mission eligible", () => {
    expect(scoreResourceQuality(resource)).toBe(88);
    expect(isMissionEligibleResource(resource, now)).toBe(true);
  });

  test.each([
    { availabilityStatus: "stale" },
    { availabilityStatus: "unchecked" },
    { costTier: "paid" },
    { relevance: 59 },
    { lastCheckedAt: "2026-07-10T11:59:59.000Z" },
  ])("rejects a resource that is not mission eligible: %o", (change) => {
    expect(
      isMissionEligibleResource({ ...resource, ...change } as Resource, now),
    ).toBe(false);
  });
});
