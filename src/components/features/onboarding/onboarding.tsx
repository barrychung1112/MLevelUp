"use client";

import { type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import type { LoadableViewProps } from "../view-models";

export type OnboardingValues = { targetRole: "machine-learning-engineer" };

type Props = LoadableViewProps & {
  onSubmit: (values: OnboardingValues) => void;
  isSubmitting?: boolean;
  submitError?: string;
  successMessage?: string;
};

export function OnboardingFlow({
  onSubmit,
  isSubmitting = false,
  submitError,
  successMessage,
  status = "ready",
  errorMessage = "Unable to load training settings.",
}: Props) {
  if (status === "loading") return <p role="status">Loading training settings…</p>;
  if (status === "error") return <p role="alert">{errorMessage}</p>;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({ targetRole: "machine-learning-engineer" });
  }

  return (
    <section aria-labelledby="onboarding-title" className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-3 border-l-2 border-command-cyan pl-5">
        <p className="font-data text-xs uppercase tracking-[0.24em] text-command-cyan">
          Training destination
        </p>
        <h1 id="onboarding-title" className="font-display text-3xl font-semibold text-command-text">
          What do you want to become?
        </h1>
        <p className="text-command-muted">The system adapts difficulty from your results. There is no comfort mode.</p>
      </header>
      <form className="command-panel space-y-6 border border-command-border p-6" onSubmit={handleSubmit}>
        {submitError ? <p role="alert" className="text-command-danger">{submitError}</p> : null}
        {successMessage ? <p role="status" className="text-command-success">{successMessage}</p> : null}
        <div className="border border-command-cyan/50 bg-command-cyan/5 p-5">
          <p className="font-display text-xl font-semibold text-command-text">Machine Learning Engineer</p>
          <p className="mt-2 text-sm text-command-muted">5 hours every day</p>
          <p className="mt-3 text-sm leading-6 text-command-muted">
            Train through real experiments, engineering deliverables, technical reports, and portfolio evidence.
          </p>
        </div>
        <Button type="submit" loading={isSubmitting} disabled={isSubmitting}>Start Training</Button>
      </form>
    </section>
  );
}
