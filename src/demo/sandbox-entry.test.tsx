import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LocalTrainingStorage } from "@/mocks/training/local-storage";
import { MockTrainingRepository } from "@/mocks/training/mock-training-repository";
import { SEED_VERSION } from "@/mocks/training/seed";
import { TrainingProvider } from "@/providers/training-provider";

import { SandboxEntry } from "./sandbox-entry";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

describe("SandboxEntry", () => {
  it("prepares the fixed fake learner and enters the dashboard", async () => {
    window.localStorage.clear();
    const repository = new MockTrainingRepository({
      storage: new LocalTrainingStorage(window.localStorage, SEED_VERSION),
      clock: { now: () => "2026-07-20T12:00:00.000Z" },
      ids: { next: (prefix) => `${prefix}-test` },
    });

    render(<TrainingProvider createRepository={() => repository}><SandboxEntry /></TrainingProvider>);

    expect(screen.getByRole("status")).toHaveTextContent("Preparing fake learner account");
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
    const state = await repository.getSnapshot();
    expect(state.profile.displayName).toBe("Alex Pathfinder");
    expect(state.profile.onboardingCompleted).toBe(true);
    expect(state.profile.challengeAcceptedAt).not.toBeNull();
  });
});
