"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/auth/auth-provider";
import { CourageOathDialog } from "@/components/features/onboarding/courage-oath-dialog";
import { OnboardingFlow } from "@/components/features/onboarding/onboarding";
import { DEFAULT_TIMEZONE } from "@/mocks/training/seed";
import { useTraining } from "@/providers/training-provider";

import { TrainingPageShell } from "../_components/training-page-shell";

export default function OnboardingPage() {
  const router = useRouter();
  const training = useTraining();
  const auth = useAuth();
  const needsOath =
    training.status === "ready" &&
    training.snapshot !== null &&
    training.snapshot.profile.challengeAcceptedAt === null;

  useEffect(() => {
    if (training.status === "ready" && training.snapshot?.profile.onboardingCompleted) {
      router.replace("/dashboard");
    }
  }, [router, training.snapshot?.profile.onboardingCompleted, training.status]);

  return (
    <TrainingPageShell>
      <OnboardingFlow
        status={training.status === "ready" ? "ready" : training.status}
        errorMessage={training.loadError ?? undefined}
        isSubmitting={training.commandStatus === "submitting"}
        submitError={training.commandError ?? undefined}
        successMessage={training.commandSuccess ?? undefined}
        onSubmit={(values) => {
          void training.completeOnboarding({
            displayName: "Demo Hunter",
            targetRole: values.targetRole,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE,
          })
            .then(async (state) => {
              const assignment = Object.values(state.assignments).find(
                (item) => item.questId === "quest-courage-challenge",
              );
              if (assignment?.status === "assigned") await training.startQuest(assignment.id);
              router.replace(assignment ? `/quests/${assignment.id}` : "/dashboard");
            })
            .catch(() => undefined);
        }}
      />
      {needsOath ? (
        <CourageOathDialog
          isSubmitting={training.commandStatus === "submitting"}
          error={training.commandError ?? undefined}
          onAccept={() => {
            void training.acceptChallenge().catch(() => undefined);
          }}
          onCancel={() => {
            void auth.signOut();
          }}
        />
      ) : null}
    </TrainingPageShell>
  );
}
