"use client";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

type Props = { onAccept: () => void; onCancel: () => void; isSubmitting?: boolean; error?: string };
export function CourageOathDialog({ onAccept, onCancel, isSubmitting = false, error }: Props) {
  return <Dialog open onOpenChange={(open) => { if (!open && !isSubmitting) onCancel(); }} title="Challenger Warning" description="Courage protocol · Entry oath" closeLabel="Leave challenge" className="border-command-danger/50 shadow-[0_24px_100px_rgba(0,0,0,0.75),0_0_70px_rgba(255,77,94,0.12)]" footer={<><Button type="button" variant="secondary" disabled={isSubmitting} onClick={onCancel}>Not Yet</Button><Button type="button" loading={isSubmitting} disabled={isSubmitting} onClick={onAccept}>Accept the Challenge</Button></>}>
    <div className="space-y-5"><div className="flex items-center gap-3 text-command-danger"><span className="grid size-12 place-items-center border border-command-danger/50 bg-command-danger/10"><ShieldAlert aria-hidden className="size-6" /></span><p className="font-display text-xl font-semibold">This is a road for those who choose to become stronger.</p></div><div className="space-y-3 border-l border-command-danger/40 pl-4 leading-7 text-command-muted"><p>The system will not let you choose a comfortable difficulty. Every mission advances toward the hardest challenge you can realistically complete with your current ability, time, and results.</p><p>Failure will not end your training. It will become evidence for the next mission adjustment.</p><p className="font-medium text-command-text">Once you begin, there is no easy way back.</p><p>Do you still want to continue?</p></div>{error ? <p role="alert" className="border border-command-danger/40 bg-command-danger/10 p-3 text-sm text-command-danger">{error}</p> : null}</div>
  </Dialog>;
}
