"use client";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

type Props = { onAccept: () => void; onCancel: () => void; isSubmitting?: boolean; error?: string };
export function CourageOathDialog({ onAccept, onCancel, isSubmitting = false, error }: Props) {
  return <Dialog open onOpenChange={(open) => { if (!open && !isSubmitting) onCancel(); }} title="挑戰者警告" description="Courage protocol · Entry oath" closeLabel="離開挑戰" className="border-command-danger/50 shadow-[0_24px_100px_rgba(0,0,0,0.75),0_0_70px_rgba(255,77,94,0.12)]" footer={<><Button type="button" variant="secondary" disabled={isSubmitting} onClick={onCancel}>暫不開始</Button><Button type="button" loading={isSubmitting} disabled={isSubmitting} onClick={onAccept}>接受挑戰</Button></>}>
    <div className="space-y-5"><div className="flex items-center gap-3 text-command-danger"><span className="grid size-12 place-items-center border border-command-danger/50 bg-command-danger/10"><ShieldAlert aria-hidden className="size-6" /></span><p className="font-display text-xl font-semibold">這是一條成為強者的道路。</p></div><div className="space-y-3 border-l border-command-danger/40 pl-4 leading-7 text-command-muted"><p>系統不會讓你選擇舒適的難度。每次任務都會依照你的能力、時間與成果，推進到最難但仍有機會完成的位置。</p><p>失敗不會終止訓練，而會成為下一次任務調整的依據。</p><p className="font-medium text-command-text">一旦開始，就沒有回頭路。</p><p>確認要繼續嗎？</p></div>{error ? <p role="alert" className="border border-command-danger/40 bg-command-danger/10 p-3 text-sm text-command-danger">{error}</p> : null}</div>
  </Dialog>;
}
