"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { AchievementDraftView } from "@/portfolio/portfolio-command-client";

export function ArtifactEnhancementPanel(props: {
  artifactId: string;
  onVerify(id: string): Promise<{ ok: boolean; status?: string; code?: string }>;
  onGenerate(id: string, replace: boolean): Promise<{ ok: boolean; draft?: AchievementDraftView; code?: string }>;
  onUpdate(id: string, action: "save" | "approve", bullets: Array<{ id: string; text: string }>): Promise<{ ok: boolean; status?: string; code?: string }>;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState<AchievementDraftView | null>(null);
  async function run(work: () => Promise<void>) { setBusy(true); setMessage(null); try { await work(); } finally { setBusy(false); } }
  const edits = draft?.bullets.map(({ id, text }) => ({ id, text })) ?? [];
  return <div className="mt-4 space-y-3 border-t border-command-border pt-4">
    <div className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" loading={busy} onClick={() => void run(async () => { const result = await props.onVerify(props.artifactId); setMessage(result.ok ? `Link ${result.status ?? "checked"}; ownership not verified` : `Verification failed: ${result.code}`); })}>Verify Link</Button><Button size="sm" variant="secondary" loading={busy} onClick={() => void run(async () => { const result = await props.onGenerate(props.artifactId, draft !== null); if (result.ok && result.draft) { setDraft(result.draft); setMessage("Private achievement draft generated."); } else setMessage(`Generation failed: ${result.code}`); })}>{draft ? "Regenerate" : "Generate achievements"}</Button></div>
    {draft ? <div className="space-y-2"><p className="text-xs text-command-muted">{draft.status === "approved" ? "Approved" : "Private draft"}</p>{draft.bullets.map((bullet, index) => <textarea key={bullet.id} aria-label={`Achievement ${index + 1}`} className="min-h-20 w-full border border-command-border bg-command-bg p-2 text-sm" maxLength={160} value={bullet.text} onChange={(event) => setDraft({ ...draft, status: "draft", bullets: draft.bullets.map((item) => item.id === bullet.id ? { ...item, text: event.target.value } : item) })} />)}<div className="flex gap-2"><Button size="sm" variant="secondary" loading={busy} onClick={() => void run(async () => { const result = await props.onUpdate(props.artifactId, "save", edits); setMessage(result.ok ? "Draft saved." : `Save failed: ${result.code}`); })}>Save draft</Button><Button size="sm" loading={busy} onClick={() => void run(async () => { const result = await props.onUpdate(props.artifactId, "approve", edits); if (result.ok) setDraft({ ...draft, status: "approved" }); setMessage(result.ok ? "Approved for portfolio." : `Approval failed: ${result.code}`); })}>Approve for portfolio</Button></div></div> : null}
    {message ? <p role="status" className="text-xs text-command-muted">{message}</p> : null}
  </div>;
}
