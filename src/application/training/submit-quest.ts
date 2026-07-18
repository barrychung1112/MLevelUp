import { SKILL_KEYS } from "@/domain/training/constants";
import {
  calculateNextStreak,
  localDateForInstant,
} from "@/domain/training/calendar";
import {
  evaluateSubmission,
  findArtifactEvidence,
} from "@/domain/training/evaluate-submission";
import { calculateReward, levelForXp } from "@/domain/training/rewards";
import {
  SubmitQuestInputSchema,
  TrainingStateSchema,
} from "@/domain/training/schemas";
import { transitionAssignment } from "@/domain/training/state-machine";
import type {
  SkillScoreDeltas,
  SkillWeights,
  Submission,
  SubmissionEvaluation,
  SubmissionFeedback,
  TrainingState,
} from "@/domain/training/types";

import type {
  IdGenerator,
  SubmissionOutcome,
  SubmitQuestInput,
} from "./training-repository";

export interface SubmitQuestDependencies {
  now: string;
  ids: IdGenerator;
  adjudication?: PolicyGatedSubmissionAdjudication;
}

export interface PolicyGatedSubmissionAdjudication {
  source: "ai" | "ai_fallback" | "deterministic";
  evaluation: SubmissionEvaluation;
  skillWeights: SkillWeights;
  summary: string;
  strengths: string[];
  improvements: string[];
  nextActions: string[];
  explanation: string;
  confidence?: number;
  model?: string;
  promptVersion?: string;
  recommendedQuestId?: string | null;
}

function zeroDeltas(): SkillScoreDeltas {
  return Object.fromEntries(SKILL_KEYS.map((key) => [key, 0])) as SkillScoreDeltas;
}

export function executeSubmitQuest(
  state: TrainingState,
  input: SubmitQuestInput,
  dependencies: SubmitQuestDependencies,
): SubmissionOutcome {
  const parsedInput = SubmitQuestInputSchema.parse(input);
  const next = TrainingStateSchema.parse(state);
  const assignment = next.assignments[parsedInput.assignmentId];
  if (!assignment) {
    throw new Error(`Unknown assignment: ${parsedInput.assignmentId}`);
  }
  const quest = next.quests[assignment.questId];
  if (!quest) throw new Error(`Unknown quest: ${assignment.questId}`);

  assignment.status = transitionAssignment(assignment.status, "submitted");
  assignment.submittedAt = dependencies.now;
  assignment.status = transitionAssignment(assignment.status, "reviewing");

  const revisionNo =
    Object.values(next.submissions).filter(
      (submission) => submission.assignmentId === assignment.id,
    ).length + 1;
  const deterministicEvaluation = evaluateSubmission({
    quest,
    evidence: parsedInput.evidence,
    selfReflection: parsedInput.selfReflection,
  });
  const adjudicatedEvaluation = dependencies.adjudication?.evaluation;
  if (
    adjudicatedEvaluation &&
    (adjudicatedEvaluation.verificationStatus !==
      deterministicEvaluation.verificationStatus ||
      adjudicatedEvaluation.verificationMethod !==
        deterministicEvaluation.verificationMethod ||
      adjudicatedEvaluation.artifactReady !==
        deterministicEvaluation.artifactReady ||
      JSON.stringify(adjudicatedEvaluation.hardFailures) !==
        JSON.stringify(deterministicEvaluation.hardFailures) ||
      JSON.stringify(adjudicatedEvaluation.scoreBreakdown) !==
        JSON.stringify(deterministicEvaluation.scoreBreakdown))
  ) {
    throw new Error("Adjudication attempted to override deterministic evidence authority");
  }
  const evaluation: SubmissionEvaluation = adjudicatedEvaluation
    ? { ...deterministicEvaluation, qualityScore: adjudicatedEvaluation.qualityScore }
    : deterministicEvaluation;
  const feedbackMetadata = dependencies.adjudication
    ? {
        source: dependencies.adjudication.source,
        model: dependencies.adjudication.model,
        promptVersion: dependencies.adjudication.promptVersion,
        aiConfidence: dependencies.adjudication.confidence,
        adjustmentExplanation: dependencies.adjudication.explanation,
        recommendedQuestId:
          dependencies.adjudication.recommendedQuestId ?? undefined,
      }
    : { source: "demo" as const };
  const submission: Submission = {
    id: dependencies.ids.next("submission"),
    idempotencyKey: parsedInput.idempotencyKey,
    assignmentId: assignment.id,
    revisionNo,
    evidence: parsedInput.evidence,
    selfReflection: parsedInput.selfReflection,
    verificationStatus: evaluation.verificationStatus,
    verificationMethod: evaluation.verificationMethod,
    qualityScore: evaluation.qualityScore,
    scoreBreakdown: evaluation.scoreBreakdown,
    hardFailures: evaluation.hardFailures,
    submittedAt: dependencies.now,
  };
  next.submissions[submission.id] = submission;
  assignment.latestSubmissionId = submission.id;

  if (evaluation.verificationStatus !== "verified") {
    assignment.status = transitionAssignment(assignment.status, "needs_revision");
    const feedback: SubmissionFeedback = {
      id: dependencies.ids.next("feedback"),
      kind: "submission",
      submissionId: submission.id,
      summary: "The evidence needs revision before this quest can award XP.",
      strengths: [],
      improvements: evaluation.hardFailures,
      nextActions: ["Correct the evidence and submit a new revision."],
      scoreBreakdown: evaluation.scoreBreakdown,
      xpAwarded: 0,
      skillDeltas: zeroDeltas(),
      ...feedbackMetadata,
      createdAt: dependencies.now,
    };
    next.feedback[feedback.id] = feedback;
    next.activity.push({
      id: dependencies.ids.next("activity"),
      type: "submissionNeedsRevision",
      sourceId: submission.id,
      title: "Submission needs revision",
      summary: evaluation.hardFailures.join(" "),
      occurredAt: dependencies.now,
    });

    return {
      state: TrainingStateSchema.parse(next),
      submission,
      evaluation,
    };
  }

  if (next.xpEvents.some((event) => event.sourceSubmissionId === submission.id)) {
    throw new Error(`XP already awarded for submission: ${submission.id}`);
  }

  const today = localDateForInstant(dependencies.now, next.profile.timezone);
  const streakDays = calculateNextStreak(
    next.progress.currentStreak,
    next.progress.lastQualifiedDate,
    dependencies.now,
    next.profile.timezone,
  );
  const reward = calculateReward({
    baseXp: quest.baseXp,
    qualityScore: evaluation.qualityScore,
    verificationStatus: evaluation.verificationStatus,
    streakDays,
    artifactReady: evaluation.artifactReady,
    difficulty: quest.difficulty,
    skillWeights: dependencies.adjudication?.skillWeights ?? quest.skillWeights,
    currentSkills: next.progress.skills,
  });

  for (const key of SKILL_KEYS) {
    const skill = next.progress.skills[key];
    skill.skillXp += reward.skillXp[key];
    skill.lastDelta = reward.scoreDeltas[key];
    skill.score = Number(Math.min(100, skill.score + reward.scoreDeltas[key]).toFixed(4));
  }
  next.progress.totalXp += reward.awardedXp;
  next.progress.level = levelForXp(next.progress.totalXp);
  next.progress.currentStreak = streakDays;
  next.progress.longestStreak = Math.max(next.progress.longestStreak, streakDays);
  next.progress.lastQualifiedDate = today;
  next.xpEvents.push({
    id: dependencies.ids.next("xp"),
    sourceSubmissionId: submission.id,
    baseXp: quest.baseXp,
    qualityMultiplier: reward.multipliers.quality,
    streakMultiplier: reward.multipliers.streak,
    artifactMultiplier: reward.multipliers.artifact,
    awardedXp: reward.awardedXp,
    createdAt: dependencies.now,
  });

  const feedbackId = dependencies.ids.next("feedback");
  next.feedback[feedbackId] = {
    id: feedbackId,
    kind: "submission",
    submissionId: submission.id,
    summary:
      dependencies.adjudication?.summary ??
      "Evidence verified in Demo mode. The quest reward is ready.",
    strengths: dependencies.adjudication?.strengths ?? [
      "Required evidence and reflection were complete.",
    ],
    improvements: dependencies.adjudication?.improvements ?? [],
    nextActions: dependencies.adjudication?.nextActions ?? [
      "Use the result to choose the next experiment.",
    ],
    scoreBreakdown: evaluation.scoreBreakdown,
    xpAwarded: reward.awardedXp,
    skillDeltas: reward.scoreDeltas,
    ...feedbackMetadata,
    createdAt: dependencies.now,
  };

  assignment.status = transitionAssignment(assignment.status, "completed");
  assignment.completedAt = dependencies.now;
  next.activity.push({
    id: dependencies.ids.next("activity"),
    type: "questCompleted",
    sourceId: assignment.id,
    title: quest.title,
    summary: `Quest completed for ${reward.awardedXp} XP.`,
    occurredAt: dependencies.now,
  });

  if (
    evaluation.artifactReady &&
    evaluation.qualityScore >= 80 &&
    quest.expectedArtifactType
  ) {
    const artifactId = dependencies.ids.next("artifact");
    next.artifacts.push({
      id: artifactId,
      submissionId: submission.id,
      assignmentId: assignment.id,
      artifactType: quest.expectedArtifactType,
      title: quest.title,
      description: quest.summary,
      artifactUrl: findArtifactEvidence(quest, parsedInput.evidence)?.url,
      skillTags: SKILL_KEYS.filter((key) => quest.skillWeights[key] > 0),
      qualityScore: evaluation.qualityScore,
      verificationStatus: evaluation.verificationStatus,
      createdAt: dependencies.now,
    });
    next.activity.push({
      id: dependencies.ids.next("activity"),
      type: "artifactCreated",
      sourceId: artifactId,
      title: "Portfolio artifact created",
      summary: quest.title,
      occurredAt: dependencies.now,
    });
  }

  return {
    state: TrainingStateSchema.parse(next),
    submission,
    evaluation,
  };
}
