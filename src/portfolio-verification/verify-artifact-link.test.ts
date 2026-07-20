import { describe, expect, it, vi } from "vitest";

import type {
  ArtifactLinkVerificationRepository,
  VerificationArtifact,
} from "./verification-repository";
import { verifyArtifactLink } from "./verify-artifact-link";

function repositoryFor(artifact: VerificationArtifact | null) {
  return {
    findOwnedArtifact: vi.fn(async () => artifact),
    save: vi.fn(async () => undefined),
  } satisfies ArtifactLinkVerificationRepository;
}

const artifact: VerificationArtifact = {
  id: "11111111-1111-4111-8111-111111111111",
  userId: "22222222-2222-4222-8222-222222222222",
  artifactUrl: "https://github.com/openai/openai-node",
};

describe("verifyArtifactLink", () => {
  it("returns the same not-found result for missing or foreign artifacts", async () => {
    const repository = repositoryFor(null);

    await expect(
      verifyArtifactLink(
        {
          repository,
          githubVerifier: { verify: vi.fn() },
          kaggleVerifier: { verify: vi.fn() },
        },
        { userId: artifact.userId, artifactId: artifact.id },
      ),
    ).resolves.toEqual({ ok: false, reason: "artifact_not_found" });
    expect(repository.findOwnedArtifact).toHaveBeenCalledWith(
      artifact.userId,
      artifact.id,
    );
  });

  it("rejects an unsafe canonical URL without an adapter call or persistence", async () => {
    const repository = repositoryFor({
      ...artifact,
      artifactUrl: "https://127.0.0.1/internal",
    });
    const githubVerifier = { verify: vi.fn() };
    const kaggleVerifier = { verify: vi.fn() };

    await expect(
      verifyArtifactLink(
        { repository, githubVerifier, kaggleVerifier },
        { userId: artifact.userId, artifactId: artifact.id },
      ),
    ).resolves.toEqual({ ok: true, verification: { status: "unsupported" } });
    expect(githubVerifier.verify).not.toHaveBeenCalled();
    expect(kaggleVerifier.verify).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("dispatches GitHub and persists a 30-day verification snapshot", async () => {
    const repository = repositoryFor(artifact);
    const githubVerifier = {
      verify: vi.fn(async () => ({
        status: "verified" as const,
        metadata: { fullName: "openai/openai-node" },
      })),
    };
    const now = new Date("2026-07-20T12:00:00.000Z");

    const result = await verifyArtifactLink(
      {
        repository,
        githubVerifier,
        kaggleVerifier: { verify: vi.fn() },
        now: () => now,
      },
      { userId: artifact.userId, artifactId: artifact.id },
    );

    expect(githubVerifier.verify).toHaveBeenCalledOnce();
    expect(repository.save).toHaveBeenCalledWith({
      artifactId: artifact.id,
      userId: artifact.userId,
      provider: "github",
      resourceType: "repository",
      normalizedUrl: "https://github.com/openai/openai-node",
      externalId: "openai/openai-node",
      status: "verified",
      metadata: { fullName: "openai/openai-node" },
      errorCode: null,
      verifiedAt: "2026-07-20T12:00:00.000Z",
      staleAfter: "2026-08-19T12:00:00.000Z",
    });
    expect(result).toEqual({
      ok: true,
      verification: expect.objectContaining({
        status: "verified",
        staleAfter: "2026-08-19T12:00:00.000Z",
      }),
    });
  });

  it("dispatches Kaggle and persists only a sanitized error code", async () => {
    const repository = repositoryFor({
      ...artifact,
      artifactUrl: "https://www.kaggle.com/competitions/titanic",
    });
    const kaggleVerifier = {
      verify: vi.fn(async () => ({
        status: "error" as const,
        errorCode: "kaggle_timeout",
        retryable: true as const,
      })),
    };

    await verifyArtifactLink(
      {
        repository,
        githubVerifier: { verify: vi.fn() },
        kaggleVerifier,
      },
      { userId: artifact.userId, artifactId: artifact.id },
    );

    expect(kaggleVerifier.verify).toHaveBeenCalledOnce();
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "error",
        metadata: {},
        errorCode: "kaggle_timeout",
        verifiedAt: null,
        staleAfter: null,
      }),
    );
  });
});
