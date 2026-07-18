"use client";
import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel } from "@/components/ui/panel";
import type { GoalOptionView, LoadableViewProps, ProfilePreferencesView } from "../view-models";

type Props = LoadableViewProps & { profile: ProfilePreferencesView | null; goals: readonly GoalOptionView[]; onSave: (profile: ProfilePreferencesView) => void; onReset: () => void; onSignOut?: () => void; isSubmitting?: boolean; submitError?: string; successMessage?: string };
const controlClass = "min-h-11 rounded-sm border border-command-border bg-command-bg/80 px-3 text-base text-command-text outline-none focus-visible:border-command-cyan focus-visible:shadow-[0_0_0_3px_rgba(77,231,255,0.12)]";

function SettingsForm({ profile, goals, onSave, onReset, onSignOut, isSubmitting, submitError, successMessage }: Omit<Props, "profile" | "status" | "errorMessage"> & { profile: ProfilePreferencesView }) {
  const id = useId(); const [goalId, setGoalId] = useState(profile.goalId); const [weeklyMinutes, setWeeklyMinutes] = useState(String(profile.weeklyMinutes)); const [error, setError] = useState<string | null>(null); const [confirmingReset, setConfirmingReset] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const minutes = Number(weeklyMinutes); if (!goalId || !Number.isFinite(minutes) || minutes <= 0) { setError("請選擇目標，且每週投入時間必須大於 0 分鐘。"); return; } setError(null); onSave({ goalId, weeklyMinutes: minutes }); }
  return <section aria-labelledby={`${id}-heading`} className="space-y-8"><header><p className="font-data text-xs uppercase tracking-[0.24em] text-command-cyan">Training profile</p><h1 id={`${id}-heading`} className="font-display text-3xl font-semibold text-command-text">訓練設定</h1></header>
    <Panel className="max-w-2xl border-command-cyan/40 bg-command-cyan/5"><p className="font-display font-semibold text-command-cyan">自適應難度：啟用</p><p className="mt-2 text-sm leading-6 text-command-muted">系統會依照你的能力、完成品質與可投入時間，自動選出最難但仍可完成的下一項任務。</p></Panel>
    <form className="command-panel max-w-2xl space-y-5 border border-command-border bg-command-surface/92 p-5" noValidate onSubmit={submit}>{error || submitError ? <p role="alert" className="text-command-danger">{error ?? submitError}</p> : null}{successMessage ? <p role="status" className="text-command-success">{successMessage}</p> : null}<label className="grid gap-2 text-sm text-command-text">訓練目標<select className={controlClass} aria-label="訓練目標" value={goalId} onChange={(event) => setGoalId(event.target.value)}><option value="">選擇目標</option>{goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.label}</option>)}</select></label><label className="grid gap-2 text-sm text-command-text">每週可投入分鐘<input className={controlClass} aria-label="每週可投入分鐘" type="number" min="1" value={weeklyMinutes} onChange={(event) => setWeeklyMinutes(event.target.value)} /></label><Button type="submit" loading={isSubmitting} disabled={isSubmitting}>儲存設定</Button></form>
    {onSignOut ? <Panel className="max-w-2xl"><h2 className="font-display text-lg font-semibold text-command-text">帳號</h2><p className="mt-2 text-command-muted">登出後，下次需要透過 Email magic-link 重新登入。</p><Button className="mt-4" variant="secondary" type="button" onClick={onSignOut}>登出帳號</Button></Panel> : null}
    <Panel className="max-w-2xl border-command-danger/40 bg-command-danger/5"><h2 className="font-display text-lg font-semibold text-command-text">危險區域</h2><p className="mt-2 text-command-muted">清除所有訓練進度並返回初始設定。</p><Button className="mt-4" variant="danger" type="button" onClick={() => setConfirmingReset(true)}>重設訓練資料</Button></Panel>
    <Dialog open={confirmingReset} onOpenChange={setConfirmingReset} title="確認重設訓練資料？" closeLabel="關閉重設視窗" footer={<><Button variant="secondary" type="button" onClick={() => setConfirmingReset(false)}>取消</Button><Button variant="danger" type="button" onClick={() => { onReset(); setConfirmingReset(false); }}>確認重設</Button></>}><p className="text-sm leading-6 text-command-muted">這會清除任務、提交與能力成長紀錄。</p></Dialog>
  </section>;
}

export function ProfileSettings({ profile, status = "ready", errorMessage = "無法載入訓練設定。", ...props }: Props) { if (status === "loading") return <p role="status" className="text-command-muted">正在載入訓練設定…</p>; if (status === "error") return <p role="alert" className="text-command-danger">{errorMessage}</p>; if (!profile) return <EmptyState title="尚未建立訓練設定" description="請先完成初始訓練設定。" />; return <SettingsForm key={`${profile.goalId}:${profile.weeklyMinutes}`} profile={profile} {...props} />; }
