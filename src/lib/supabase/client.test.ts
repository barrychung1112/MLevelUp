import { beforeEach, describe, expect, it, vi } from "vitest";

const createClient = vi.fn((url: string, anonKey: string, options: unknown) => ({
  anonKey,
  options,
  url,
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient,
}));

describe("getBrowserSupabaseClient", () => {
  beforeEach(() => {
    vi.resetModules();
    createClient.mockClear();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  it("returns null when public Supabase configuration is missing", async () => {
    const { getBrowserSupabaseClient } = await import("./client");

    expect(getBrowserSupabaseClient()).toBeNull();
    expect(createClient).not.toHaveBeenCalled();
  });

  it("creates and reuses a browser client when public configuration is available", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "publishable-key";
    const { getBrowserSupabaseClient } = await import("./client");

    const firstClient = getBrowserSupabaseClient();
    const secondClient = getBrowserSupabaseClient();

    expect(firstClient).toBe(secondClient);
    expect(createClient).toHaveBeenCalledOnce();
    expect(createClient).toHaveBeenCalledWith("https://example.supabase.co", "publishable-key", {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    });
  });
});
