"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

import type { LoadableViewProps, PortfolioArtifactView } from "../view-models";

type PortfolioGalleryProps = LoadableViewProps & {
  artifacts: readonly PortfolioArtifactView[];
};

const selectClass =
  "min-h-11 rounded-sm border border-command-border bg-command-bg/80 px-3 text-base text-command-text outline-none transition-[border-color,box-shadow] hover:border-command-muted/70 focus-visible:border-command-cyan focus-visible:shadow-[0_0_0_3px_rgba(77,231,255,0.12)]";

export function PortfolioGallery({ artifacts, status = "ready", errorMessage = "無法載入私人作品集。" }: PortfolioGalleryProps) {
  const [typeFilter, setTypeFilter] = useState("all");
  const [skillFilter, setSkillFilter] = useState("all");
  const privateArtifacts = artifacts.filter((artifact) => artifact.isPrivate === true);
  const types = useMemo(() => [...new Set(privateArtifacts.map((artifact) => artifact.artifactType))].sort(), [privateArtifacts]);
  const skills = useMemo(() => [...new Set(privateArtifacts.flatMap((artifact) => artifact.skillTags))].sort(), [privateArtifacts]);
  const visibleArtifacts = privateArtifacts.filter((artifact) =>
    (typeFilter === "all" || artifact.artifactType === typeFilter) &&
    (skillFilter === "all" || artifact.skillTags.includes(skillFilter)),
  );

  if (status === "loading") return <p role="status" className="text-command-muted">正在整理作品集…</p>;
  if (status === "error") return <p role="alert" className="text-command-danger">{errorMessage}</p>;
  if (artifacts.length === 0) return <EmptyState title="私人作品集尚無成果" description="完成符合品質門檻的任務後，成果會出現在私人作品集中。" />;
  if (privateArtifacts.length === 0) return <EmptyState title="沒有可安全顯示的私人作品。" description="系統已隱藏未標記為私人的輸入資料。" />;

  function clearFilters() {
    setTypeFilter("all");
    setSkillFilter("all");
  }

  return (
    <section aria-labelledby="portfolio-heading" className="space-y-6">
      <header>
        <p className="text-sm uppercase tracking-[0.24em] text-command-success">Artifact vault</p>
        <h1 id="portfolio-heading" className="text-3xl font-semibold text-command-text">私人作品集</h1>
        <p className="mt-2 text-command-muted">Phase 1 的成果只保留在 Demo 狀態，不會公開或分享。</p>
      </header>

      <fieldset className="command-panel grid gap-4 border border-command-border bg-command-surface/92 p-4 sm:grid-cols-2">
        <legend className="px-2 font-data text-xs uppercase tracking-[0.14em] text-command-muted">作品篩選</legend>
        <label className="grid gap-2 text-sm text-command-text">
          成果類型
          <select className={selectClass} value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="all">全部類型</option>
            {types.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm text-command-text">
          能力標籤
          <select className={selectClass} value={skillFilter} onChange={(event) => setSkillFilter(event.target.value)}>
            <option value="all">全部能力</option>
            {skills.map((skill) => <option key={skill} value={skill}>{skill}</option>)}
          </select>
        </label>
      </fieldset>

      {visibleArtifacts.length === 0 ? (
        <EmptyState
          title="沒有符合目前篩選條件的作品"
          action={<Button variant="secondary" type="button" onClick={clearFilters}>清除作品篩選</Button>}
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleArtifacts.map((artifact) => (
            <li key={artifact.id} className="command-panel border border-command-border bg-command-surface/92 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Badge tone="success">Private · Demo</Badge>
                <span className="text-xs text-command-muted">{artifact.artifactType}</span>
              </div>
              <h2 className="mt-4 text-lg font-semibold text-command-text">{artifact.title}</h2>
              {artifact.summary ? <p className="mt-2 text-command-muted">{artifact.summary}</p> : null}
              <p className="mt-4 font-data text-command-text">Quality {artifact.qualityScore} / 100</p>
              <p className="mt-1 text-sm text-command-warning">{artifact.verificationStatus} · Demo</p>
              <ul aria-label="作品能力標籤" className="mt-4 flex flex-wrap gap-2">
                {artifact.skillTags.map((skill) => <li key={skill}><Badge>{skill}</Badge></li>)}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
