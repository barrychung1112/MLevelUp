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

vi.mock("next/navigation", () => ({
  usePathname: () => window.location.pathname,
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

  it("keeps the public entry usable when Supabase configuration is missing", async () => {
    mocks.getBrowserSupabaseClient.mockReturnValue(null);

    renderAuth(
      <AuthGate>
        <p>training app</p>
      </AuthGate>,
    );

    expect(await screen.findByRole("link", { name: "Watch the challenge" })).toBeVisible();
    expect(screen.queryByText("training app")).not.toBeInTheDocument();
  });

  it("bypasses auth only when demo mode is enabled", async () => {
    process.env.NEXT_PUBLIC_MLEVELUP_DEMO_MODE = "1";
    mocks.getBrowserSupabaseClient.mockReturnValue(null);
    window.history.replaceState(null, "", "http://localhost:3000/dashboard");

    renderAuth(
      <AuthGate>
        <p>training app</p>
      </AuthGate>,
    );

    expect(await screen.findByText("training app")).toBeVisible();
  });

  it("allows an anonymous public portfolio route without bypassing private routes", async () => {
    mocks.getBrowserSupabaseClient.mockReturnValue(null);
    window.history.replaceState(null, "", "http://localhost:3000/p/demo-ml-engineer");

    renderAuth(
      <AuthGate>
        <p>public portfolio</p>
      </AuthGate>,
    );

    expect(await screen.findByText("public portfolio")).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Supabase setup required" })).not.toBeInTheDocument();
  });

  it("allows the guided demo anonymously in every build mode", async () => {
    mocks.getBrowserSupabaseClient.mockReturnValue(null);
    window.history.replaceState(null, "", "http://localhost:3000/demo?guided=1");

    renderAuth(
      <AuthGate>
        <p>guided demo</p>
      </AuthGate>,
    );

    expect(await screen.findByText("guided demo")).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Supabase setup required" })).not.toBeInTheDocument();
  });

  it("shows a magic-link form and sends the request after confirmation", async () => {
    const client = createClient();
    mocks.getBrowserSupabaseClient.mockReturnValue(client);

    renderAuth(
      <AuthGate>
        <p>training app</p>
      </AuthGate>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("heading", { name: /become anyone you want to be/i })).toBeVisible();
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "hunter@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enter Training" }));
    expect(client.auth.signInWithOtp).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Accept the Challenge" }));

    await waitFor(() => expect(client.auth.signInWithOtp).toHaveBeenCalledOnce());
    expect(client.auth.signInWithOtp).toHaveBeenCalledWith({
      email: "hunter@example.com",
      options: {
        emailRedirectTo: "http://localhost:3000/auth/callback",
      },
    });
    expect(await screen.findByRole("status")).toHaveTextContent("Check your inbox");
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
