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
    if (requiresEvidence("url") && !isWebUrl(evidenceUrl)) nextErrors.url = "請輸入以 http:// 或 https:// 開頭的有效網址";
    if (requiresEvidence("file") && !fileMetadata) nextErrors.file = "請選擇成果檔案";
    if (requiresEvidence("metric") && !metricResult.trim()) nextErrors.metric = "請輸入指標結果";
    if (requiresEvidence("text") && !evidenceText.trim()) nextErrors.text = "請輸入成果內容";
    if (!selfReflection.trim()) nextErrors.reflection = "請填寫自我反思";
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

  return (
    <article aria-labelledby="quest-title" className="space-y-6">
      <header className="border-b border-command-border pb-5">
        <p className="text-sm uppercase tracking-[0.24em] text-command-cyan">Quest detail · {quest.status}</p>
        <h1 id="quest-title" className="mt-2 text-3xl font-semibold text-command-text">{quest.title}</h1>
        <p className="mt-2 max-w-3xl text-command-muted">{quest.summary}</p>
        <p className="mt-3 text-sm text-command-muted">難度 {quest.difficulty} / 5 · {quest.estimatedMinutes} 分鐘 · {quest.primarySkill}</p>
        {quest.dueAt ? <p className="mt-1 text-sm font-semibold text-command-warning">截止：{quest.dueAt}</p> : null}
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel aria-labelledby="steps-title">
          <h2 id="steps-title" className="text-lg font-semibold text-command-text">執行步驟</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-command-muted">
            {quest.executionSteps.map((step) => <li key={step}>{step}</li>)}
          </ol>
        </Panel>
        <Panel aria-labelledby="metrics-title">
          <h2 id="metrics-title" className="text-lg font-semibold text-command-text">成功衡量標準</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-command-muted">
            {quest.successMetrics.map((metric) => <li key={metric}>{metric}</li>)}
          </ul>
        </Panel>
        <Panel aria-labelledby="scope-title">
          <h2 id="scope-title" className="text-lg font-semibold text-command-text">本次不做</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-command-muted">
            {quest.outOfScope.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </Panel>
      </div>

      <Panel aria-labelledby="acceptance-title">
        <h2 id="acceptance-title" className="text-lg font-semibold text-command-text">驗收條件</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-command-muted">
          {quest.acceptanceCriteria.map((criterion) => <li key={criterion}>{criterion}</li>)}
        </ul>
      </Panel>

      {quest.resources.length > 0 ? (
        <Panel aria-labelledby="quest-resources-title">
          <h2 id="quest-resources-title" className="text-lg font-semibold text-command-text">任務資源</h2>
          <ul className="mt-3 space-y-2">
            {quest.resources.map((resource) => (
              <li key={resource.id}>
                <a className="text-command-cyan underline-offset-4 hover:underline" href={resource.url} target="_blank" rel="noreferrer">{resource.title}</a>
                <span className="ml-2 text-sm text-command-muted">約 {resource.estimatedMinutes} 分鐘</span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <form className="command-panel space-y-5 border border-command-cyan/40 bg-command-surface/95 p-5" noValidate onSubmit={handleSubmit}>
        <h2 className="text-lg font-semibold text-command-text">提交成果證據</h2>
        {submitError ? <p role="alert" className="text-sm text-command-danger">{submitError}</p> : null}
        {successMessage ? <p role="status" className="text-sm text-command-success">{successMessage}</p> : null}

        <label className="grid gap-2 text-sm font-medium text-command-text">
          證據類型
          <select
            aria-label="證據類型"
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
            成果連結
            <input aria-label="成果連結" className={controlClass} type="url" value={evidenceUrl} aria-invalid={errors.url ? true : undefined} aria-describedby={errors.url ? `${fieldId}-url-error` : undefined} onChange={(event) => { setEvidenceUrl(event.target.value); clearError("url"); }} />
            {errors.url ? <span id={`${fieldId}-url-error`} role="alert" className="text-command-danger">{errors.url}</span> : null}
          </label>
        ) : null}
        {requiresEvidence("file") ? (
          <label className="grid gap-2 text-sm font-medium text-command-text">
            成果檔案
            <input aria-label="成果檔案" className="min-h-11 py-2 text-base text-command-text file:mr-3 file:rounded-sm file:border file:border-command-border file:bg-command-raised file:px-3 file:py-2 file:text-command-text" type="file" aria-invalid={errors.file ? true : undefined} aria-describedby={errors.file ? `${fieldId}-file-error` : undefined} onChange={handleFile} />
            {fileMetadata ? <span className="text-command-muted">{fileMetadata.name} · {fileMetadata.size} bytes</span> : null}
            {errors.file ? <span id={`${fieldId}-file-error`} role="alert" className="text-command-danger">{errors.file}</span> : null}
          </label>
        ) : null}
        {requiresEvidence("metric") ? (
          <label className="grid gap-2 text-sm font-medium text-command-text">
            指標結果
            <input aria-label="指標結果" className={controlClass} value={metricResult} aria-invalid={errors.metric ? true : undefined} aria-describedby={errors.metric ? `${fieldId}-metric-error` : undefined} onChange={(event) => { setMetricResult(event.target.value); clearError("metric"); }} />
            {errors.metric ? <span id={`${fieldId}-metric-error`} role="alert" className="text-command-danger">{errors.metric}</span> : null}
          </label>
        ) : null}
        {requiresEvidence("text") ? (
          <label className="grid gap-2 text-sm font-medium text-command-text">
            成果文字
            <textarea aria-label="成果文字" className={`${textAreaClass} min-h-28`} value={evidenceText} aria-invalid={errors.text ? true : undefined} aria-describedby={errors.text ? `${fieldId}-text-error` : undefined} onChange={(event) => { setEvidenceText(event.target.value); clearError("text"); }} />
            {errors.text ? <span id={`${fieldId}-text-error`} role="alert" className="text-command-danger">{errors.text}</span> : null}
          </label>
        ) : null}

        <label className="grid gap-2 text-sm font-medium text-command-text">
          自我反思
          <textarea aria-label="自我反思" className={`${textAreaClass} min-h-32`} value={selfReflection} aria-invalid={errors.reflection ? true : undefined} aria-describedby={errors.reflection ? `${fieldId}-reflection-error` : undefined} onChange={(event) => { setSelfReflection(event.target.value); clearError("reflection"); }} />
          {errors.reflection ? <span id={`${fieldId}-reflection-error`} role="alert" className="text-command-danger">{errors.reflection}</span> : null}
        </label>

        <Button type="submit" loading={isSubmitting} disabled={isSubmitting}>提交成果</Button>
      </form>
    </article>
  );
}

export function QuestDetail({
  quest,
  status = "ready",
  errorMessage = "無法載入任務。",
  ...formProps
}: QuestDetailProps) {
  if (status === "loading") return <p role="status" className="text-command-muted">正在載入任務詳情…</p>;
  if (status === "error") return <p role="alert" className="text-command-danger">{errorMessage}</p>;
  if (!quest) return <EmptyState title="尚未選擇任務。" description="從今日任務面板開啟一項挑戰。" />;

  const evidenceKey = quest.evidenceTypes.join(":");
  return <QuestDetailForm key={`${quest.id}:${evidenceKey}`} quest={quest} {...formProps} />;
}
