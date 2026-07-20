import type { ParsedPlatformUrl } from "./contracts";
import { parsePlatformUrl } from "./platform-url";
import type {
  ArtifactLinkVerificationRepository,
  ArtifactLinkVerificationSnapshot,
} from "./verification-repository";

type ProviderVerificationResult =
  | { status: "verified"; metadata: Record<string, unknown> }
  | { status: "unavailable" | "unsupported"; errorCode: string }
  | { status: "error"; errorCode: string; retryable: true };

type GitHubUrl = Extract<ParsedPlatformUrl, { provider: "github" }>;
type KaggleUrl = Extract<ParsedPlatformUrl, { provider: "kaggle" }>;

type VerifyDependencies = {
  repository: ArtifactLinkVerificationRepository;
  githubVerifier: { verify(url: GitHubUrl): Promise<ProviderVerificationResult> };
  kaggleVerifier: { verify(url: KaggleUrl): Promise<ProviderVerificationResult> };
  now?: () => Date;
};

export type ArtifactLinkVerificationView = {
  status: "verified" | "unavailable" | "unsupported" | "error";
  provider?: "github" | "kaggle";
  resourceType?: "repository" | "commit" | "notebook" | "competition";
  normalizedUrl?: string;
  metadata?: Record<string, unknown>;
  errorCode?: string;
  verifiedAt?: string | null;
  staleAfter?: string | null;
};

export type VerifyArtifactLinkResult =
  | { ok: false; reason: "artifact_not_found" }
  | { ok: true; verification: ArtifactLinkVerificationView };

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1_000;

export async function verifyArtifactLink(
  dependencies: VerifyDependencies,
  input: { userId: string; artifactId: string },
): Promise<VerifyArtifactLinkResult> {
  const artifact = await dependencies.repository.findOwnedArtifact(
    input.userId,
    input.artifactId,
  );
  if (!artifact) return { ok: false, reason: "artifact_not_found" };

  const parsed = artifact.artifactUrl
    ? parsePlatformUrl(artifact.artifactUrl)
    : { ok: false as const, reason: "unsupported_url" as const };
  if (!parsed.ok) {
    return { ok: true, verification: { status: "unsupported" } };
  }

  const providerResult =
    parsed.value.provider === "github"
      ? await dependencies.githubVerifier.verify(parsed.value)
      : await dependencies.kaggleVerifier.verify(parsed.value);
  const checkedAt = (dependencies.now ?? (() => new Date()))();
  const verifiedAt =
    providerResult.status === "verified" ? checkedAt.toISOString() : null;
  const staleAfter =
    providerResult.status === "verified"
      ? new Date(checkedAt.getTime() + THIRTY_DAYS_MS).toISOString()
      : null;
  const snapshot: ArtifactLinkVerificationSnapshot = {
    artifactId: artifact.id,
    userId: artifact.userId,
    provider: parsed.value.provider,
    resourceType: parsed.value.resourceType,
    normalizedUrl: parsed.value.normalizedUrl,
    externalId: parsed.value.externalId,
    status: providerResult.status,
    metadata:
      providerResult.status === "verified" ? providerResult.metadata : {},
    errorCode:
      providerResult.status === "verified" ? null : providerResult.errorCode,
    verifiedAt,
    staleAfter,
  };
  await dependencies.repository.save(snapshot);

  return {
    ok: true,
    verification: {
      status: snapshot.status,
      provider: snapshot.provider,
      resourceType: snapshot.resourceType,
      normalizedUrl: snapshot.normalizedUrl,
      metadata: snapshot.metadata,
      ...(snapshot.errorCode ? { errorCode: snapshot.errorCode } : {}),
      verifiedAt: snapshot.verifiedAt,
      staleAfter: snapshot.staleAfter,
    },
  };
}
