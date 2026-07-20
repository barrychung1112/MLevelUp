import { describe, expect, it, vi } from "vitest";

import {
  createKaggleVerifier,
  type KaggleMetadataClient,
  type KaggleMetadataResult,
} from "./kaggle-verifier";
import { parsePlatformUrl } from "./platform-url";

function kaggleUrl(url: string) {
  const parsed = parsePlatformUrl(url);
  if (!parsed.ok || parsed.value.provider !== "kaggle") {
    throw new Error("Expected a Kaggle URL");
  }
  return parsed.value;
}

function clientReturning(result: KaggleMetadataResult): KaggleMetadataClient {
  return {
    getNotebook: vi.fn(async () => result),
    getCompetition: vi.fn(async () => result),
  };
}

describe("Kaggle verifier", () => {
  it("returns unsupported without a configured stable official metadata client", async () => {
    const verifier = createKaggleVerifier();

    await expect(
      verifier.verify(
        kaggleUrl("https://www.kaggle.com/code/learner/titanic-baseline"),
      ),
    ).resolves.toEqual({
      status: "unsupported",
      errorCode: "provider_metadata_unsupported",
    });
  });

  it("allowlists public notebook metadata from the configured client", async () => {
    const client = clientReturning({
      kind: "found",
      metadata: {
        ref: "learner/titanic-baseline",
        title: "Titanic baseline",
        lastUpdated: "2026-07-18T12:00:00Z",
        isPublic: true,
        ownerEmail: "private@example.com",
        rawHtml: "<secret>",
      },
    });
    const verifier = createKaggleVerifier({ client });

    const result = await verifier.verify(
      kaggleUrl("https://www.kaggle.com/code/learner/titanic-baseline"),
    );

    expect(client.getNotebook).toHaveBeenCalledWith({
      owner: "learner",
      notebook: "titanic-baseline",
    });
    expect(result).toEqual({
      status: "verified",
      metadata: {
        ownerReference: "learner",
        notebookSlug: "titanic-baseline",
        title: "Titanic baseline",
        lastUpdatedAt: "2026-07-18T12:00:00Z",
        public: true,
      },
    });
    expect(JSON.stringify(result)).not.toContain("private@example.com");
    expect(JSON.stringify(result)).not.toContain("rawHtml");
  });

  it("allowlists public competition metadata from the configured client", async () => {
    const client = clientReturning({
      kind: "found",
      metadata: {
        ref: "titanic",
        title: "Titanic",
        category: "gettingStarted",
        deadline: "2030-01-01T00:00:00Z",
        isPublic: true,
        rules: "not persisted",
      },
    });
    const verifier = createKaggleVerifier({ client });

    const result = await verifier.verify(
      kaggleUrl("https://www.kaggle.com/competitions/titanic"),
    );

    expect(client.getCompetition).toHaveBeenCalledWith({
      competition: "titanic",
    });
    expect(result).toEqual({
      status: "verified",
      metadata: {
        competitionSlug: "titanic",
        title: "Titanic",
        category: "gettingStarted",
        deadline: "2030-01-01T00:00:00Z",
        public: true,
      },
    });
    expect(JSON.stringify(result)).not.toContain("rules");
  });

  it.each([
    [{ kind: "not_found" }, { status: "unavailable", errorCode: "kaggle_not_found" }],
    [{ kind: "authentication_required" }, { status: "unsupported", errorCode: "provider_metadata_unsupported" }],
    [{ kind: "rate_limited" }, { status: "error", errorCode: "kaggle_rate_limited", retryable: true }],
    [{ kind: "timeout" }, { status: "error", errorCode: "kaggle_timeout", retryable: true }],
    [{ kind: "redirect" }, { status: "error", errorCode: "kaggle_unexpected_redirect", retryable: true }],
    [{ kind: "invalid_response" }, { status: "error", errorCode: "kaggle_invalid_response", retryable: true }],
  ] as const)("maps metadata result %# truthfully", async (metadataResult, expected) => {
    const verifier = createKaggleVerifier({
      client: clientReturning(metadataResult),
    });

    await expect(
      verifier.verify(
        kaggleUrl("https://www.kaggle.com/competitions/titanic"),
      ),
    ).resolves.toEqual(expected);
  });

  it("does not verify private or malformed metadata", async () => {
    const privateVerifier = createKaggleVerifier({
      client: clientReturning({
        kind: "found",
        metadata: {
          ref: "learner/private-notebook",
          title: "Private",
          lastUpdated: "2026-07-18T12:00:00Z",
          isPublic: false,
        },
      }),
    });
    const malformedVerifier = createKaggleVerifier({
      client: clientReturning({ kind: "found", metadata: { title: 42 } }),
    });

    await expect(
      privateVerifier.verify(
        kaggleUrl("https://www.kaggle.com/code/learner/private-notebook"),
      ),
    ).resolves.toEqual({
      status: "unavailable",
      errorCode: "kaggle_not_public",
    });
    await expect(
      malformedVerifier.verify(
        kaggleUrl("https://www.kaggle.com/competitions/titanic"),
      ),
    ).resolves.toEqual({
      status: "error",
      errorCode: "kaggle_invalid_response",
      retryable: true,
    });
  });
});
