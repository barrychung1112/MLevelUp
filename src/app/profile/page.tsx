"use client";

import { useRouter } from "next/navigation";

import { ProfileSettings } from "@/components/features/profile/profile-settings";
import type { TrainingContract } from "@/domain/training/types";
import { useTraining } from "@/providers/training-provider";

import { TrainingPageShell } from "../_components/training-page-shell";
import { CONTRACTS, GOALS } from "../_helpers/training-view-models";

export default function ProfilePage() {
  const router = useRouter();
  const training = useTraining();
  const profile = training.snapshot?.profile;
  return (
    <TrainingPageShell>
      <ProfileSettings
        profile={profile ? { goalId: profile.goal, contractId: profile.contract, weeklyMinutes: profile.weeklyMinutes } : null}
        goals={GOALS}
        contracts={CONTRACTS}
        status={training.status === "ready" ? "ready" : training.status}
        errorMessage={training.loadError ?? undefined}
        isSubmitting={training.commandStatus === "submitting"}
        submitError={training.commandError ?? undefined}
        successMessage={training.commandSuccess ?? undefined}
        onSave={(values) => {
          void training
            .updateProfile({ goal: values.goalId, contract: values.contractId as TrainingContract, weeklyMinutes: values.weeklyMinutes })
            .catch(() => undefined);
        }}
        onReset={() => {
          void training
            .resetDemo()
            .then(() => router.replace("/onboarding"))
            .catch(() => undefined);
        }}
      />
    </TrainingPageShell>
  );
}
