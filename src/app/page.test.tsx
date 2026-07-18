import { render, waitFor } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import type { DemoTrainingRepository } from "@/application/training/training-repository";
import { createTrainingSeed } from "@/mocks/training/seed";
import { TrainingProvider } from "@/providers/training-provider";

import Page from "./page";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

function repository(onboardingCompleted: boolean): DemoTrainingRepository {
  const state = createTrainingSeed("2026-07-16T16:00:00.000Z");
  state.profile.onboardingCompleted = onboardingCompleted;
  return {
    getSnapshot: async () => state,
    acceptChallenge: async () => state,
    completeOnboarding: async () => state,
    updateProfile: async () => state,
    startQuest: async () => state,
    submitQuest: async () => { throw new Error("not used"); },
    resetDemo: async () => state,
  };
}

describe("root entry", () => {
  test.each([
    [false, "/onboarding"],
    [true, "/dashboard"],
  ])("routes onboarding=%s to %s", async (completed, destination) => {
    replace.mockReset();
    render(
      <TrainingProvider createRepository={() => repository(completed)}>
        <Page />
      </TrainingProvider>,
    );

    await waitFor(() => expect(replace).toHaveBeenCalledWith(destination));
  });
});
