import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  ArtifactLinkVerificationRepository,
  ArtifactLinkVerificationSnapshot,
  VerificationArtifact,
} from "./verification-repository";

type ArtifactRow = {
  id: string;
  user_id: string;
  artifact_url: string | null;
};

export class VerificationRepositoryError extends Error {
  constructor() {
    super("Portfolio link verification storage is unavailable");
    this.name = "VerificationRepositoryError";
  }
}

export class SupabaseArtifactLinkVerificationRepository
  implements ArtifactLinkVerificationRepository
{
  constructor(private readonly client: SupabaseClient) {}

  async findOwnedArtifact(
    userId: string,
    artifactId: string,
  ): Promise<VerificationArtifact | null> {
    const { data, error } = await this.client
      .from("portfolio_artifacts")
      .select("id,user_id,artifact_url")
      .eq("user_id", userId)
      .eq("id", artifactId)
      .maybeSingle();

    if (error) throw new VerificationRepositoryError();
    const row = data as ArtifactRow | null;
    return row
      ? { id: row.id, userId: row.user_id, artifactUrl: row.artifact_url }
      : null;
  }

  async save(snapshot: ArtifactLinkVerificationSnapshot): Promise<void> {
    const { error } = await this.client
      .from("artifact_link_verifications")
      .upsert(
        {
          artifact_id: snapshot.artifactId,
          user_id: snapshot.userId,
          provider: snapshot.provider,
          resource_type: snapshot.resourceType,
          normalized_url: snapshot.normalizedUrl,
          external_id: snapshot.externalId,
          status: snapshot.status,
          metadata: snapshot.metadata,
          error_code: snapshot.errorCode,
          verified_at: snapshot.verifiedAt,
          stale_after: snapshot.staleAfter,
        },
        { onConflict: "artifact_id,normalized_url" },
      );

    if (error) throw new VerificationRepositoryError();
  }
}
