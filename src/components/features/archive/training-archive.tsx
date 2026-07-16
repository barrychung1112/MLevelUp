"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

import type { ActivityView, LoadableViewProps } from "../view-models";

export type ArchiveFilters = {
  eventType: string;
};

export const DEFAULT_ARCHIVE_FILTERS: ArchiveFilters = {
  eventType: "all",
};

type TrainingArchiveProps = LoadableViewProps & {
  activities: readonly ActivityView[];
  eventTypes?: readonly string[];
  filters?: ArchiveFilters;
  onFiltersChange?: (filters: ArchiveFilters) => void;
};

const selectClass =
  "min-h-11 rounded-sm border border-command-border bg-command-bg/80 px-3 text-base text-command-text outline-none transition-[border-color,box-shadow] hover:border-command-muted/70 focus-visible:border-command-cyan focus-visible:shadow-[0_0_0_3px_rgba(77,231,255,0.12)]";

export function TrainingArchive({
  activities,
  eventTypes,
  filters,
  onFiltersChange,
  status = "ready",
  errorMessage = "無法載入訓練紀錄。",
}: TrainingArchiveProps) {
  const [internalFilters, setInternalFilters] = useState<ArchiveFilters>(
    DEFAULT_ARCHIVE_FILTERS,
  );
  const activeFilters = filters ?? internalFilters;
  const options = eventTypes ?? [...new Set(activities.map((activity) => activity.eventType))].sort();
  const visibleActivities = activities.filter((activity) => activeFilters.eventType === "all" || activity.eventType === activeFilters.eventType);

  const header = (
    <header>
      <p className="text-sm uppercase tracking-[0.24em] text-command-warning">Battle log</p>
      <h1 id="archive-heading" className="text-3xl font-semibold text-command-text">Training Archive</h1>
    </header>
  );

  if (status === "loading") return <p role="status" className="text-command-muted">正在讀取訓練檔案…</p>;
  if (status === "error") return <p role="alert" className="text-command-danger">{errorMessage}</p>;
  if (activities.length === 0) return <section aria-labelledby="archive-heading" className="space-y-6">{header}<EmptyState title="Training Archive 尚無紀錄" description="完成任務後，戰鬥紀錄會出現在這裡。" /></section>;

  function changeFilters(nextFilters: ArchiveFilters) {
    if (filters === undefined) setInternalFilters(nextFilters);
    onFiltersChange?.(nextFilters);
  }

  return (
    <section aria-labelledby="archive-heading" className="space-y-6">
      {header}
      <label className="grid max-w-sm gap-2 text-sm text-command-text">
        紀錄類型
        <select className={selectClass} value={activeFilters.eventType} onChange={(event) => changeFilters({ eventType: event.target.value })}>
          <option value="all">全部紀錄</option>
          {options.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
      </label>
      {visibleActivities.length === 0 ? (
        <EmptyState
          title="沒有符合目前篩選條件的訓練紀錄"
          action={<Button variant="secondary" type="button" onClick={() => changeFilters(DEFAULT_ARCHIVE_FILTERS)}>清除紀錄篩選</Button>}
        />
      ) : (
        <ol className="relative space-y-4 border-l border-command-cyan/40 pl-6">
          {visibleActivities.map((activity) => (
            <li key={activity.id} className="command-panel relative border border-command-border bg-command-surface/92 p-5 before:absolute before:-left-[1.8rem] before:top-6 before:size-3 before:bg-command-cyan">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Badge>{activity.eventType}</Badge>
                <time className="text-sm text-command-muted">{activity.occurredAt}</time>
              </div>
              <h2 className="mt-3 text-lg font-semibold text-command-text">{activity.title}</h2>
              <p className="mt-1 text-command-muted">{activity.summary}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
