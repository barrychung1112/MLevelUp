"use client";

import { useId, useState, type ChangeEvent, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel } from "@/components/ui/panel";

import type {
  EvidenceSubmissionView,
  EvidenceType,
  FileMetadataView,
  LoadableViewProps,
  QuestView,
} from "../view-models";

type QuestDetailProps = LoadableViewProps & {
  quest: QuestView | null;
  onSubmit: (submission: EvidenceSubmissionView) => void;
  onFileMetadata?: (metadata: FileMetadataView) => void;
  isSubmitting?: boolean;
  submitError?: string;
  successMessage?: string;
  sampleEvidence?: EvidenceSubmissionView;
};

type QuestDetailFormProps = Omit<QuestDetailProps, "quest" | "status" | "errorMessage"> & {
  quest: QuestView;
};

const controlClass =
  "min-h-11 rounded-sm border border-command-border bg-command-bg/80 px-3 text-base text-command-text outline-none transition-[border-color,box-shadow] hover:border-command-muted/70 focus-visible:border-command-cyan focus-visible:shadow-[0_0_0_3px_rgba(77,231,255,0.12)]";
const textAreaClass = `${controlClass} p-3`;

function isWebUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function QuestDetailForm({
  quest,
  onSubmit,
  onFileMetadata,
  isSubmitting = false,
  submitError,
  successMessage,
  sampleEvidence,
}: QuestDetailFormProps) {
  const fieldId = useId();
  const [evidenceType, setEvidenceType] = useState<EvidenceType>(quest?.evidenceTypes[0] ?? "url");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [fileMetadata, setFileMetadata] = useState<FileMetadataView>();
  const [metricResult, setMetricResult] = useState("");
  const [evidenceText, setEvidenceText] = useState("");
  const [selfReflection, setSelfReflection] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const requiresMultipleEvidence = quest.evidenceTypes.length > 1;
  const requiresEvidence = (type: EvidenceType) =>
    requiresMultipleEvidence
      ? quest.evidenceTypes.includes(type)
      : evidenceType === type;

  function clearError(field: "url" | "file" | "metric" | "text" | "reflection") {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    const metadata = {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
    };
    setFileMetadata(metadata);
    clearError("file");
    onFileMetadata?.(metadata);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (requiresEvidence("url") && !isWebUrl(evidenceUrl)) nextErrors.url = "Enter a valid URL beginning with http:// or https://";
    if (requiresEvidence("file") && !fileMetadata) nextErrors.file = "Select an evidence file";
    if (requiresEvidence("metric") && !metricResult.trim()) nextErrors.metric = "Enter the metric result";
    if (requiresEvidence("text") && !evidenceText.trim()) nextErrors.text = "Enter the evidence content";
    if (!selfReflection.trim()) nextErrors.reflection = "Write a self-reflection";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onSubmit({
      evidenceType,
      evidenceUrl: evidenceUrl || undefined,
      fileMetadata,
      metricResult: metricResult || undefined,
      evidenceText: evidenceText || undefined,
      selfReflection,
    });
  }

  function loadSampleEvidence() {
    if (!sampleEvidence) return;
    setEvidenceType(sampleEvidence.evidenceType);
    setEvidenceUrl(sampleEvidence.evidenceUrl ?? "");
    setFileMetadata(sampleEvidence.fileMetadata);
    setMetricResult(sampleEvidence.metricResult ?? "");
    setEvidenceText(sampleEvidence.evidenceText ?? "");
    setSelfReflection(sampleEvidence.selfReflection);
    setErrors({});
  }

  return (
    <article aria-labelledby="quest-title" className="space-y-6">
      <header className="border-b border-command-border pb-5">
        <p className="text-sm uppercase tracking-[0.24em] text-command-cyan">Quest detail · {quest.status}</p>
        <h1 id="quest-title" className="mt-2 text-3xl font-semibold text-command-text">{quest.title}</h1>
        <p className="mt-2 max-w-3xl text-command-muted">{quest.summary}</p>
        <p className="mt-3 text-sm text-command-muted">Difficulty {quest.difficulty} / 5 · {quest.estimatedMinutes} minutes · {quest.primarySkill}</p>
        {quest.dueAt ? <p className="mt-1 text-sm font-semibold text-command-warning">Due: {quest.dueAt}</p> : null}
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel aria-labelledby="steps-title">
          <h2 id="steps-title" className="text-lg font-semibold text-command-text">Execution Steps</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-command-muted">
            {quest.executionSteps.map((step) => <li key={step}>{step}</li>)}
          </ol>
        </Panel>
        <Panel aria-labelledby="metrics-title">
          <h2 id="metrics-title" className="text-lg font-semibold text-command-text">Success Criteria</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-command-muted">
            {quest.successMetrics.map((metric) => <li key={metric}>{metric}</li>)}
          </ul>
        </Panel>
        <Panel aria-labelledby="scope-title">
          <h2 id="scope-title" className="text-lg font-semibold text-command-text">Out of Scope</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-command-muted">
            {quest.outOfScope.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </Panel>
      </div>

      <Panel aria-labelledby="acceptance-title">
        <h2 id="acceptance-title" className="text-lg font-semibold text-command-text">Acceptance Criteria</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-command-muted">
          {quest.acceptanceCriteria.map((criterion) => <li key={criterion}>{criterion}</li>)}
        </ul>
      </Panel>

      {quest.resources.length > 0 ? (
        <Panel aria-labelledby="quest-resources-title">
          <h2 id="quest-resources-title" className="text-lg font-semibold text-command-text">Mission Resources</h2>
          <ul className="mt-3 space-y-2">
            {quest.resources.map((resource) => (
              <li key={resource.id}>
                <a className="text-command-cyan underline-offset-4 hover:underline" href={resource.url} target="_blank" rel="noreferrer">{resource.title}</a>
                <span className="ml-2 text-sm text-command-muted">About {resource.estimatedMinutes} minutes</span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <form className="command-panel space-y-5 border border-command-cyan/40 bg-command-surface/95 p-5" noValidate onSubmit={handleSubmit}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-command-text">Submit Evidence</h2>
          {sampleEvidence ? <Button type="button" size="sm" variant="secondary" onClick={loadSampleEvidence}>Load sample evidence</Button> : null}
        </div>
        {submitError ? <p role="alert" className="text-sm text-command-danger">{submitError}</p> : null}
        {successMessage ? <p role="status" className="text-sm text-command-success">{successMessage}</p> : null}

        <label className="grid gap-2 text-sm font-medium text-command-text">
          Evidence type
          <select
            aria-label="Evidence type"
            className={controlClass}
            value={evidenceType}
            onChange={(event) => {
              setEvidenceType(event.target.value as EvidenceType);
              setErrors({});
            }}
          >
            {quest.evidenceTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </label>

        {requiresEvidence("url") ? (
          <label className="grid gap-2 text-sm font-medium text-command-text">
            Evidence URL
            <input aria-label="Evidence URL" className={controlClass} type="url" value={evidenceUrl} aria-invalid={errors.url ? true : undefined} aria-describedby={errors.url ? `${fieldId}-url-error` : undefined} onChange={(event) => { setEvidenceUrl(event.target.value); clearError("url"); }} />
            {errors.url ? <span id={`${fieldId}-url-error`} role="alert" className="text-command-danger">{errors.url}</span> : null}
          </label>
        ) : null}
        {requiresEvidence("file") ? (
          <label className="grid gap-2 text-sm font-medium text-command-text">
            Evidence file
            <input aria-label="Evidence file" className="min-h-11 py-2 text-base text-command-text file:mr-3 file:rounded-sm file:border file:border-command-border file:bg-command-raised file:px-3 file:py-2 file:text-command-text" type="file" aria-invalid={errors.file ? true : undefined} aria-describedby={errors.file ? `${fieldId}-file-error` : undefined} onChange={handleFile} />
            {fileMetadata ? <span className="text-command-muted">{fileMetadata.name} · {fileMetadata.size} bytes</span> : null}
            {errors.file ? <span id={`${fieldId}-file-error`} role="alert" className="text-command-danger">{errors.file}</span> : null}
          </label>
        ) : null}
        {requiresEvidence("metric") ? (
          <label className="grid gap-2 text-sm font-medium text-command-text">
            Metric result
            <input aria-label="Metric result" className={controlClass} value={metricResult} aria-invalid={errors.metric ? true : undefined} aria-describedby={errors.metric ? `${fieldId}-metric-error` : undefined} onChange={(event) => { setMetricResult(event.target.value); clearError("metric"); }} />
            {errors.metric ? <span id={`${fieldId}-metric-error`} role="alert" className="text-command-danger">{errors.metric}</span> : null}
          </label>
        ) : null}
        {requiresEvidence("text") ? (
          <label className="grid gap-2 text-sm font-medium text-command-text">
            Evidence notes
            <textarea aria-label="Evidence notes" className={`${textAreaClass} min-h-28`} value={evidenceText} aria-invalid={errors.text ? true : undefined} aria-describedby={errors.text ? `${fieldId}-text-error` : undefined} onChange={(event) => { setEvidenceText(event.target.value); clearError("text"); }} />
            {errors.text ? <span id={`${fieldId}-text-error`} role="alert" className="text-command-danger">{errors.text}</span> : null}
          </label>
        ) : null}

        <label className="grid gap-2 text-sm font-medium text-command-text">
          Self-reflection
          <textarea aria-label="Self-reflection" className={`${textAreaClass} min-h-32`} value={selfReflection} aria-invalid={errors.reflection ? true : undefined} aria-describedby={errors.reflection ? `${fieldId}-reflection-error` : undefined} onChange={(event) => { setSelfReflection(event.target.value); clearError("reflection"); }} />
          {errors.reflection ? <span id={`${fieldId}-reflection-error`} role="alert" className="text-command-danger">{errors.reflection}</span> : null}
        </label>

        <Button type="submit" loading={isSubmitting} disabled={isSubmitting}>Submit Evidence</Button>
      </form>
    </article>
  );
}

export function QuestDetail({
  quest,
  status = "ready",
  errorMessage = "Unable to load this mission.",
  ...formProps
}: QuestDetailProps) {
  if (status === "loading") return <p role="status" className="text-command-muted">Loading mission details…</p>;
  if (status === "error") return <p role="alert" className="text-command-danger">{errorMessage}</p>;
  if (!quest) return <EmptyState title="No mission selected." description="Open a challenge from the mission board." />;

  const evidenceKey = quest.evidenceTypes.join(":");
  return <QuestDetailForm key={`${quest.id}:${evidenceKey}`} quest={quest} {...formProps} />;
}
