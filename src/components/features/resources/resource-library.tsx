"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

import type { LoadableViewProps, ResourceView } from "../view-models";

export type ResourceFilters = {
  resourceType: string;
  skill: string;
  minimumRelevance: number;
  difficulty: string;
  minimumFreshness: number;
  minimumCredibility: number;
  maximumMinutes: number;
};

export const DEFAULT_RESOURCE_FILTERS: ResourceFilters = {
  resourceType: "all",
  skill: "all",
  minimumRelevance: 0,
  difficulty: "all",
  minimumFreshness: 0,
  minimumCredibility: 0,
  maximumMinutes: 0,
};

type ResourceLibraryProps = LoadableViewProps & {
  resources: readonly ResourceView[];
  filters?: ResourceFilters;
  onFiltersChange?: (filters: ResourceFilters) => void;
};

const selectClass =
  "min-h-11 rounded-sm border border-command-border bg-command-bg/80 px-3 text-base text-command-text outline-none transition-[border-color,box-shadow] hover:border-command-muted/70 focus-visible:border-command-cyan focus-visible:shadow-[0_0_0_3px_rgba(77,231,255,0.12)]";

export function ResourceLibrary({
  resources,
  filters,
  onFiltersChange,
  status = "ready",
  errorMessage = "Unable to load resources.",
}: ResourceLibraryProps) {
  const [internalFilters, setInternalFilters] = useState<ResourceFilters>(
    DEFAULT_RESOURCE_FILTERS,
  );
  const activeFilters = filters ?? internalFilters;
  const types = useMemo(() => [...new Set(resources.map((resource) => resource.resourceType))].sort(), [resources]);
  const skills = useMemo(() => [...new Set(resources.flatMap((resource) => resource.skillTags))].sort(), [resources]);
  const visibleResources = resources.filter((resource) =>
    (activeFilters.resourceType === "all" || resource.resourceType === activeFilters.resourceType) &&
    (activeFilters.skill === "all" || resource.skillTags.includes(activeFilters.skill)) &&
    resource.relevance >= activeFilters.minimumRelevance &&
    (activeFilters.difficulty === "all" || resource.difficulty === Number(activeFilters.difficulty)) &&
    resource.freshness >= activeFilters.minimumFreshness &&
    resource.credibility >= activeFilters.minimumCredibility &&
    (activeFilters.maximumMinutes === 0 || resource.estimatedMinutes <= activeFilters.maximumMinutes),
  );

  if (status === "loading") return <p role="status" className="text-command-muted">Loading resource intelligence…</p>;
  if (status === "error") return <p role="alert" className="text-command-danger">{errorMessage}</p>;
  if (resources.length === 0) return <EmptyState title="No resources are available." description="New resource intelligence will appear after the next collector update." />;

  function changeFilters(nextFilters: ResourceFilters) {
    if (filters === undefined) setInternalFilters(nextFilters);
    onFiltersChange?.(nextFilters);
  }

  function updateFilters(patch: Partial<ResourceFilters>) {
    changeFilters({ ...activeFilters, ...patch });
  }

  function clearFilters() {
    changeFilters(DEFAULT_RESOURCE_FILTERS);
  }

  return (
    <section aria-labelledby="resources-heading" className="space-y-6">
      <header>
        <p className="text-sm uppercase tracking-[0.24em] text-command-violet">Resource intelligence</p>
        <h1 id="resources-heading" className="text-3xl font-semibold text-command-text">Resources</h1>
      </header>

      <fieldset className="command-panel grid gap-4 border border-command-border bg-command-surface/92 p-4 sm:grid-cols-2 xl:grid-cols-4">
        <legend className="px-2 font-data text-xs uppercase tracking-[0.14em] text-command-muted">Resource Filters</legend>
        <label className="grid gap-2 text-sm text-command-text">Resource type<select className={selectClass} value={activeFilters.resourceType} onChange={(event) => updateFilters({ resourceType: event.target.value })}><option value="all">All types</option>{types.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
        <label className="grid gap-2 text-sm text-command-text">Skill tag<select className={selectClass} value={activeFilters.skill} onChange={(event) => updateFilters({ skill: event.target.value })}><option value="all">All skills</option>{skills.map((skill) => <option key={skill} value={skill}>{skill}</option>)}</select></label>
        <label className="grid gap-2 text-sm text-command-text">Minimum relevance<select className={selectClass} value={activeFilters.minimumRelevance} onChange={(event) => updateFilters({ minimumRelevance: Number(event.target.value) })}><option value={0}>Any</option><option value={80}>80+</option><option value={90}>90+</option></select></label>
        <label className="grid gap-2 text-sm text-command-text">Difficulty<select className={selectClass} value={activeFilters.difficulty} onChange={(event) => updateFilters({ difficulty: event.target.value })}><option value="all">All levels</option>{[1, 2, 3, 4, 5].map((difficulty) => <option key={difficulty} value={difficulty}>{difficulty} / 5</option>)}</select></label>
        <label className="grid gap-2 text-sm text-command-text">Minimum freshness<select className={selectClass} value={activeFilters.minimumFreshness} onChange={(event) => updateFilters({ minimumFreshness: Number(event.target.value) })}><option value={0}>Any</option><option value={80}>80+</option><option value={90}>90+</option></select></label>
        <label className="grid gap-2 text-sm text-command-text">Minimum credibility<select className={selectClass} value={activeFilters.minimumCredibility} onChange={(event) => updateFilters({ minimumCredibility: Number(event.target.value) })}><option value={0}>Any</option><option value={80}>80+</option><option value={90}>90+</option></select></label>
        <label className="grid gap-2 text-sm text-command-text">Maximum time<select className={selectClass} value={activeFilters.maximumMinutes} onChange={(event) => updateFilters({ maximumMinutes: Number(event.target.value) })}><option value={0}>Any</option><option value={30}>Within 30 minutes</option><option value={60}>Within 60 minutes</option><option value={120}>Within 120 minutes</option></select></label>
      </fieldset>

      {visibleResources.length === 0 ? (
        <EmptyState
          title="No resources match these filters"
          action={<Button variant="secondary" type="button" onClick={clearFilters}>Clear Resource Filters</Button>}
        />
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {visibleResources.map((resource) => (
            <li key={resource.id} className="command-panel border border-command-border bg-command-surface/92 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="text-lg font-semibold text-command-text">{resource.title}</h2>
                <Badge tone="violet">{resource.resourceType}</Badge>
              </div>
              {resource.summary ? <p className="mt-2 text-command-muted">{resource.summary}</p> : null}
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <div><dt className="text-command-muted">Relevance</dt><dd className="font-data text-command-text">Relevance {resource.relevance}</dd></div>
                <div><dt className="text-command-muted">Difficulty</dt><dd className="font-data text-command-text">Difficulty {resource.difficulty} / 5</dd></div>
                <div><dt className="text-command-muted">Freshness</dt><dd className="font-data text-command-text">Freshness {resource.freshness}</dd></div>
                <div><dt className="text-command-muted">Credibility</dt><dd className="font-data text-command-text">Credibility {resource.credibility}</dd></div>
                <div><dt className="text-command-muted">Estimated time</dt><dd className="font-data text-command-text">{resource.estimatedMinutes} minutes</dd></div>
                {resource.qualityScore !== undefined ? <div><dt className="text-command-muted">Quality</dt><dd className="font-data text-command-cyan">Quality {resource.qualityScore}</dd></div> : null}
                {resource.source ? <div><dt className="text-command-muted">Source</dt><dd className="font-data text-command-text">{resource.source === "github" ? "GitHub" : resource.source}</dd></div> : null}
                {resource.availabilityStatus ? <div><dt className="text-command-muted">Availability</dt><dd className="font-data text-command-text">{resource.availabilityStatus === "available" ? "Available" : resource.availabilityStatus}</dd></div> : null}
              </dl>
              <ul aria-label="Resource skill tags" className="mt-4 flex flex-wrap gap-2">
                {resource.skillTags.map((skill) => <li key={skill}><Badge>{skill}</Badge></li>)}
              </ul>
              {resource.url ? (
                <a
                  className="mt-5 inline-flex min-h-11 items-center rounded-sm border border-command-border bg-command-raised px-4 font-display text-sm font-semibold uppercase tracking-[0.09em] text-command-text transition-colors hover:border-command-cyan/60 hover:text-command-cyan"
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open source: ${resource.title}`}
                >
                  Open Source
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
