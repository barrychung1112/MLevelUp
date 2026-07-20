"use client";

import { PortfolioManager } from "@/components/features/portfolio/portfolio-manager";
import { usePortfolioPublication } from "@/providers/portfolio-publication-provider";
import { useTraining } from "@/providers/training-provider";

import { TrainingPageShell } from "../_components/training-page-shell";
import { mapArtifact } from "../_helpers/training-view-models";

export default function PortfolioPage() {
  const training = useTraining();
  const publication = usePortfolioPublication();
  const artifacts = (training.snapshot?.artifacts ?? []).map(mapArtifact);

  return (
    <TrainingPageShell>
      {publication.status === "ready" && publication.state ? (
        <PortfolioManager
          privateArtifacts={artifacts}
          publication={publication.state}
          status="ready"
          commandStatus={publication.commandStatus}
          errorMessage={publication.commandError}
          successMessage={publication.commandSuccess}
          onSaveProfile={publication.saveProfile}
          onSetVisibility={publication.setVisibility}
          onPublishArtifact={publication.publishArtifact}
          onUnpublishArtifact={publication.unpublishArtifact}
        />
      ) : (
        <PortfolioManager
          privateArtifacts={artifacts}
          publication={{ profile: null, artifacts: [] }}
          status={publication.status}
          commandStatus={publication.commandStatus}
          errorMessage={publication.loadError}
          onSaveProfile={publication.saveProfile}
          onSetVisibility={publication.setVisibility}
          onPublishArtifact={publication.publishArtifact}
          onUnpublishArtifact={publication.unpublishArtifact}
        />
      )}
    </TrainingPageShell>
  );
}
