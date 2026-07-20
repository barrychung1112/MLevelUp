import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { SupabaseArtifactLinkVerificationRepository } from "./supabase-verification-repository";

describe("SupabaseArtifactLinkVerificationRepository", () => {
  it("looks up an artifact by both user and artifact id", async () => {
    const maybeSingle = vi.fn(async () => ({
      data: {
        id: "artifact-1",
        user_id: "user-1",
        artifact_url: "https://github.com/openai/openai-node",
      },
      error: null,
    }));
    const eq = vi.fn();
    const query = { eq, maybeSingle };
    eq.mockReturnValue(query);
    const from = vi.fn(() => ({ select: vi.fn(() => query) }));
    const repository = new SupabaseArtifactLinkVerificationRepository({
      from,
    } as unknown as SupabaseClient);

    await expect(repository.findOwnedArtifact("user-1", "artifact-1"))
      .resolves.toEqual({
        id: "artifact-1",
        userId: "user-1",
        artifactUrl: "https://github.com/openai/openai-node",
      });
    expect(eq).toHaveBeenNthCalledWith(1, "user_id", "user-1");
    expect(eq).toHaveBeenNthCalledWith(2, "id", "artifact-1");
  });

  it("upserts one current normalized snapshot", async () => {
    const upsert = vi.fn(async () => ({ data: null, error: null }));
    const from = vi.fn(() => ({ upsert }));
    const repository = new SupabaseArtifactLinkVerificationRepository({
      from,
    } as unknown as SupabaseClient);

    await repository.save({
      artifactId: "artifact-1",
      userId: "user-1",
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

    expect(from).toHaveBeenCalledWith("artifact_link_verifications");
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        artifact_id: "artifact-1",
        user_id: "user-1",
        normalized_url: "https://github.com/openai/openai-node",
      }),
      { onConflict: "artifact_id,normalized_url" },
    );
  });
});
