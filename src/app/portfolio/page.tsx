"use client";

import { PortfolioManager } from "@/components/features/portfolio/portfolio-manager";
import { usePortfolioPublication } from "@/providers/portfolio-publication-provider";
import { useTraining } from "@/providers/training-provider";

import { TrainingPageShell } from "../_components/training-page-shell";
import { mapArtifact } from "../_helpers/training-view-models";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import { generatePortfolioAchievements, updatePortfolioAchievements, verifyPortfolioLink } from "@/portfolio/portfolio-command-client";

export default function PortfolioPage() {
  const training = useTraining();
  const publication = usePortfolioPublication();
  const artifacts = (training.snapshot?.artifacts ?? []).map(mapArtifact);
  async function token() { const client = getBrowserSupabaseClient(); const session = await client?.auth.getSession(); const value = session?.data.session?.access_token; if (!value) throw new Error("Authentication required"); return value; }
  const enhancementProps = {
    onVerifyLink: async (artifactId: string) => { const result = await verifyPortfolioLink({ artifactId, accessToken: await token() }); return result.ok ? { ok: true, status: result.verification.status } : { ok: false, code: result.code }; },
    onGenerateAchievements: async (artifactId: string, replace: boolean) => generatePortfolioAchievements({ artifactId, replaceExistingDraft: replace, accessToken: await token() }),
    onUpdateAchievements: async (artifactId: string, action: "save" | "approve", bullets: Array<{ id: string; text: string }>) => updatePortfolioAchievements({ artifactId, action, bullets, accessToken: await token() }),
  };

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
          {...enhancementProps}
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
          {...enhancementProps}
        />
      )}
    </TrainingPageShell>
  );
}
