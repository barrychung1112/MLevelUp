import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import CallbackPage from "./page";

const mocks = vi.hoisted(() => ({
  getBrowserSupabaseClient: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
}));

vi.mock("@/lib/supabase/client", () => ({
  getBrowserSupabaseClient: mocks.getBrowserSupabaseClient,
}));

describe("auth callback page", () => {
  beforeEach(() => {
    mocks.replace.mockReset();
    mocks.getBrowserSupabaseClient.mockReset();
    window.history.replaceState(null, "", "http://localhost:3000/auth/callback?code=abc");
  });

  it("exchanges the callback code and returns to the app", async () => {
    const exchangeCodeForSession = vi.fn(async () => ({ data: {}, error: null }));
    mocks.getBrowserSupabaseClient.mockReturnValue({
      auth: { exchangeCodeForSession },
    });

    render(<CallbackPage />);

    expect(await screen.findByRole("status")).toHaveTextContent("Signing you in");
    await waitFor(() => expect(exchangeCodeForSession).toHaveBeenCalledWith("abc"));
    expect(mocks.replace).toHaveBeenCalledWith("/");
  });

  it("shows a recovery message when Supabase is not configured", async () => {
    mocks.getBrowserSupabaseClient.mockReturnValue(null);

    render(<CallbackPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Supabase setup required");
    expect(mocks.replace).not.toHaveBeenCalled();
  });
});
