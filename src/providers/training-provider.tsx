"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type {
  CompleteOnboardingInput,
  DemoTrainingRepository,
  SubmissionOutcome,
  SubmitQuestInput,
  UpdateProfileInput,
} from "@/application/training/training-repository";
import type { TrainingState } from "@/domain/training/types";
import { isDemoMode } from "@/lib/demo-mode";
import { isSandboxSession } from "@/demo/sandbox-session";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import { LocalTrainingStorage } from "@/mocks/training/local-storage";
import { MockTrainingRepository } from "@/mocks/training/mock-training-repository";
import { SEED_VERSION } from "@/mocks/training/seed";
import { SupabaseTrainingRepository } from "@/supabase-training/supabase-training-repository";
import { createServerSubmitClient } from "@/supabase-training/server-submit-client";

export type TrainingLoadStatus = "loading" | "ready" | "error";
export type TrainingCommandStatus = "idle" | "submitting" | "success" | "error";

export type TrainingContextValue = {
  status: TrainingLoadStatus;
  snapshot: TrainingState | null;
  loadError: string | null;
  commandStatus: TrainingCommandStatus;
  commandError: string | null;
  commandSuccess: string | null;
  acceptChallenge(): Promise<TrainingState>;
  continueChallenge(): Promise<TrainingState>;
  abandonChallenge(): Promise<TrainingState>;
  completeOnboarding(input: CompleteOnboardingInput): Promise<TrainingState>;
  updateProfile(input: UpdateProfileInput): Promise<TrainingState>;
  startQuest(assignmentId: string): Promise<TrainingState>;
  submitQuest(input: SubmitQuestInput): Promise<SubmissionOutcome>;
  resetDemo(): Promise<TrainingState>;
  clearCommandStatus(): void;
};

type TrainingProviderProps = {
  children: ReactNode;
  createRepository?: () => DemoTrainingRepository;
};

const TrainingContext = createContext<TrainingContextValue | null>(null);

function messageFor(error: unknown): string {
  return error instanceof Error ? error.message : "Training data could not be updated. Try again.";
}

export function createBrowserTrainingRepository(): DemoTrainingRepository {
  if (typeof window === "undefined") {
    throw new Error("The browser training repository requires a window");
  }

  const supabase = isDemoMode() || isSandboxSession() ? null : getBrowserSupabaseClient();
  if (supabase) {
    return new SupabaseTrainingRepository({
      client: supabase,
      clock: { now: () => new Date().toISOString() },
      ids: {
        next() {
          return globalThis.crypto.randomUUID();
        },
      },
      submissionClient: createServerSubmitClient(supabase),
    });
  }

  return new MockTrainingRepository({
    storage: new LocalTrainingStorage(window.localStorage, SEED_VERSION),
    clock: { now: () => new Date().toISOString() },
    ids: {
      next(prefix: string) {
        return `${prefix}-${globalThis.crypto.randomUUID()}`;
      },
    },
  });
}

export function TrainingProvider({
  children,
  createRepository = createBrowserTrainingRepository,
}: TrainingProviderProps) {
  const [status, setStatus] = useState<TrainingLoadStatus>("loading");
  const [snapshot, setSnapshot] = useState<TrainingState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [commandStatus, setCommandStatus] = useState<TrainingCommandStatus>("idle");
  const [commandError, setCommandError] = useState<string | null>(null);
  const [commandSuccess, setCommandSuccess] = useState<string | null>(null);
  const repositoryFactoryRef = useRef(createRepository);
  const repositoryRef = useRef<DemoTrainingRepository | null>(null);
  const hydrationRef = useRef<Promise<TrainingState> | null>(null);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const pendingCommandsRef = useRef(0);
  const mountedRef = useRef(false);
  const readyRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    try {
      repositoryRef.current ??= repositoryFactoryRef.current();
      hydrationRef.current ??= repositoryRef.current.getSnapshot();
      void hydrationRef.current.then(
        (nextSnapshot) => {
          if (cancelled) return;
          setSnapshot(nextSnapshot);
          setLoadError(null);
          readyRef.current = true;
          setStatus("ready");
        },
        (error: unknown) => {
          if (cancelled) return;
          setLoadError(messageFor(error));
          setStatus("error");
        },
      );
    } catch (error) {
      void Promise.resolve().then(() => {
        if (cancelled) return;
        setLoadError(messageFor(error));
        setStatus("error");
      });
    }

    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
  }, []);

  const enqueue = useCallback(
    function enqueue<T>(
      operation: (repository: DemoTrainingRepository) => Promise<T>,
      snapshotFromResult: (result: T) => TrainingState,
      successMessage: string,
    ): Promise<T> {
      pendingCommandsRef.current += 1;
      setCommandStatus("submitting");
      setCommandError(null);
      setCommandSuccess(null);

      const run = async () => {
        let failed = false;
        try {
          const repository = repositoryRef.current;
          if (!repository || !readyRef.current) {
            throw new Error("Training data has not finished loading.");
          }
          const result = await operation(repository);
          if (mountedRef.current) {
            setSnapshot(snapshotFromResult(result));
            setCommandError(null);
            setCommandSuccess(successMessage);
          }
          return result;
        } catch (error) {
          failed = true;
          if (mountedRef.current) {
            setCommandError(messageFor(error));
            setCommandSuccess(null);
          }
          throw error;
        } finally {
          pendingCommandsRef.current -= 1;
          if (mountedRef.current) {
            setCommandStatus(
              pendingCommandsRef.current > 0
                ? "submitting"
                : failed
                  ? "error"
                  : "success",
            );
          }
        }
      };

      const scheduled = queueRef.current.then(run, run);
      queueRef.current = scheduled.then(
        () => undefined,
        () => undefined,
      );
      return scheduled;
    },
    [],
  );

  const completeOnboarding = useCallback(
    (input: CompleteOnboardingInput) =>
      enqueue(
        (repository) => repository.completeOnboarding(input),
        (nextSnapshot) => nextSnapshot,
        "Training contract created.",
      ),
    [enqueue],
  );

  const acceptChallenge = useCallback(
    () =>
      enqueue(
        (repository) => repository.acceptChallenge(),
        (nextSnapshot) => nextSnapshot,
        "Challenge oath accepted.",
      ),
    [enqueue],
  );

  const continueChallenge = useCallback(
    () => enqueue((repository) => repository.continueChallenge(), (state) => state, "Recovery started."),
    [enqueue],
  );

  const abandonChallenge = useCallback(
    () => enqueue((repository) => repository.abandonChallenge(), (state) => state, "Training reset."),
    [enqueue],
  );

  const updateProfile = useCallback(
    (input: UpdateProfileInput) =>
      enqueue(
        (repository) => repository.updateProfile(input),
        (nextSnapshot) => nextSnapshot,
        "Profile settings saved.",
      ),
    [enqueue],
  );

  const startQuest = useCallback(
    (assignmentId: string) =>
      enqueue(
        (repository) => repository.startQuest(assignmentId),
        (nextSnapshot) => nextSnapshot,
        "Mission started.",
      ),
    [enqueue],
  );

  const submitQuest = useCallback(
    (input: SubmitQuestInput) =>
      enqueue(
        (repository) => repository.submitQuest(input),
        (outcome) => outcome.state,
        "Evidence completed deterministic demo evaluation.",
      ),
    [enqueue],
  );

  const resetDemo = useCallback(
    () =>
      enqueue(
        (repository) => repository.resetDemo(),
        (nextSnapshot) => nextSnapshot,
        "Demo training data reset.",
      ),
    [enqueue],
  );

  const clearCommandStatus = useCallback(() => {
    setCommandStatus("idle");
    setCommandError(null);
    setCommandSuccess(null);
  }, []);

  const value = useMemo<TrainingContextValue>(
    () => ({
      status,
      snapshot,
      loadError,
      commandStatus,
      commandError,
      commandSuccess,
      acceptChallenge,
      continueChallenge,
      abandonChallenge,
      completeOnboarding,
      updateProfile,
      startQuest,
      submitQuest,
      resetDemo,
      clearCommandStatus,
    }),
    [
      status,
      snapshot,
      loadError,
      commandStatus,
      commandError,
      commandSuccess,
      acceptChallenge,
      continueChallenge,
      abandonChallenge,
      completeOnboarding,
      updateProfile,
      startQuest,
      submitQuest,
      resetDemo,
      clearCommandStatus,
    ],
  );

  return <TrainingContext.Provider value={value}>{children}</TrainingContext.Provider>;
}

export function useTraining(): TrainingContextValue {
  const value = useContext(TrainingContext);
  if (!value) throw new Error("useTraining must be used within TrainingProvider");
  return value;
}
