import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import type {
  CompleteOnboardingInput,
  DemoTrainingRepository,
  UpdateProfileInput,
} from "@/application/training/training-repository";
import type { TrainingState } from "@/domain/training/types";
import { STORAGE_KEY } from "@/mocks/training/local-storage";
import { createTrainingSeed } from "@/mocks/training/seed";

import { TrainingProvider, useTraining } from "./training-provider";

const now = "2026-07-16T16:00:00.000Z";

function cloneState(state: TrainingState): TrainingState {
  return structuredClone(state);
}

function resolvedRepository(initial = createTrainingSeed(now)): DemoTrainingRepository {
  let state = cloneState(initial);
  return {
    async getSnapshot() {
      return cloneState(state);
    },
    async completeOnboarding(input: CompleteOnboardingInput) {
      state = cloneState(state);
      state.profile = { ...state.profile, ...input, onboardingCompleted: true };
      return cloneState(state);
    },
    async updateProfile(input: UpdateProfileInput) {
      state = cloneState(state);
      state.profile = { ...state.profile, ...input };
      return cloneState(state);
    },
    async startQuest() {
      return cloneState(state);
    },
    async submitQuest() {
      throw new Error("not used in this provider test");
    },
    async resetDemo() {
      state = createTrainingSeed(now);
      return cloneState(state);
    },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function ProviderProbe({ commandIdentities }: { commandIdentities?: Set<unknown> }) {
  const training = useTraining();
  commandIdentities?.add(training.updateProfile);

  return (
    <>
      <p role="status">{training.status}</p>
      <p data-testid="goal">{training.snapshot?.profile.goal ?? "none"}</p>
      <p data-testid="command-status">{training.commandStatus}</p>
      <p data-testid="command-error">{training.commandError ?? "none"}</p>
      <button
        type="button"
        onClick={() => void training.updateProfile({ goal: "first" }).catch(() => undefined)}
      >
        first
      </button>
      <button
        type="button"
        onClick={() => void training.updateProfile({ goal: "second" }).catch(() => undefined)}
      >
        second
      </button>
    </>
  );
}

describe("TrainingProvider", () => {
  test("hydrates from the browser adapter and falls back from corrupt storage", async () => {
    window.localStorage.clear();
    window.localStorage.setItem(STORAGE_KEY, "{broken");

    render(
      <TrainingProvider>
        <ProviderProbe />
      </TrainingProvider>,
    );

    expect(screen.getByRole("status")).toHaveTextContent("loading");
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("ready"));
    expect(screen.getByTestId("goal")).toHaveTextContent(
      "Become a machine learning engineer",
    );
  });

  test("creates one repository and keeps command identities stable across hydration", async () => {
    const repository = resolvedRepository();
    const createRepository = vi.fn(() => repository);
    const identities = new Set<unknown>();
    const { rerender } = render(
      <TrainingProvider createRepository={createRepository}>
        <ProviderProbe commandIdentities={identities} />
      </TrainingProvider>,
    );

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("ready"));
    rerender(
      <TrainingProvider createRepository={createRepository}>
        <ProviderProbe commandIdentities={identities} />
      </TrainingProvider>,
    );

    expect(createRepository).toHaveBeenCalledTimes(1);
    expect(identities.size).toBe(1);
  });

  test("serializes commands and atomically replaces only resolved snapshots", async () => {
    const initial = createTrainingSeed(now);
    const first = deferred<TrainingState>();
    const second = deferred<TrainingState>();
    const calls: string[] = [];
    const repository = resolvedRepository(initial);
    repository.updateProfile = vi.fn((input: UpdateProfileInput) => {
      const goal = input.goal ?? "unknown";
      calls.push(goal);
      return goal === "first" ? first.promise : second.promise;
    });

    render(
      <TrainingProvider createRepository={() => repository}>
        <ProviderProbe />
      </TrainingProvider>,
    );
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("ready"));

    fireEvent.click(screen.getByRole("button", { name: "first" }));
    fireEvent.click(screen.getByRole("button", { name: "second" }));

    await waitFor(() => expect(calls).toEqual(["first"]));
    expect(screen.getByTestId("goal")).toHaveTextContent(initial.profile.goal);
    expect(screen.getByTestId("command-status")).toHaveTextContent("submitting");

    const firstState = cloneState(initial);
    firstState.profile.goal = "first";
    first.resolve(firstState);
    await waitFor(() => expect(calls).toEqual(["first", "second"]));
    expect(screen.getByTestId("goal")).toHaveTextContent("first");

    const secondState = cloneState(firstState);
    secondState.profile.goal = "second";
    second.resolve(secondState);
    await waitFor(() => expect(screen.getByTestId("goal")).toHaveTextContent("second"));
    expect(screen.getByTestId("command-status")).toHaveTextContent("success");
  });

  test("keeps the previous snapshot and exposes recovery state when a command fails", async () => {
    const initial = createTrainingSeed(now);
    const update = deferred<TrainingState>();
    const repository = resolvedRepository(initial);
    repository.updateProfile = vi.fn(() => update.promise);

    render(
      <TrainingProvider createRepository={() => repository}>
        <ProviderProbe />
      </TrainingProvider>,
    );
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("ready"));

    fireEvent.click(screen.getByRole("button", { name: "first" }));
    update.reject(new Error("storage unavailable"));

    await waitFor(() =>
      expect(screen.getByTestId("command-status")).toHaveTextContent("error"),
    );
    expect(screen.getByTestId("goal")).toHaveTextContent(initial.profile.goal);
    expect(screen.getByTestId("command-error")).toHaveTextContent("storage unavailable");
  });
});
