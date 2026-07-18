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
  errorMessage = "無法載入訓練設定。",
}: Props) {
  if (status === "loading") return <p role="status">正在載入訓練設定…</p>;
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
          你想要成為什麼？
        </h1>
        <p className="text-command-muted">系統會依成果持續調整難度，不提供舒適模式。</p>
      </header>
      <form className="command-panel space-y-6 border border-command-border p-6" onSubmit={handleSubmit}>
        {submitError ? <p role="alert" className="text-command-danger">{submitError}</p> : null}
        {successMessage ? <p role="status" className="text-command-success">{successMessage}</p> : null}
        <div className="border border-command-cyan/50 bg-command-cyan/5 p-5">
          <p className="font-display text-xl font-semibold text-command-text">機器學習工程師</p>
          <p className="mt-2 text-sm text-command-muted">每日固定 5 小時</p>
          <p className="mt-3 text-sm leading-6 text-command-muted">
            以真實實驗、工程成果、技術報告與作品集證據完成訓練。
          </p>
        </div>
        <Button type="submit" loading={isSubmitting} disabled={isSubmitting}>開始訓練</Button>
      </form>
    </section>
  );
}
