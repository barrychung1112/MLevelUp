"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

import type { LoadableViewProps, ResourceView } from "../view-models";

type ResourceLibraryProps = LoadableViewProps & {
  resources: readonly ResourceView[];
};

const selectClass =
  "min-h-11 rounded-sm border border-command-border bg-command-bg/80 px-3 text-base text-command-text outline-none transition-[border-color,box-shadow] hover:border-command-muted/70 focus-visible:border-command-cyan focus-visible:shadow-[0_0_0_3px_rgba(77,231,255,0.12)]";

export function ResourceLibrary({ resources, status = "ready", errorMessage = "無法載入學習資源。" }: ResourceLibraryProps) {
  const [typeFilter, setTypeFilter] = useState("all");
  const [skillFilter, setSkillFilter] = useState("all");
  const [minimumRelevance, setMinimumRelevance] = useState(0);
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [minimumFreshness, setMinimumFreshness] = useState(0);
  const [minimumCredibility, setMinimumCredibility] = useState(0);
  const [maximumMinutes, setMaximumMinutes] = useState(0);
  const types = useMemo(() => [...new Set(resources.map((resource) => resource.resourceType))].sort(), [resources]);
  const skills = useMemo(() => [...new Set(resources.flatMap((resource) => resource.skillTags))].sort(), [resources]);
  const visibleResources = resources.filter((resource) =>
    (typeFilter === "all" || resource.resourceType === typeFilter) &&
    (skillFilter === "all" || resource.skillTags.includes(skillFilter)) &&
    resource.relevance >= minimumRelevance &&
    (difficultyFilter === "all" || resource.difficulty === Number(difficultyFilter)) &&
    resource.freshness >= minimumFreshness &&
    resource.credibility >= minimumCredibility &&
    (maximumMinutes === 0 || resource.estimatedMinutes <= maximumMinutes),
  );

  if (status === "loading") return <p role="status" className="text-command-muted">正在載入資源情報…</p>;
  if (status === "error") return <p role="alert" className="text-command-danger">{errorMessage}</p>;
  if (resources.length === 0) return <EmptyState title="目前沒有可用資源。" description="資源情報更新後會顯示在這裡。" />;

  function clearFilters() {
    setTypeFilter("all");
    setSkillFilter("all");
    setMinimumRelevance(0);
    setDifficultyFilter("all");
    setMinimumFreshness(0);
    setMinimumCredibility(0);
    setMaximumMinutes(0);
  }

  return (
    <section aria-labelledby="resources-heading" className="space-y-6">
      <header>
        <p className="text-sm uppercase tracking-[0.24em] text-command-violet">Resource intelligence</p>
        <h1 id="resources-heading" className="text-3xl font-semibold text-command-text">學習資源</h1>
      </header>

      <fieldset className="command-panel grid gap-4 border border-command-border bg-command-surface/92 p-4 sm:grid-cols-2 xl:grid-cols-4">
        <legend className="px-2 font-data text-xs uppercase tracking-[0.14em] text-command-muted">資源篩選</legend>
        <label className="grid gap-2 text-sm text-command-text">資源類型<select className={selectClass} value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="all">全部類型</option>{types.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
        <label className="grid gap-2 text-sm text-command-text">能力標籤<select className={selectClass} value={skillFilter} onChange={(event) => setSkillFilter(event.target.value)}><option value="all">全部能力</option>{skills.map((skill) => <option key={skill} value={skill}>{skill}</option>)}</select></label>
        <label className="grid gap-2 text-sm text-command-text">最低相關性<select className={selectClass} value={minimumRelevance} onChange={(event) => setMinimumRelevance(Number(event.target.value))}><option value={0}>不限</option><option value={80}>80+</option><option value={90}>90+</option></select></label>
        <label className="grid gap-2 text-sm text-command-text">資源難度<select className={selectClass} value={difficultyFilter} onChange={(event) => setDifficultyFilter(event.target.value)}><option value="all">全部難度</option>{[1, 2, 3, 4, 5].map((difficulty) => <option key={difficulty} value={difficulty}>{difficulty} / 5</option>)}</select></label>
        <label className="grid gap-2 text-sm text-command-text">最低新鮮度<select className={selectClass} value={minimumFreshness} onChange={(event) => setMinimumFreshness(Number(event.target.value))}><option value={0}>不限</option><option value={80}>80+</option><option value={90}>90+</option></select></label>
        <label className="grid gap-2 text-sm text-command-text">最低可信度<select className={selectClass} value={minimumCredibility} onChange={(event) => setMinimumCredibility(Number(event.target.value))}><option value={0}>不限</option><option value={80}>80+</option><option value={90}>90+</option></select></label>
        <label className="grid gap-2 text-sm text-command-text">最長預估時間<select className={selectClass} value={maximumMinutes} onChange={(event) => setMaximumMinutes(Number(event.target.value))}><option value={0}>不限</option><option value={30}>30 分鐘內</option><option value={60}>60 分鐘內</option><option value={120}>120 分鐘內</option></select></label>
      </fieldset>

      {visibleResources.length === 0 ? (
        <EmptyState
          title="沒有符合目前篩選條件的資源"
          action={<Button variant="secondary" type="button" onClick={clearFilters}>清除資源篩選</Button>}
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
                <div><dt className="text-command-muted">相關性</dt><dd className="font-data text-command-text">Relevance {resource.relevance}</dd></div>
                <div><dt className="text-command-muted">難度</dt><dd className="font-data text-command-text">Difficulty {resource.difficulty} / 5</dd></div>
                <div><dt className="text-command-muted">新鮮度</dt><dd className="font-data text-command-text">Freshness {resource.freshness}</dd></div>
                <div><dt className="text-command-muted">可信度</dt><dd className="font-data text-command-text">Credibility {resource.credibility}</dd></div>
                <div><dt className="text-command-muted">預估時間</dt><dd className="font-data text-command-text">{resource.estimatedMinutes} 分鐘</dd></div>
              </dl>
              <ul aria-label="資源能力標籤" className="mt-4 flex flex-wrap gap-2">
                {resource.skillTags.map((skill) => <li key={skill}><Badge>{skill}</Badge></li>)}
              </ul>
              {resource.url ? (
                <a
                  className="mt-5 inline-flex min-h-11 items-center rounded-sm border border-command-border bg-command-raised px-4 font-display text-sm font-semibold uppercase tracking-[0.09em] text-command-text transition-colors hover:border-command-cyan/60 hover:text-command-cyan"
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`開啟來源：${resource.title}`}
                >
                  開啟來源
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
