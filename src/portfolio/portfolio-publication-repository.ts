import type {
  PortfolioPublicationState,
  PublicPortfolioProfileInput,
  PublishArtifactInput,
} from "./contracts";

export type PortfolioPublicationErrorCode =
  | "not_authenticated"
  | "slug_conflict"
  | "artifact_not_found"
  | "artifact_not_verified"
  | "artifact_url_not_https"
  | "featured_limit"
  | "invalid_public_fields"
  | "profile_required"
  | "unavailable";

export class PortfolioPublicationError extends Error {
  constructor(
    public readonly code: PortfolioPublicationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "PortfolioPublicationError";
  }
}

export interface PortfolioPublicationRepository {
  load(): Promise<PortfolioPublicationState>;
  saveProfile(input: PublicPortfolioProfileInput): Promise<void>;
  setVisibility(isPublished: boolean): Promise<void>;
  publishArtifact(input: PublishArtifactInput): Promise<void>;
  unpublishArtifact(artifactId: string): Promise<void>;
}
