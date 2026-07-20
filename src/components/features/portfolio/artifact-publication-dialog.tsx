"use client";

import { useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { PublishArtifactInputSchema, type PublishArtifactInput, type PublishedArtifact } from "@/portfolio/contracts";

import type { PortfolioArtifactView } from "../view-models";

const inputClass = "min-h-28 w-full rounded-sm border border-command-border bg-command-bg/80 px-3 py-2 text-sm text-command-text outline-none focus-visible:border-command-cyan focus-visible:shadow-[0_0_0_3px_rgba(77,231,255,0.12)]";

export function ArtifactPublicationDialog({ artifact, snapshot, onClose, onSubmit, submitting }: {
  artifact: PortfolioArtifactView;
  snapshot?: PublishedArtifact;
  onClose(): void;
  onSubmit(input: PublishArtifactInput): Promise<void>;
  submitting: boolean;
}) {
  const [title, setTitle] = useState(snapshot?.publicTitle ?? artifact.title);
  const [summary, setSummary] = useState(snapshot?.publicSummary ?? artifact.summary ?? "");
  const [showUrl, setShowUrl] = useState(Boolean(snapshot?.artifactUrl ?? artifact.artifactUrl));
  const [featured, setFeatured] = useState(snapshot?.featured ?? false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = PublishArtifactInputSchema.safeParse({
      artifactId: artifact.id,
      publicTitle: title,
      publicSummary: summary,
      showArtifactUrl: showUrl,
      featured,
      displayOrder: snapshot?.displayOrder ?? 0,
    });
    if (!parsed.success) {
      setError("Public title must be 3–200 characters and summary 20–1200 characters.");
      return;
    }
    setError(null);
    await onSubmit(parsed.data);
    onClose();
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="publication-dialog-title" className="fixed inset-0 z-50 grid place-items-center bg-command-bg/85 p-4 backdrop-blur-sm">
      <form onSubmit={(event) => void submit(event)} className="command-panel w-full max-w-xl border border-command-cyan/45 bg-command-surface p-6 shadow-[0_0_80px_rgba(77,231,255,0.12)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-data text-xs uppercase tracking-[0.22em] text-command-cyan">Public projection</p>
            <h2 id="publication-dialog-title" className="mt-2 text-2xl font-semibold text-command-text">Publish evidence</h2>
          </div>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
        <div className="mt-6 grid gap-5">
          <Field label="Public title" value={title} onChange={(event) => setTitle(event.target.value)} />
          <label className="grid gap-2 text-sm font-semibold text-command-text">
            Public summary
            <textarea className={inputClass} value={summary} onChange={(event) => setSummary(event.target.value)} />
          </label>
          <div className="flex flex-wrap gap-2" aria-label="Canonical artifact facts">
            <Badge>{artifact.artifactType}</Badge>
            <Badge tone="success">Quality {artifact.qualityScore}</Badge>
            {artifact.skillTags.map((skill) => <Badge key={skill}>{skill}</Badge>)}
          </div>
          <label className="flex items-center gap-3 text-sm text-command-text">
            <input type="checkbox" checked={showUrl} disabled={!artifact.artifactUrl?.startsWith("https://")} onChange={(event) => setShowUrl(event.target.checked)} />
            Show verified HTTPS artifact link
          </label>
          <label className="flex items-center gap-3 text-sm text-command-text">
            <input type="checkbox" checked={featured} onChange={(event) => setFeatured(event.target.checked)} />
            Feature this artifact
          </label>
          {error ? <p role="alert" className="text-sm text-command-danger">{error}</p> : null}
          <Button type="submit" loading={submitting}>Confirm publication</Button>
        </div>
      </form>
    </div>
  );
}
