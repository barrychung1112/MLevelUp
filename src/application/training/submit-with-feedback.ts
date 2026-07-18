import type { AgentRunDiagnostic } from "@/ai/contracts";
import type { AgentContext } from "@/ai/context";
import { buildAgentContext } from "@/ai/context";
import type {
  AiWorkflowAdjudication,
  AiWorkflowOutcome,
} from "@/ai/run-feedback-workflow";
import { evaluateSubmission } from "@/domain/training/evaluate-submission";
import { SubmitQuestInputSchema } from "@/domain/training/schemas";
import type { SubmissionEvaluation, TrainingState } from "@/domain/training/types";

import type {
  SubmissionOutcome,
  SubmitQuestInput,
  TrainingRepository,
} from "./training-repository";

export class SubmissionAssignmentNotFoundError extends Error {
  constructor() {
    super("Submission assignment was not found");
    this.name = "SubmissionAssignmentNotFoundError";
  }
}

export interface AiSubmissionRepository
  extends Pick<TrainingRepository, "getSnapshot"> {
  submitQuestWithAdjudication(
    input: SubmitQuestInput,
    adjudication: AiWorkflowAdjudication,
    diagnostics: AgentRunDiagnostic[],
  ): Promise<SubmissionOutcome>;
}

export interface SubmitWithFeedbackDependencies {
  repository: AiSubmissionRepository;
  workflow(context: AgentContext): Promise<AiWorkflowOutcome>;
}

function priorOutcome(
  state: TrainingState,
  idempotencyKey: string,
): SubmissionOutcome | null {
  const submission = Object.values(state.submissions).find(
    (candidate) => candidate.idempotencyKey === idempotencyKey,
  );
  if (!submission) return null;
  const evaluation: SubmissionEvaluation = {
    qualityScore: submission.qualityScore,
    verificationStatus: submission.verificationStatus,
    verificationMethod: submission.verificationMethod,
    scoreBreakdown: submission.scoreBreakdown,
    artifactReady: state.artifacts.some(
      (artifact) => artifact.submissionId === submission.id,
    ),
    hardFailures: submission.hardFailures,
  };
  return { state, submission, evaluation };
}

export async function submitWithFeedback(
  input: SubmitQuestInput,
  dependencies: SubmitWithFeedbackDependencies,
): Promise<SubmissionOutcome> {
  const parsedInput = SubmitQuestInputSchema.parse(input);
  const state = await dependencies.repository.getSnapshot();
  const prior = priorOutcome(state, parsedInput.idempotencyKey);
  if (prior) return prior;

  const assignment = state.assignments[parsedInput.assignmentId];
  if (!assignment) throw new SubmissionAssignmentNotFoundError();
  const quest = state.quests[assignment.questId];
  if (!quest) throw new SubmissionAssignmentNotFoundError();
  const deterministicEvaluation = evaluateSubmission({
    quest,
    evidence: parsedInput.evidence,
    selfReflection: parsedInput.selfReflection,
  });
  const context = buildAgentContext({
    state,
    assignment,
    quest,
    input: parsedInput,
    evaluation: deterministicEvaluation,
  });
  const workflow = await dependencies.workflow(context);

  return dependencies.repository.submitQuestWithAdjudication(
    parsedInput,
    workflow.adjudication,
    workflow.diagnostics,
  );
}
