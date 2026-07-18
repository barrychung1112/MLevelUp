import { describe, expect, it, vi } from "vitest";

const getBrowserSupabaseClient = vi.fn();
const createServerSubmitClient = vi.fn().mockReturnValue({ submit: vi.fn() });

vi.mock("@/lib/supabase/client", () => ({
  getBrowserSupabaseClient,
}));

vi.mock("@/supabase-training/server-submit-client", () => ({
  createServerSubmitClient,
}));

describe("createBrowserTrainingRepository", () => {
  it("keeps the mock repository when demo mode is enabled", async () => {
    process.env.NEXT_PUBLIC_MLEVELUP_DEMO_MODE = "1";
    getBrowserSupabaseClient.mockReturnValue({
      auth: { getUser: vi.fn() },
      from: vi.fn(),
    });
    vi.resetModules();
    const { createBrowserTrainingRepository } = await import("./training-provider");

    expect(createBrowserTrainingRepository().constructor.name).toBe("MockTrainingRepository");
    delete process.env.NEXT_PUBLIC_MLEVELUP_DEMO_MODE;
  });

  it("uses the Supabase repository when a browser client is configured", async () => {
    delete process.env.NEXT_PUBLIC_MLEVELUP_DEMO_MODE;
    const client = {
      auth: { getUser: vi.fn() },
      from: vi.fn(),
    };
    getBrowserSupabaseClient.mockReturnValue(client);
    vi.resetModules();
    const { createBrowserTrainingRepository } = await import("./training-provider");

    expect(createBrowserTrainingRepository().constructor.name).toBe("SupabaseTrainingRepository");
    expect(createServerSubmitClient).toHaveBeenCalledWith(client);
  });
});
