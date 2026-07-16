"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import {
  DEFAULT_RESOURCE_FILTERS,
  ResourceLibrary,
  type ResourceFilters,
} from "@/components/features/resources/resource-library";
import { useTraining } from "@/providers/training-provider";

import { TrainingPageShell } from "../_components/training-page-shell";
import { mapResource } from "../_helpers/training-view-models";

const thresholdOptions = [80, 90] as const;
const maximumTimeOptions = [30, 60, 120] as const;
const difficultyOptions = ["1", "2", "3", "4", "5"] as const;

function numberFilter(
  value: string | null,
  options: readonly number[],
): number {
  if (value === null) return 0;
  const parsed = Number(value);
  return options.includes(parsed) ? parsed : 0;
}

function ResourcesContent() {
  const training = useTraining();
  const pathname = usePathname();
  const router = useRouter();
  const search = useSearchParams();
  const resources = (training.snapshot?.resources ?? []).map(mapResource);
  const resourceTypes = new Set(
    resources.map((resource) => resource.resourceType),
  );
  const skills = new Set(resources.flatMap((resource) => resource.skillTags));
  const resourceType = search.get("type");
  const skill = search.get("skill");
  const difficulty = search.get("difficulty");
  const filters: ResourceFilters = {
    ...DEFAULT_RESOURCE_FILTERS,
    resourceType:
      resourceType !== null && resourceTypes.has(resourceType)
        ? resourceType
        : "all",
    skill: skill !== null && skills.has(skill) ? skill : "all",
    minimumRelevance: numberFilter(search.get("relevance"), thresholdOptions),
    difficulty:
      difficulty !== null &&
      difficultyOptions.some((option) => option === difficulty)
        ? difficulty
        : "all",
    minimumFreshness: numberFilter(search.get("freshness"), thresholdOptions),
    minimumCredibility: numberFilter(
      search.get("credibility"),
      thresholdOptions,
    ),
    maximumMinutes: numberFilter(search.get("maxTime"), maximumTimeOptions),
  };

  function replaceFilters(nextFilters: ResourceFilters) {
    const query = new URLSearchParams();
    if (nextFilters.resourceType !== "all") {
      query.set("type", nextFilters.resourceType);
    }
    if (nextFilters.skill !== "all") query.set("skill", nextFilters.skill);
    if (nextFilters.minimumRelevance > 0) {
      query.set("relevance", String(nextFilters.minimumRelevance));
    }
    if (nextFilters.difficulty !== "all") {
      query.set("difficulty", nextFilters.difficulty);
    }
    if (nextFilters.minimumFreshness > 0) {
      query.set("freshness", String(nextFilters.minimumFreshness));
    }
    if (nextFilters.minimumCredibility > 0) {
      query.set("credibility", String(nextFilters.minimumCredibility));
    }
    if (nextFilters.maximumMinutes > 0) {
      query.set("maxTime", String(nextFilters.maximumMinutes));
    }
    const queryString = query.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
  }

  return (
    <TrainingPageShell>
      <ResourceLibrary
        resources={resources}
        filters={filters}
        onFiltersChange={replaceFilters}
        status={training.status === "ready" ? "ready" : training.status}
        errorMessage={training.loadError ?? undefined}
      />
    </TrainingPageShell>
  );
}

export default function ResourcesPage() {
  return (
    <Suspense
      fallback={
        <p role="status" className="p-6 text-command-muted">
          正在載入資源情報…
        </p>
      }
    >
      <ResourcesContent />
    </Suspense>
  );
}
