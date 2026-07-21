"use client";

import { useParams } from "next/navigation";
import { useState } from "react";

import type { SubmissionOutcome } from "@/application/training/training-repository";
import { QuestDetail } from "@/components/features/quests/quest-detail";
import { MissionCompletion } from "@/components/features/quests/mission-completion";
import type { EvidenceSubmissionView } from "@/components/features/view-models";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import type { EvidenceRecord, EvidenceRequirement } from "@/domain/training/types";
import { useTraining } from "@/providers/training-provider";
import { isSandboxSession } from "@/demo/sandbox-session";
import { createSandboxSampleEvidence, selectNextSandboxAssignment } from "@/demo/sandbox-mission-flow";

import { TrainingPageShell } from "../../_components/training-page-shell";
import { deriveSubmissionIdentity } from "../../_helpers/submission-identity";
import { mapFeedback, mapQuest, toPresentationEvidenceType } from "../../_helpers/training-view-models";

function toEvidence(
  requirement: EvidenceRequirement,
  submission: EvidenceSubmissionView,
): Omit<EvidenceRecord, "id"> {
  const base = { requirementId: requirement.id, type: requirement.type };
  const evidenceType = toPresentationEvidenceType(requirement.type);
  if (evidenceType === "url") return { ...base, url: submission.evidenceUrl };
  if (evidenceType === "file") {
    const metadata = submission.fileMetadata;
    return {
      ...base,
      ...(metadata?.name.trim() ? { fileName: metadata.name } : {}),
      ...(metadata?.type.trim() ? { mimeType: metadata.type } : {}),
      ...(metadata && metadata.size > 0 ? { byteSize: metadata.size } : {}),
    };
  }
  if (evidenceType === "metric") {
    const source = submission.metricResult ?? "";
    const numeric = source.match(/-?\d+(?:\.\d+)?/u)?.[0];
    const name = source.includes(":") ? source.split(":", 1)[0].trim() : "metric";
    return {
      ...base,
      metricName: name || "metric",
      ...(numeric === undefined ? {} : { metricValue: Number(numeric) }),
    };
  }
  return { ...base, text: submission.evidenceText };
}

export default function QuestAssignmentPage() {
  const params = useParams<{ assignmentId: string }>();
  const training = useTraining();
  const [result, setResult] = useState<SubmissionOutcome | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const state = training.snapshot;
  const assignment = state?.assignments[params.assignmentId];
  const quest = assignment ? state?.quests[assignment.questId] : undefined;
  const latestSubmissionId = assignment?.latestSubmissionId;
  const displayedSubmissionId = result?.submission.id ?? latestSubmissionId;
  const displayedState = result?.state ?? state;
  const submissionFeedback = displayedState && displayedSubmissionId
    ? Object.values(displayedState.feedback).find(
        (item) => item.submissionId === displayedSubmissionId,
      )
    : undefined;
  const feedbackView = submissionFeedback ? mapFeedback(submissionFeedback) : null;
  const sandbox = isSandboxSession();
  const nextSandboxAssignment = sandbox && displayedState
    ? selectNextSandboxAssignment(displayedState, assignment?.id)
    : undefined;

  async function handleStart() {
    if (!assignment) return;
    setLocalError(null);
    try {
      await training.startQuest(assignment.id);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Unable to start the mission. Try again.");
    }
  }

  async function handleSubmit(submission: EvidenceSubmissionView) {
    if (!assignment || !quest) return;
    setLocalError(null);
    setResult(null);
    try {
      if (assignment.status === "needs_revision") {
        await training.startQuest(assignment.id);
      }
      const evidenceWithoutIds = quest.evidenceRequirements.map((requirement) =>
        toEvidence(requirement, submission),
      );
      const revisionNo = Object.values(state?.submissions ?? {}).filter(
        (item) => item.assignmentId === assignment.id,
      ).length + 1;
      const identity = await deriveSubmissionIdentity({
        assignmentId: assignment.id,
        revisionNo,
        evidence: evidenceWithoutIds,
        selfReflection: submission.selfReflection,
      });
      const outcome = await training.submitQuest({
        idempotencyKey: identity.idempotencyKey,
        assignmentId: assignment.id,
        evidence: evidenceWithoutIds.map((item, index) => ({
          ...item,
          id: identity.evidenceIds[index],
        })),
        selfReflection: submission.selfReflection,
      });
      if (outcome.evaluation.verificationStatus === "verified") setResult(outcome);
      else setLocalError(outcome.evaluation.hardFailures.join(" · ") || "Revise the evidence before submitting again." );
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Submission failed. Try again." );
    }
  }

  return (
    <TrainingPageShell>
      {assignment?.status === "assigned" && quest ? (
        <section className="space-y-6" aria-labelledby="assigned-quest-heading">
          <header className="border-b border-command-border pb-5">
            <p className="text-sm uppercase tracking-[0.24em] text-command-cyan">Quest assigned</p>
            <h1 id="assigned-quest-heading" className="mt-2 text-3xl font-semibold text-command-text">{quest.title}</h1>
            <p className="mt-2 max-w-3xl text-command-muted">{quest.summary}</p>
          </header>
          <Panel>
            {localError || training.commandError ? <p role="alert" className="mb-4 text-sm text-command-danger">{localError ?? training.commandError}</p> : null}
            <p className="mb-4 text-command-muted">Review the mission brief, then start the timer and begin producing evidence.</p>
            <Button
              type="button"
              loading={training.commandStatus === "submitting"}
              onClick={() => { void handleStart(); }}
            >
              Start Mission
            </Button>
          </Panel>
        </section>
      ) : result || assignment?.status === "completed" ? (
        <MissionCompletion
          qualityScore={result?.evaluation.qualityScore ?? state?.submissions[latestSubmissionId ?? ""]?.qualityScore ?? 0}
          feedback={feedbackView}
          nextAssignmentId={nextSandboxAssignment?.id}
        />
      ) : (
        <QuestDetail
          quest={assignment && quest ? mapQuest(assignment, quest, state?.resources ?? []) : null}
          status={training.status === "ready" ? "ready" : training.status}
          errorMessage={training.loadError ?? undefined}
          isSubmitting={training.commandStatus === "submitting"}
          submitError={localError ?? training.commandError ?? undefined}
          successMessage={localError ? undefined : training.commandSuccess ?? undefined}
          sampleEvidence={sandbox && assignment && quest
            ? createSandboxSampleEvidence(mapQuest(assignment, quest, state?.resources ?? []))
            : undefined}
          onSubmit={(submission) => { void handleSubmit(submission); }}
        />
      )}
    </TrainingPageShell>
  );
}
