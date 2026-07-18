"use client";

import { useRouter } from "next/navigation";

import { useAuth } from "@/auth/auth-provider";
import { ProfileSettings } from "@/components/features/profile/profile-settings";
import { useTraining } from "@/providers/training-provider";

import { TrainingPageShell } from "../_components/training-page-shell";

export default function ProfilePage() {
  const router = useRouter();
  const auth = useAuth();
  const training = useTraining();
  const profile = training.snapshot?.profile;
  return (
    <TrainingPageShell>
      <ProfileSettings
        profile={profile ? { targetRoleLabel: "機器學習工程師", dailyMinutes: profile.dailyMinutes } : null}
        status={training.status === "ready" ? "ready" : training.status}
        errorMessage={training.loadError ?? undefined}
        isSubmitting={training.commandStatus === "submitting"}
        submitError={training.commandError ?? undefined}
        successMessage={training.commandSuccess ?? undefined}
        onReset={() => {
          void training
            .resetDemo()
            .then(() => router.replace("/onboarding"))
            .catch(() => undefined);
        }}
        onSignOut={() => {
          void auth.signOut().catch(() => undefined);
        }}
      />
    </TrainingPageShell>
  );
}
