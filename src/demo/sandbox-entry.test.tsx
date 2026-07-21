import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LocalTrainingStorage } from "@/mocks/training/local-storage";
import { MockTrainingRepository } from "@/mocks/training/mock-training-repository";
import { SEED_VERSION } from "@/mocks/training/seed";
import { TrainingProvider } from "@/providers/training-provider";

import { SandboxEntry } from "./sandbox-entry";
import { SANDBOX_SESSION_KEY } from "./sandbox-session";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

describe("SandboxEntry", () => {
  beforeEach(() => {
    replace.mockReset();
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.sessionStorage.setItem(SANDBOX_SESSION_KEY, "active");
  });

  it("requires the warning acceptance before preparing the fixed fake learner", async () => {
    const user = userEvent.setup();
    window.localStorage.clear();
    const repository = new MockTrainingRepository({
      storage: new LocalTrainingStorage(window.localStorage, SEED_VERSION),
      clock: { now: () => "2026-07-20T12:00:00.000Z" },
      ids: { next: (prefix) => `${prefix}-test` },
    });

    render(<TrainingProvider createRepository={() => repository}><SandboxEntry /></TrainingProvider>);

    expect(await screen.findByRole("dialog", { name: "Sandbox Challenger Warning" })).toBeVisible();
    expect(screen.getByText("You are about to enter a simulated learner account.")).toBeVisible();
    expect(replace).not.toHaveBeenCalled();
    expect((await repository.getSnapshot()).profile.onboardingCompleted).toBe(false);

    await user.click(screen.getByRole("button", { name: "Accept and enter sandbox" }));

    expect(screen.getByRole("status")).toHaveTextContent("Signing in as Alex Pathfinder");
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
    const state = await repository.getSnapshot();
    expect(state.profile.displayName).toBe("Alex Pathfinder");
    expect(state.profile.onboardingCompleted).toBe(true);
    expect(state.profile.challengeAcceptedAt).not.toBeNull();
  });

  it("clears the sandbox session and returns home when the visitor goes back", async () => {
    const user = userEvent.setup();
    const repository = new MockTrainingRepository({
      storage: new LocalTrainingStorage(window.localStorage, SEED_VERSION),
      clock: { now: () => "2026-07-20T12:00:00.000Z" },
      ids: { next: (prefix) => `${prefix}-test` },
    });

    render(<TrainingProvider createRepository={() => repository}><SandboxEntry /></TrainingProvider>);
    await user.click(await screen.findByRole("button", { name: "Go back" }));

    expect(window.sessionStorage.getItem(SANDBOX_SESSION_KEY)).toBeNull();
    expect(replace).toHaveBeenCalledWith("/");
    expect((await repository.getSnapshot()).profile.onboardingCompleted).toBe(false);
  });
});
