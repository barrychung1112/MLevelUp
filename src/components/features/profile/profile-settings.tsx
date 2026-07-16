"use client";

import { useId, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel } from "@/components/ui/panel";

import type {
  GoalOptionView,
  LoadableViewProps,
  ProfilePreferencesView,
  TrainingContractView,
} from "../view-models";

type ProfileSettingsProps = LoadableViewProps & {
  profile: ProfilePreferencesView | null;
  goals: readonly GoalOptionView[];
  contracts: readonly TrainingContractView[];
  onSave: (profile: ProfilePreferencesView) => void;
  onReset: () => void;
  isSubmitting?: boolean;
  submitError?: string;
  successMessage?: string;
};

type ProfileSettingsFormProps = Omit<ProfileSettingsProps, "profile" | "status" | "errorMessage"> & {
  profile: ProfilePreferencesView;
};

type FormErrors = Partial<Record<"goal" | "contract" | "weeklyMinutes", string>>;

const controlClass =
  "min-h-11 rounded-sm border border-command-border bg-command-bg/80 px-3 text-base text-command-text outline-none transition-[border-color,box-shadow] hover:border-command-muted/70 focus-visible:border-command-cyan focus-visible:shadow-[0_0_0_3px_rgba(77,231,255,0.12)]";

function ProfileSettingsForm({
  profile,
  goals,
  contracts,
  onSave,
  onReset,
  isSubmitting = false,
  submitError,
  successMessage,
}: ProfileSettingsFormProps) {
  const formId = useId();
  const [goalId, setGoalId] = useState(profile?.goalId ?? "");
  const [contractId, setContractId] = useState(profile?.contractId ?? "");
  const [weeklyMinutes, setWeeklyMinutes] = useState(String(profile?.weeklyMinutes ?? ""));
  const [errors, setErrors] = useState<FormErrors>({});
  const [confirmingReset, setConfirmingReset] = useState(false);

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: FormErrors = {};
    const minutes = Number(weeklyMinutes);
    if (!goalId) nextErrors.goal = "請選擇訓練目標";
    if (!contractId) nextErrors.contract = "請選擇訓練契約";
    if (!Number.isFinite(minutes) || minutes <= 0) {
      nextErrors.weeklyMinutes = "每週投入時間必須大於 0 分鐘";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onSave({ goalId, contractId, weeklyMinutes: minutes });
  }

  function confirmReset() {
    onReset();
    setConfirmingReset(false);
  }

  const goalErrorId = `${formId}-goal-error`;
  const contractErrorId = `${formId}-contract-error`;
  const weeklyErrorId = `${formId}-weekly-error`;

  return (
    <section aria-labelledby="profile-heading" className="space-y-8">
      <header>
        <p className="text-sm uppercase tracking-[0.24em] text-command-cyan">Training profile</p>
        <h1 id="profile-heading" className="text-3xl font-semibold text-command-text">個人設定</h1>
        <p className="mt-2 text-command-muted">契約變更只會影響下一組任務，不會改寫目前任務。</p>
      </header>

      <form className="command-panel max-w-2xl space-y-5 border border-command-border bg-command-surface/92 p-5" noValidate onSubmit={handleSave}>
        {Object.keys(errors).length > 0 ? (
          <p role="alert" className="text-command-danger">請修正標示的個人設定。</p>
        ) : null}
        {submitError ? <p role="alert" className="text-command-danger">{submitError}</p> : null}
        {successMessage ? <p role="status" className="text-command-success">{successMessage}</p> : null}

        <label className="grid gap-2 text-sm text-command-text">
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

        <label className="grid gap-2 text-sm text-command-text">
          訓練契約
          <select
            className={controlClass}
            aria-label="訓練契約"
            value={contractId}
            aria-invalid={errors.contract ? true : undefined}
            aria-describedby={errors.contract ? contractErrorId : undefined}
            onChange={(event) => {
              setContractId(event.target.value);
              setErrors((current) => ({ ...current, contract: undefined }));
            }}
          >
            <option value="">選擇契約</option>
            {contracts.map((contract) => <option key={contract.id} value={contract.id}>{contract.label} · {contract.timeCommitment}</option>)}
          </select>
          {errors.contract ? <span id={contractErrorId} className="text-xs font-medium text-command-danger">{errors.contract}</span> : null}
        </label>

        <label className="grid gap-2 text-sm text-command-text">
          每週投入分鐘數
          <input
            className={controlClass}
            aria-label="每週投入分鐘數"
            type="number"
            min="1"
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

        <Button type="submit" loading={isSubmitting} disabled={isSubmitting}>儲存個人設定</Button>
      </form>

      <Panel aria-labelledby="reset-heading" className="max-w-2xl border-command-danger/40 bg-command-danger/5">
        <h2 id="reset-heading" className="text-lg font-semibold text-command-text">Demo 資料控制</h2>
        <p className="mt-2 text-command-muted">重設會清除目前的本機 Demo 進度，並恢復固定種子資料。</p>
        <Button className="mt-4" variant="danger" type="button" onClick={() => setConfirmingReset(true)}>重設 Demo 資料</Button>
      </Panel>

      <Dialog
        open={confirmingReset}
        onOpenChange={setConfirmingReset}
        title="確認重設 Demo 資料"
        description="這會移除目前所有 Demo 任務、XP 與作品紀錄。"
        closeLabel="關閉對話框"
        footer={(
          <>
            <Button variant="secondary" type="button" onClick={() => setConfirmingReset(false)}>取消</Button>
            <Button variant="danger" type="button" onClick={confirmReset}>確認重設</Button>
          </>
        )}
      >
        <p className="text-sm leading-6 text-command-muted">重設後無法復原目前的本機 Demo 進度。</p>
      </Dialog>
    </section>
  );
}

export function ProfileSettings({
  profile,
  status = "ready",
  errorMessage = "無法載入個人設定。",
  ...formProps
}: ProfileSettingsProps) {
  if (status === "loading") return <p role="status" className="text-command-muted">正在載入個人設定…</p>;
  if (status === "error") return <p role="alert" className="text-command-danger">{errorMessage}</p>;
  if (!profile) return <EmptyState title="尚未建立個人訓練設定。" description="完成訓練契約後即可管理偏好。" />;

  const profileKey = `${profile.goalId}:${profile.contractId}:${profile.weeklyMinutes}`;
  return <ProfileSettingsForm key={profileKey} profile={profile} {...formProps} />;
}
