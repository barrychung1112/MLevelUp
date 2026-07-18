"use client";

import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

type CourageOathDialogProps = {
  onAccept: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  error?: string;
};

export function CourageOathDialog({
  onAccept,
  onCancel,
  isSubmitting = false,
  error,
}: CourageOathDialogProps) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !isSubmitting) onCancel();
      }}
      title="挑戰者警告"
      description="Courage protocol · Entry oath"
      closeLabel="關閉誓約"
      className="border-command-danger/50 shadow-[0_24px_100px_rgba(0,0,0,0.75),0_0_70px_rgba(255,77,94,0.12)]"
      footer={
        <>
          <Button type="button" variant="secondary" disabled={isSubmitting} onClick={onCancel}>
            暫不開始
          </Button>
          <Button type="button" loading={isSubmitting} disabled={isSubmitting} onClick={onAccept}>
            接受挑戰
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex items-center gap-3 text-command-danger">
          <span className="grid size-12 place-items-center border border-command-danger/50 bg-command-danger/10">
            <ShieldAlert aria-hidden className="size-6" />
          </span>
          <p className="font-display text-xl font-semibold">這是一條成為強者的道路。</p>
        </div>
        <div className="space-y-3 border-l border-command-danger/40 pl-4 leading-7 text-command-muted">
          <p>一旦開始，系統將以你的真實成果衡量能力，並持續把你推向目前能承受的最高難度。</p>
          <p className="font-medium text-command-text">失敗不會終止訓練，但逃避不會帶來成長。</p>
          <p>你確定要接受第一項挑戰嗎？</p>
        </div>
        {error ? <p role="alert" className="border border-command-danger/40 bg-command-danger/10 p-3 text-sm text-command-danger">{error}</p> : null}
      </div>
    </Dialog>
  );
}
