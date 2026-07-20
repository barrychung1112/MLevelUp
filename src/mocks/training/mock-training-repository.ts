import type {
  Clock,
  CompleteOnboardingInput,
  DemoTrainingRepository,
  IdGenerator,
  SubmissionOutcome,
  SubmitQuestInput,
  UpdateProfileInput,
} from "@/application/training/training-repository";
import { executeSubmitQuest } from "@/application/training/submit-quest";
import { localDateForInstant } from "@/domain/training/calendar";
import { selectHardestFeasibleQuest } from "@/domain/training/adaptive-selector";
import { calibrateSkills } from "@/domain/training/calibration";
import { evaluateSubmission } from "@/domain/training/evaluate-submission";
import {
  AssignmentIdInputSchema,
  CompleteOnboardingInputSchema,
  SubmitQuestInputSchema,
  TrainingStateSchema,
  UpdateProfileInputSchema,
  UserProfileSchema,
} from "@/domain/training/schemas";
import { transitionAssignment } from "@/domain/training/state-machine";
import {
  abandonTraining,
  beginRecovery,
  reconcileTrainingState,
} from "@/domain/training/reconcile-training";
import type { TrainingState } from "@/domain/training/types";

import { LocalTrainingStorage } from "./local-storage";
import {
  createAssignmentsForContract,
  createCourageAssignment,
  createTrainingSeed,
} from "./seed";

interface SubmissionRequestPayload {
  assignmentId: string;
  evidence: SubmitQuestInput["evidence"];
  selfReflection: string;
}

function normalizedSubmissionRequest(payload: SubmissionRequestPayload): string {
  const evidence = payload.evidence
    .map((item) => ({
      id: item.id,
      requirementId: item.requirementId,
      type: item.type,
      url: item.url,
      text: item.text,
      fileName: item.fileName,
      mimeType: item.mimeType,
      byteSize: item.byteSize,
      metricName: item.metricName,
      metricValue: item.metricValue,
    }))
    .sort((left, right) => {
      const requirementOrder = (left.requirementId ?? "").localeCompare(
        right.requirementId ?? "",
      );
      if (requirementOrder !== 0) return requirementOrder;
      const idOrder = left.id.localeCompare(right.id);
      if (idOrder !== 0) return idOrder;
      return JSON.stringify(left).localeCompare(JSON.stringify(right));
    });

  return JSON.stringify({
    assignmentId: payload.assignmentId,
    evidence,
    selfReflection: payload.selfReflection,
  });
}

export interface MockTrainingRepositoryDependencies {
  storage: LocalTrainingStorage;
  clock: Clock;
  ids: IdGenerator;
}

export class MockTrainingRepository implements DemoTrainingRepository {
  private state: TrainingState | null = null;

  constructor(
    private readonly dependencies: MockTrainingRepositoryDependencies,
  ) {}

  private readState(): TrainingState {
    if (!this.state) {
      this.state = this.dependencies.storage.load(() =>
        createTrainingSeed(this.dependencies.clock.now()),
      );
    }
    return TrainingStateSchema.parse(this.state);
  }

  private commit(next: TrainingState, now: string): TrainingState {
    const validated = TrainingStateSchema.parse(next);
    this.dependencies.storage.save(validated, now);
    this.state = validated;
    return TrainingStateSchema.parse(validated);
  }

  async getSnapshot(): Promise<TrainingState> {
    const current = this.readState();
    const now = this.dependencies.clock.now();
    const reconciled = reconcileTrainingState(current, now, this.dependencies.ids).state;
    return JSON.stringify(reconciled) === JSON.stringify(current)
      ? current
      : this.commit(reconciled, now);
  }

  async acceptChallenge(): Promise<TrainingState> {
    const now = this.dependencies.clock.now();
    const next = this.readState();
    next.profile.challengeAcceptedAt ??= now;
    return this.commit(next, now);
  }

  async completeOnboarding(
    input: CompleteOnboardingInput,
  ): Promise<TrainingState> {
    const parsedInput = CompleteOnboardingInputSchema.parse(input);
    const now = this.dependencies.clock.now();
    const next = this.readState();
    next.profile = UserProfileSchema.parse({
      ...next.profile,
      displayName: parsedInput.displayName,
      targetRole: parsedInput.targetRole,
      timezone: parsedInput.timezone,
      goal: "Become a machine learning engineer",
      contract: "standard",
      weeklyMinutes: 2_100,
      dailyMinutes: 300,
      onboardingCompleted: true,
    });
    next.assignments = createCourageAssignment(now, parsedInput.timezone);
    return this.commit(next, now);
  }

  async continueChallenge(): Promise<TrainingState> {
    const now = this.dependencies.clock.now();
    return this.commit(beginRecovery(this.readState(), now), now);
  }

  async abandonChallenge(): Promise<TrainingState> {
    const now = this.dependencies.clock.now();
    return this.commit(abandonTraining(this.readState(), now), now);
  }

  async updateProfile(input: UpdateProfileInput): Promise<TrainingState> {
    const parsedInput = UpdateProfileInputSchema.parse(input);
    const now = this.dependencies.clock.now();
    const next = this.readState();
    const previousContract = next.profile.contract;
    const previousTimezone = next.profile.timezone;
    next.profile = UserProfileSchema.parse({ ...next.profile, ...parsedInput });

    if (
      (next.profile.contract !== previousContract ||
        next.profile.timezone !== previousTimezone) &&
      Object.values(next.assignments).every(
        (assignment) => assignment.status === "assigned",
      )
    ) {
      next.assignments = createAssignmentsForContract(
        next.profile.contract,
        now,
        next.profile.timezone,
      );
    }

    return this.commit(next, now);
  }

  async startQuest(assignmentId: string): Promise<TrainingState> {
    const parsedAssignmentId = AssignmentIdInputSchema.parse(assignmentId);
    const now = this.dependencies.clock.now();
    const next = this.readState();
    const assignment = next.assignments[parsedAssignmentId];
    if (!assignment) throw new Error(`Unknown assignment: ${parsedAssignmentId}`);

    assignment.status = transitionAssignment(assignment.status, "in_progress");
    assignment.startedAt ??= now;
    return this.commit(next, now);
  }

  async submitQuest(input: SubmitQuestInput): Promise<SubmissionOutcome> {
    const parsedInput = SubmitQuestInputSchema.parse(input);
    const now = this.dependencies.clock.now();
    const current = this.readState();
    const existing = Object.values(current.submissions).find(
      (submission) => submission.idempotencyKey === parsedInput.idempotencyKey,
    );
    if (existing) {
      const existingRequest = normalizedSubmissionRequest({
        assignmentId: existing.assignmentId,
        evidence: existing.evidence,
        selfReflection: existing.selfReflection,
      });
      if (existingRequest !== normalizedSubmissionRequest(parsedInput)) {
        throw new Error(
          `Idempotency key belongs to a different request: ${parsedInput.idempotencyKey}`,
        );
      }
      const assignment = current.assignments[existing.assignmentId];
      const quest = assignment ? current.quests[assignment.questId] : undefined;
      if (!assignment || !quest) {
        throw new Error(`Corrupt idempotent submission reference: ${existing.id}`);
      }
      return {
        state: current,
        submission: existing,
        evaluation: evaluateSubmission({
          quest,
          evidence: existing.evidence,
          selfReflection: existing.selfReflection,
        }),
      };
    }

    const outcome = executeSubmitQuest(current, parsedInput, {
      now,
      ids: this.dependencies.ids,
    });
    const submittedQuest = outcome.state.quests[
      outcome.state.assignments[parsedInput.assignmentId].questId
    ];
    if (submittedQuest.purpose === "calibration") {
      outcome.state.progress.skills = calibrateSkills(
        outcome.state.progress.skills,
        outcome.evaluation,
      );
      const hasTrainingAssignment = Object.values(outcome.state.assignments).some(
        (assignment) => outcome.state.quests[assignment.questId].purpose === "training",
      );
      const selected = hasTrainingAssignment
        ? []
        : (["main", "daily"] as const).flatMap((scope) => {
            const quest = selectHardestFeasibleQuest({
              quests: Object.values(outcome.state.quests).filter(
                (candidate) => candidate.purpose === "training" && candidate.scope === scope,
              ),
              skills: outcome.state.progress.skills,
              availableMinutes: outcome.state.profile.dailyMinutes,
              resources: outcome.state.resources,
              excludedQuestIds: Object.values(outcome.state.assignments).map(
                (assignment) => assignment.questId,
              ),
            });
            return quest ? [quest] : [];
          });
      for (const [index, quest] of selected.entries()) {
        const assignmentId = this.dependencies.ids.next("assignment");
        outcome.state.assignments[assignmentId] = {
          id: assignmentId,
          questId: quest.id,
          assignedDate: localDateForInstant(now, outcome.state.profile.timezone),
          slot: quest.scope === "main" ? "primary" : "secondary",
          status: "assigned",
          assignedAt: now,
          dueAt: new Date(new Date(now).getTime() + 24 * 60 * 60 * 1_000).toISOString(),
          checkpointIndex: quest.scope === "main" ? index : undefined,
        };
      }
    }
    const reconciled = reconcileTrainingState(outcome.state, now, this.dependencies.ids).state;
    const committed = this.commit(reconciled, now);
    return {
      ...outcome,
      state: committed,
      submission: committed.submissions[outcome.submission.id],
    };
  }

  async resetDemo(): Promise<TrainingState> {
    this.dependencies.storage.reset();
    this.state = createTrainingSeed(this.dependencies.clock.now());
    return TrainingStateSchema.parse(this.state);
  }
}
