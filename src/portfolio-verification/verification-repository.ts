import type {
  LinkVerificationStatus,
  VerificationProvider,
  VerificationResourceType,
} from "./contracts";

export type VerificationArtifact = {
  id: string;
  userId: string;
  artifactUrl: string | null;
};

export type ArtifactLinkVerificationSnapshot = {
  artifactId: string;
  userId: string;
  provider: VerificationProvider;
  resourceType: VerificationResourceType;
  normalizedUrl: string;
  externalId: string;
  status: Exclude<LinkVerificationStatus, "stale">;
  metadata: Record<string, unknown>;
  errorCode: string | null;
  verifiedAt: string | null;
  staleAfter: string | null;
};

export interface ArtifactLinkVerificationRepository {
  findOwnedArtifact(
    userId: string,
    artifactId: string,
  ): Promise<VerificationArtifact | null>;
  save(snapshot: ArtifactLinkVerificationSnapshot): Promise<void>;
}
