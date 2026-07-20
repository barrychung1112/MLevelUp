import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, test } from "vitest";

import { SupabaseResourceCatalogRepository } from "./supabase-catalog-repository";

describe("SupabaseResourceCatalogRepository run diagnostics", () => {
  test("persists model and prompt metadata when a run starts", async () => {
    const inserted: unknown[] = [];
    const client = {
      from: () => ({
        insert(value: unknown) {
          inserted.push(value);
          return { select: () => ({ single: async () => ({ data: { id: "run-1" }, error: null }) }) };
        },
      }),
    } as unknown as SupabaseClient;
    const repository = new SupabaseResourceCatalogRepository(client);

    await expect(repository.startRun({
      runKey: "2026-07-19",
      now: "2026-07-19T09:00:00.000Z",
      model: "gpt-test",
      promptVersion: "phase4-resource-v1",
    })).resolves.toBe("run-1");
    expect(inserted).toEqual([expect.objectContaining({
      model: "gpt-test",
      prompt_version: "phase4-resource-v1",
    })]);
  });

  test("persists all aggregate counts when a run finishes", async () => {
    const updates: unknown[] = [];
    const client = {
      from: () => ({
        update(value: unknown) {
          updates.push(value);
          return { eq: async () => ({ error: null }) };
        },
      }),
    } as unknown as SupabaseClient;
    const repository = new SupabaseResourceCatalogRepository(client);

    await repository.finishRun("run-1", {
      status: "degraded",
      candidateCount: 8,
      inserted: 3,
      updated: 2,
      duplicates: 1,
      rejected: 1,
      fallbackCount: 2,
      unavailableCount: 1,
      uncheckedCount: 1,
    });

    expect(updates).toEqual([expect.objectContaining({
      candidate_count: 8,
      inserted_count: 3,
      updated_count: 2,
      duplicate_count: 1,
      rejected_count: 1,
      fallback_count: 2,
      unavailable_count: 1,
      unchecked_count: 1,
    })]);
  });
});
