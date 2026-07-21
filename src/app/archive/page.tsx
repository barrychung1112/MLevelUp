"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import {
  DEFAULT_ARCHIVE_FILTERS,
  TrainingArchive,
  type ArchiveFilters,
} from "@/components/features/archive/training-archive";
import { useTraining } from "@/providers/training-provider";

import { TrainingPageShell } from "../_components/training-page-shell";
import { mapActivity } from "../_helpers/training-view-models";

function ArchiveContent() {
  const training = useTraining();
  const pathname = usePathname();
  const router = useRouter();
  const search = useSearchParams();
  const timezone = training.snapshot?.profile.timezone;
  const activities = [...(training.snapshot?.activity ?? [])]
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .map((activity) => mapActivity(activity, timezone ?? "UTC"));
  const eventTypes = [
    ...new Set(activities.map((activity) => activity.eventType)),
  ].sort();
  const requestedEventType = search.get("event");
  const filters: ArchiveFilters = {
    ...DEFAULT_ARCHIVE_FILTERS,
    eventType:
      requestedEventType !== null && eventTypes.includes(requestedEventType)
        ? requestedEventType
        : "all",
  };

  function replaceFilters(nextFilters: ArchiveFilters) {
    const query = new URLSearchParams();
    if (nextFilters.eventType !== "all") {
      query.set("event", nextFilters.eventType);
    }
    const queryString = query.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
  }

  return (
    <TrainingPageShell>
      <TrainingArchive
        activities={activities}
        eventTypes={eventTypes}
        filters={filters}
        onFiltersChange={replaceFilters}
        status={training.status === "ready" ? "ready" : training.status}
        errorMessage={training.loadError ?? undefined}
      />
    </TrainingPageShell>
  );
}

export default function ArchivePage() {
  return (
    <Suspense
      fallback={
        <p role="status" className="p-6 text-command-muted">
          Loading the Training Archive…
        </p>
      }
    >
      <ArchiveContent />
    </Suspense>
  );
}
