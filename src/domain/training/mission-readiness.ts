import type { Quest, Resource } from "./types";
import { isMissionEligibleResource } from "../resources/resource-quality";

export type MissionReadinessFailure =
  | "steps_required"
  | "metrics_required"
  | "evidence_required"
  | "resource_required"
  | "resource_unavailable"
  | "resource_time_exceeded";

export interface MissionReadinessResult {
  ready: boolean;
  failures: MissionReadinessFailure[];
}

function isSuitableResource(resource: Resource | undefined): resource is Resource {
  return Boolean(
    resource &&
      isMissionEligibleResource(resource, new Date().toISOString()),
  );
}

export function evaluateMissionReadiness(input: {
  quest: Quest;
  resources: readonly Resource[];
  availableMinutes: number;
}): MissionReadinessResult {
  const failures: MissionReadinessFailure[] = [];
  const { quest } = input;

  if (quest.purpose !== "calibration") {
    if (quest.executionSteps.length === 0) failures.push("steps_required");
    if (quest.successMetrics.length === 0) failures.push("metrics_required");
    if (!quest.evidenceRequirements.some((requirement) => requirement.required)) {
      failures.push("evidence_required");
    }
  }

  const resourceIds = [...new Set(quest.resourceIds)];
  if (resourceIds.length < 1 || resourceIds.length > 3) {
    failures.push("resource_required");
  } else {
    const resourcesById = new Map(input.resources.map((resource) => [resource.id, resource]));
    const referencedResources = resourceIds.map((id) => resourcesById.get(id));
    const primaryResourcesReady = referencedResources.every(isSuitableResource);
    const fallbackResourcesReady = referencedResources.every((resource) => {
      if (!resource?.fallbackResourceId) return true;
      return isSuitableResource(resourcesById.get(resource.fallbackResourceId));
    });

    if (!primaryResourcesReady || !fallbackResourcesReady) {
      failures.push("resource_unavailable");
    } else {
      const resourceMinutes = referencedResources.reduce(
        (total, resource) => total + (resource?.estimatedMinutes ?? 0),
        0,
      );
      if (quest.estimatedMinutes + resourceMinutes > input.availableMinutes) {
        failures.push("resource_time_exceeded");
      }
    }
  }

  return { ready: failures.length === 0, failures };
}
