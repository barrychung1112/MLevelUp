"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import {
  DEFAULT_PORTFOLIO_FILTERS,
  PortfolioGallery,
  type PortfolioFilters,
} from "@/components/features/portfolio/portfolio-gallery";
import { useTraining } from "@/providers/training-provider";

import { TrainingPageShell } from "../_components/training-page-shell";
import { mapArtifact } from "../_helpers/training-view-models";

function PortfolioContent() {
  const training = useTraining();
  const pathname = usePathname();
  const router = useRouter();
  const search = useSearchParams();
  const artifacts = (training.snapshot?.artifacts ?? []).map(mapArtifact);
  const privateArtifacts = artifacts.filter((artifact) => artifact.isPrivate);
  const artifactTypes = new Set(
    privateArtifacts.map((artifact) => artifact.artifactType),
  );
  const skills = new Set(
    privateArtifacts.flatMap((artifact) => artifact.skillTags),
  );
  const artifactType = search.get("type");
  const skill = search.get("skill");
  const filters: PortfolioFilters = {
    ...DEFAULT_PORTFOLIO_FILTERS,
    artifactType:
      artifactType !== null && artifactTypes.has(artifactType)
        ? artifactType
        : "all",
    skill: skill !== null && skills.has(skill) ? skill : "all",
  };

  function replaceFilters(nextFilters: PortfolioFilters) {
    const query = new URLSearchParams();
    if (nextFilters.artifactType !== "all") {
      query.set("type", nextFilters.artifactType);
    }
    if (nextFilters.skill !== "all") query.set("skill", nextFilters.skill);
    const queryString = query.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
  }

  return (
    <TrainingPageShell>
      <PortfolioGallery
        artifacts={artifacts}
        filters={filters}
        onFiltersChange={replaceFilters}
        status={training.status === "ready" ? "ready" : training.status}
        errorMessage={training.loadError ?? undefined}
      />
    </TrainingPageShell>
  );
}

export default function PortfolioPage() {
  return (
    <Suspense
      fallback={
        <p role="status" className="p-6 text-command-muted">
          正在載入私人作品集…
        </p>
      }
    >
      <PortfolioContent />
    </Suspense>
  );
}
