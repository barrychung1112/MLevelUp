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
  targetRole: "machine-learning-engineer";
  timezone: string;
}

export interface UpdateProfileInput {
  displayName?: string;
  goal?: string;
  contract?: TrainingContract;
  weeklyMinutes?: number;
  timezone?: string;
}

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
  acceptChallenge(): Promise<TrainingState>;
  continueChallenge(): Promise<TrainingState>;
  abandonChallenge(): Promise<TrainingState>;
  completeOnboarding(input: CompleteOnboardingInput): Promise<TrainingState>;
  updateProfile(input: UpdateProfileInput): Promise<TrainingState>;
  startQuest(assignmentId: string): Promise<TrainingState>;
  submitQuest(input: SubmitQuestInput): Promise<SubmissionOutcome>;
}

export interface DemoTrainingRepository extends TrainingRepository {
  resetDemo(): Promise<TrainingState>;
}
