import { beforeEach, describe, expect, it, vi } from "vitest";

const getBrowserSupabaseClient = vi.fn();
vi.mock("@/lib/supabase/client", () => ({ getBrowserSupabaseClient }));

describe("createBrowserPortfolioPublicationRepository", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_MLEVELUP_DEMO_MODE;
    window.sessionStorage.clear();
  });

  it("uses local demo publication storage for an active sandbox", async () => {
    window.sessionStorage.setItem("mlevelup:sandbox-session:v1", "active");
    getBrowserSupabaseClient.mockReturnValue({ from: vi.fn(), rpc: vi.fn() });
    vi.resetModules();
    const { createBrowserPortfolioPublicationRepository } = await import("./portfolio-publication-provider");

    expect(createBrowserPortfolioPublicationRepository().constructor.name).toBe("DemoPortfolioPublicationRepository");
  });
});
