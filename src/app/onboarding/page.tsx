"use client";

import { useRouter } from "next/navigation";

import { OnboardingFlow } from "@/components/features/onboarding/onboarding";
import type { TrainingContract } from "@/domain/training/types";
import { DEFAULT_TIMEZONE } from "@/mocks/training/seed";
import { useTraining } from "@/providers/training-provider";

import { TrainingPageShell } from "../_components/training-page-shell";
import { CONTRACTS, GOALS } from "../_helpers/training-view-models";

export default function OnboardingPage() {
  const router = useRouter();
  const training = useTraining();

  return (
    <TrainingPageShell>
      <OnboardingFlow
        goals={GOALS}
        contracts={CONTRACTS}
        status={training.status === "ready" ? "ready" : training.status}
        errorMessage={training.loadError ?? undefined}
        isSubmitting={training.commandStatus === "submitting"}
        submitError={training.commandError ?? undefined}
        successMessage={training.commandSuccess ?? undefined}
        onSubmit={(values) => {
          void training.completeOnboarding({
            displayName: "Demo Hunter",
            goal: values.goalId,
            contract: values.contractId as TrainingContract,
            weeklyMinutes: values.weeklyMinutes,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE,
          })
            .then(() => router.replace("/dashboard"))
            .catch(() => undefined);
        }}
      />
    </TrainingPageShell>
  );
}
