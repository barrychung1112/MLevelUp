"use client";

import { useId, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

import type {
  GoalOptionView,
  LoadableViewProps,
  TrainingContractView,
} from "../view-models";

type OnboardingValues = {
  goalId: string;
  contractId: string;
  weeklyMinutes: number;
};

type OnboardingFlowProps = LoadableViewProps & {
  goals: readonly GoalOptionView[];
  contracts: readonly TrainingContractView[];
  onSubmit: (values: OnboardingValues) => void;
  isSubmitting?: boolean;
  submitError?: string;
  successMessage?: string;
};

type FormErrors = Partial<Record<"goal" | "contract" | "weeklyMinutes", string>>;

const controlClass =
  "min-h-11 rounded-sm border border-command-border bg-command-bg/80 px-3 text-base text-command-text outline-none transition-[border-color,box-shadow] hover:border-command-muted/70 focus-visible:border-command-cyan focus-visible:shadow-[0_0_0_3px_rgba(77,231,255,0.12)]";

export function OnboardingFlow({
  goals,
  contracts,
  onSubmit,
  isSubmitting = false,
  submitError,
  successMessage,
  status = "ready",
  errorMessage = "無法載入訓練設定，請稍後再試。",
}: OnboardingFlowProps) {
  const formId = useId();
  const [goalId, setGoalId] = useState("");
  const [contractId, setContractId] = useState("");
  const [weeklyMinutes, setWeeklyMinutes] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  if (status === "loading") return <p role="status" className="text-command-muted">正在載入訓練契約…</p>;
  if (status === "error") return <p role="alert" className="text-command-danger">{errorMessage}</p>;
  if (goals.length === 0 || contracts.length === 0) {
    return <EmptyState title="目前沒有可用的訓練設定。" description="請稍後再回到訓練終端。" />;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: FormErrors = {};
    const minutes = Number(weeklyMinutes);
    if (!goalId) nextErrors.goal = "請選擇訓練目標";
    if (!contractId) nextErrors.contract = "請選擇訓練契約";
    if (!Number.isFinite(minutes) || minutes <= 0) {
      nextErrors.weeklyMinutes = "每週投入時間必須大於 0 分鐘";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) onSubmit({ goalId, contractId, weeklyMinutes: minutes });
  }

  const goalErrorId = `${formId}-goal-error`;
  const contractErrorId = `${formId}-contract-error`;
  const weeklyErrorId = `${formId}-weekly-error`;

  return (
    <section aria-labelledby="onboarding-title" className="mx-auto max-w-4xl space-y-8">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.24em] text-command-cyan">Training contract</p>
        <h1 id="onboarding-title" className="text-3xl font-semibold text-command-text">建立你的訓練契約</h1>
        <p className="max-w-2xl text-command-muted">選擇目標、節奏與每週投入時間。你之後仍可在個人設定中調整。</p>
      </header>

      <form className="space-y-8" noValidate onSubmit={handleSubmit}>
        {Object.keys(errors).length > 0 ? (
          <p role="alert" className="border border-command-danger/50 bg-command-danger/10 p-4 text-command-danger">
            請修正標示的訓練設定。
          </p>
        ) : null}
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

        <fieldset
          className="space-y-3"
          aria-invalid={errors.contract ? true : undefined}
          aria-describedby={errors.contract ? contractErrorId : undefined}
        >
          <legend className="text-sm font-medium text-command-text">訓練契約</legend>
          <div className="grid gap-3 md:grid-cols-3">
            {contracts.map((contract) => (
              <label key={contract.id} className="cursor-pointer rounded-sm border border-command-border bg-command-surface/92 p-4 transition-colors focus-within:border-command-cyan">
                <input
                  className="mr-2 size-4 accent-command-cyan"
                  type="radio"
                  aria-label={contract.label}
                  aria-describedby={errors.contract ? contractErrorId : undefined}
                  name="training-contract"
                  value={contract.id}
                  checked={contractId === contract.id}
                  onChange={(event) => {
                    setContractId(event.target.value);
                    setErrors((current) => ({ ...current, contract: undefined }));
                  }}
                />
                <span className="font-semibold text-command-text">{contract.label}</span>
                <span className="mt-3 block text-sm text-command-cyan">{contract.timeCommitment}</span>
                <span className="mt-1 block text-sm text-command-muted">{contract.description}</span>
              </label>
            ))}
          </div>
          {errors.contract ? <p id={contractErrorId} className="text-xs font-medium text-command-danger">{errors.contract}</p> : null}
        </fieldset>

        <label className="grid gap-2 text-sm font-medium text-command-text">
          每週投入分鐘數
          <input
            className={controlClass}
            aria-label="每週投入分鐘數"
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
          {errors.weeklyMinutes ? <span id={weeklyErrorId} className="text-xs font-medium text-command-danger">{errors.weeklyMinutes}</span> : null}
        </label>

        <Button type="submit" loading={isSubmitting} disabled={isSubmitting}>
          建立訓練契約
        </Button>
      </form>
    </section>
  );
}
