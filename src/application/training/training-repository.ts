import type {
  EvidenceRecord,
  Submission,
  SubmissionEvaluation,
  TrainingContract,
  TrainingState,
} from "@/domain/training/types";

export interface Clock {
  now(): string;
}

export interface IdGenerator {
  next(prefix: string): string;
}

export interface CompleteOnboardingInput {
  displayName: string;
  goal: string;
  contract: TrainingContract;
  weeklyMinutes: number;
  timezone: string;
}

export type UpdateProfileInput = Partial<CompleteOnboardingInput>;

export interface SubmitQuestInput {
  idempotencyKey: string;
  assignmentId: string;
  evidence: EvidenceRecord[];
  selfReflection: string;
}

export interface SubmissionOutcome {
  state: TrainingState;
  submission: Submission;
  evaluation: SubmissionEvaluation;
}

export interface TrainingRepository {
  getSnapshot(): Promise<TrainingState>;
  completeOnboarding(input: CompleteOnboardingInput): Promise<TrainingState>;
  updateProfile(input: UpdateProfileInput): Promise<TrainingState>;
  startQuest(assignmentId: string): Promise<TrainingState>;
  submitQuest(input: SubmitQuestInput): Promise<SubmissionOutcome>;
}

export interface DemoTrainingRepository extends TrainingRepository {
  resetDemo(): Promise<TrainingState>;
}
