"use client";

import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel } from "@/components/ui/panel";
import type { LoadableViewProps, ProfilePreferencesView } from "../view-models";

type Props = LoadableViewProps & {
  profile: ProfilePreferencesView | null;
  onReset: () => void;
  onSignOut?: () => void;
  isSubmitting?: boolean;
  submitError?: string;
  successMessage?: string;
};

export function ProfileSettings({
  profile,
  onReset,
  onSignOut,
  status = "ready",
  errorMessage = "無法載入訓練設定。",
  submitError,
  successMessage,
}: Props) {
  const id = useId();
  const [confirmingReset, setConfirmingReset] = useState(false);
  if (status === "loading") return <p role="status">正在載入訓練設定…</p>;
  if (status === "error") return <p role="alert">{errorMessage}</p>;
  if (!profile) return <EmptyState title="找不到訓練設定" description="請先完成註冊流程。" />;

  return (
    <section aria-labelledby={`${id}-heading`} className="space-y-8">
      <header>
        <p className="font-data text-xs uppercase tracking-[0.24em] text-command-cyan">Training profile</p>
        <h1 id={`${id}-heading`} className="font-display text-3xl font-semibold text-command-text">訓練設定</h1>
      </header>
      {submitError ? <p role="alert" className="text-command-danger">{submitError}</p> : null}
      {successMessage ? <p role="status" className="text-command-success">{successMessage}</p> : null}
      <Panel className="max-w-2xl border-command-cyan/40 bg-command-cyan/5">
        <p className="text-sm text-command-muted">目標職業</p>
        <p className="mt-1 font-display text-xl font-semibold text-command-text">{profile.targetRoleLabel}</p>
        <p className="mt-4 text-sm text-command-muted">訓練投入</p>
        <p className="mt-1 font-semibold text-command-cyan">每日固定 5 小時</p>
      </Panel>
      {onSignOut ? (
        <Panel className="max-w-2xl">
          <h2 className="font-display text-lg font-semibold text-command-text">帳號</h2>
          <Button className="mt-4" variant="secondary" type="button" onClick={onSignOut}>登出帳號</Button>
        </Panel>
      ) : null}
      <Panel className="max-w-2xl border-command-danger/40 bg-command-danger/5">
        <h2 className="font-display text-lg font-semibold text-command-text">危險區域</h2>
        <Button className="mt-4" variant="danger" type="button" onClick={() => setConfirmingReset(true)}>
          重設訓練資料
        </Button>
      </Panel>
      <Dialog
        open={confirmingReset}
        onOpenChange={setConfirmingReset}
        title="確認重設訓練資料？"
        closeLabel="關閉重設視窗"
        footer={<><Button variant="secondary" type="button" onClick={() => setConfirmingReset(false)}>取消</Button><Button variant="danger" type="button" onClick={() => { onReset(); setConfirmingReset(false); }}>確認重設</Button></>}
      >
        <p className="text-sm text-command-muted">等級、XP、能力值與進行中的任務將重新開始。</p>
      </Dialog>
    </section>
  );
}
