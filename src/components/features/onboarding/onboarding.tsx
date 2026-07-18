"use client";

import { useId, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

import type { GoalOptionView, LoadableViewProps } from "../view-models";

export type OnboardingValues = {
  goalId: string;
  weeklyMinutes: number;
};

type OnboardingFlowProps = LoadableViewProps & {
  goals: readonly GoalOptionView[];
  onSubmit: (values: OnboardingValues) => void;
  isSubmitting?: boolean;
  submitError?: string;
  successMessage?: string;
};

type FormErrors = Partial<Record<"goal" | "weeklyMinutes", string>>;

const controlClass =
  "min-h-11 rounded-sm border border-command-border bg-command-bg/80 px-3 text-base text-command-text outline-none transition-[border-color,box-shadow] hover:border-command-muted/70 focus-visible:border-command-cyan focus-visible:shadow-[0_0_0_3px_rgba(77,231,255,0.12)]";

export function OnboardingFlow({
  goals,
  onSubmit,
  isSubmitting = false,
  submitError,
  successMessage,
  status = "ready",
  errorMessage = "無法載入訓練設定，請稍後再試。",
}: OnboardingFlowProps) {
  const formId = useId();
  const [goalId, setGoalId] = useState("");
  const [weeklyMinutes, setWeeklyMinutes] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  if (status === "loading") return <p role="status" className="text-command-muted">正在同步訓練終端…</p>;
  if (status === "error") return <p role="alert" className="text-command-danger">{errorMessage}</p>;
  if (goals.length === 0) {
    return <EmptyState title="目前沒有可用的訓練目標。" description="請稍後再回到訓練終端。" />;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: FormErrors = {};
    const minutes = Number(weeklyMinutes);
    if (!goalId) nextErrors.goal = "請選擇訓練目標";
    if (!Number.isFinite(minutes) || minutes <= 0) {
      nextErrors.weeklyMinutes = "每週投入時間必須大於 0 分鐘";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) onSubmit({ goalId, weeklyMinutes: minutes });
  }

  const goalErrorId = `${formId}-goal-error`;
  const weeklyErrorId = `${formId}-weekly-error`;

  return (
    <section aria-labelledby="onboarding-title" className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-3 border-l-2 border-command-cyan pl-5">
        <p className="font-data text-xs uppercase tracking-[0.24em] text-command-cyan">Adaptive training protocol</p>
        <h1 id="onboarding-title" className="font-display text-3xl font-semibold text-command-text">設定你的訓練座標</h1>
        <p className="max-w-2xl leading-7 text-command-muted">
          系統會依照你的成果與時間，自動派發目前可承受範圍內最難的任務。你不需要選擇難度。
        </p>
      </header>

      <form className="command-panel space-y-7 border border-command-border bg-command-surface/90 p-6" noValidate onSubmit={handleSubmit}>
        {submitError ? <p role="alert" className="text-sm text-command-danger">{submitError}</p> : null}
        {successMessage ? <p role="status" className="text-sm text-command-success">{successMessage}</p> : null}

        <label className="grid gap-2 text-sm font-medium text-command-text">
          訓練目標
          <select
            className={controlClass}
            aria-label="訓練目標"
            value={goalId}
            aria-invalid={errors.goal ? true : undefined}
            aria-describedby={errors.goal ? goalErrorId : undefined}
            onChange={(event) => {
              setGoalId(event.target.value);
              setErrors((current) => ({ ...current, goal: undefined }));
            }}
          >
            <option value="">選擇目標</option>
            {goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.label}</option>)}
          </select>
          {errors.goal ? <span id={goalErrorId} className="text-xs font-medium text-command-danger">{errors.goal}</span> : null}
        </label>

        <label className="grid gap-2 text-sm font-medium text-command-text">
          每週可投入分鐘
          <input
            className={controlClass}
            aria-label="每週可投入分鐘"
            type="number"
            min="1"
            inputMode="numeric"
            value={weeklyMinutes}
            aria-invalid={errors.weeklyMinutes ? true : undefined}
            aria-describedby={errors.weeklyMinutes ? weeklyErrorId : undefined}
            onChange={(event) => {
              setWeeklyMinutes(event.target.value);
              setErrors((current) => ({ ...current, weeklyMinutes: undefined }));
            }}
          />
          <span className="text-xs font-normal text-command-muted">每日預算以每週五個訓練日計算，範圍為 30–180 分鐘。</span>
          {errors.weeklyMinutes ? <span id={weeklyErrorId} className="text-xs font-medium text-command-danger">{errors.weeklyMinutes}</span> : null}
        </label>

        <Button type="submit" loading={isSubmitting} disabled={isSubmitting}>
          開始第一項挑戰
        </Button>
      </form>
    </section>
  );
}
