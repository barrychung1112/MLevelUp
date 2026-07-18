import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import { AuthGate } from "./auth-gate";
import { AuthProvider, useAuth } from "./auth-provider";

const mocks = vi.hoisted(() => ({
  getBrowserSupabaseClient: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  getBrowserSupabaseClient: mocks.getBrowserSupabaseClient,
}));

function createClient(session: unknown = null) {
  return {
    auth: {
      getSession: vi.fn(async () => ({ data: { session }, error: null })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signInWithOtp: vi.fn(async () => ({ data: {}, error: null })),
      signOut: vi.fn(async () => ({ error: null })),
    },
  };
}

function renderAuth(children: ReactNode) {
  return render(<AuthProvider>{children}</AuthProvider>);
}

function StatusProbe() {
  const auth = useAuth();
  return <p role="status">{auth.status}</p>;
}

describe("AuthProvider and AuthGate", () => {
  beforeEach(() => {
    mocks.getBrowserSupabaseClient.mockReset();
    delete process.env.NEXT_PUBLIC_MLEVELUP_DEMO_MODE;
    window.history.replaceState(null, "", "http://localhost:3000/");
  });

  it("reports unavailable when public Supabase configuration is missing", async () => {
    mocks.getBrowserSupabaseClient.mockReturnValue(null);

    renderAuth(
      <AuthGate>
        <p>training app</p>
      </AuthGate>,
    );

    expect(await screen.findByRole("heading", { name: "Supabase setup required" })).toBeVisible();
    expect(screen.queryByText("training app")).not.toBeInTheDocument();
  });

  it("bypasses auth only when demo mode is enabled", async () => {
    process.env.NEXT_PUBLIC_MLEVELUP_DEMO_MODE = "1";
    mocks.getBrowserSupabaseClient.mockReturnValue(null);

    renderAuth(
      <AuthGate>
        <p>training app</p>
      </AuthGate>,
    );

    expect(await screen.findByText("training app")).toBeVisible();
  });

  it("shows a magic-link form and sends the request through Supabase", async () => {
    const client = createClient();
    mocks.getBrowserSupabaseClient.mockReturnValue(client);

    renderAuth(
      <AuthGate>
        <p>training app</p>
      </AuthGate>,
    );

    expect(await screen.findByRole("heading", { name: "進入訓練終端" })).toBeVisible();
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "hunter@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "寄送登入連結" }));

    await waitFor(() => expect(client.auth.signInWithOtp).toHaveBeenCalledOnce());
    expect(client.auth.signInWithOtp).toHaveBeenCalledWith({
      email: "hunter@example.com",
      options: {
        emailRedirectTo: "http://localhost:3000/auth/callback",
      },
    });
    expect(await screen.findByRole("status")).toHaveTextContent("登入連結已寄出");
  });

  it("renders children when a session already exists", async () => {
    const client = createClient({ user: { id: "user-1", email: "hunter@example.com" } });
    mocks.getBrowserSupabaseClient.mockReturnValue(client);

    renderAuth(
      <AuthGate>
        <p>training app</p>
      </AuthGate>,
    );

    expect(await screen.findByText("training app")).toBeVisible();
  });

  it("exposes signedOut status when no session exists", async () => {
    const client = createClient();
    mocks.getBrowserSupabaseClient.mockReturnValue(client);

    renderAuth(<StatusProbe />);

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("signedOut"));
  });
});
