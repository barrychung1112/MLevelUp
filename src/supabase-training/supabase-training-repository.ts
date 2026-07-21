import type { SupabaseClient } from "@supabase/supabase-js";

import type { AgentRunDiagnostic } from "@/ai/contracts";
import type {
  Clock,
  CompleteOnboardingInput,
  DemoTrainingRepository,
  IdGenerator,
  SubmissionOutcome,
  SubmitQuestInput,
  UpdateProfileInput,
} from "@/application/training/training-repository";
import {
  executeSubmitQuest,
  type PolicyGatedSubmissionAdjudication,
} from "@/application/training/submit-quest";
import { selectHardestFeasibleQuest } from "@/domain/training/adaptive-selector";
import { calibrateSkills } from "@/domain/training/calibration";
import { localDateForInstant } from "@/domain/training/calendar";
import { SKILL_KEYS } from "@/domain/training/constants";
import {
  AssignmentIdInputSchema,
  CompleteOnboardingInputSchema,
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
import type {
  ActivityEvent,
  AgentStatus,
  Quest,
  QuestAssignment,
  SkillStats,
  TrainingState,
  UserProgress,
  UserProfile,
  XpEvent,
} from "@/domain/training/types";
import { SEED_VERSION } from "@/mocks/training/seed";

import type { ServerSubmissionClient } from "./server-submit-client";

import {
  mapAgentRunRow,
  mapAssignmentRow,
  mapFeedbackRow,
  mapPortfolioArtifactRow,
  mapQuestRow,
  mapResourceCollectorStatusRow,
  mapResourceRow,
  mapSkillStatsRows,
  mapSubmissionRow,
  type AgentRunRow,
  type AssignmentRow,
  type FeedbackRow,
  type PortfolioArtifactRow,
  type QuestRow,
  type ResourceCollectorStatusRow,
  type ResourceRow,
  type SkillStatRow,
  type SubmissionRow,
} from "./row-mappers";

type QueryResult<T> = Promise<{ data: T | null; error: { message: string } | null }>;

type SelectBuilder<T> = {
  eq(column: string, value: unknown): {
    maybeSingle(): QueryResult<T>;
    order(column: string): QueryResult<T[]>;
  };
  order(column: string): QueryResult<T[]>;
};

type TableClient<T> = {
  select(columns?: string): SelectBuilder<T>;
  upsert(values: unknown, options?: unknown): QueryResult<unknown>;
  insert(values: unknown): QueryResult<unknown>;
  update(values: unknown): { eq(column: string, value: unknown): QueryResult<unknown> };
  delete(): { eq(column: string, value: unknown): QueryResult<unknown> };
};

type SupabaseDatabaseClient = {
  auth: {
    getUser(): Promise<{ data: { user: { id: string } | null }; error: { message: string } | null }>;
  };
  rpc(name: string, args?: Record<string, unknown>): QueryResult<unknown[]>;
  from<T>(table: string): TableClient<T>;
};

type ProfileRow = {
  user_id: string;
  display_name: string;
  goal: string;
  contract: UserProfile["contract"];
  weekly_minutes: number;
  timezone: string;
  onboarding_completed: boolean;
  challenge_accepted_at: string | null;
  target_role?: UserProfile["targetRole"];
  daily_minutes?: number;
  consecutive_failure_days?: number;
  training_status?: UserProfile["trainingStatus"];
  recovery_started_at?: string | null;
  recovery_deadline?: string | null;
};

type ProgressRow = {
  total_xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  last_qualified_date: string | null;
};

export interface SupabaseTrainingRepositoryDependencies {
  client: SupabaseClient | SupabaseDatabaseClient;
  clock: Clock;
  ids: IdGenerator;
  submissionClient?: ServerSubmissionClient;
}

function defaultProgress(skills: SkillStats): UserProgress {
  return {
    totalXp: 0,
    level: 1,
    currentStreak: 0,
    longestStreak: 0,
    lastQualifiedDate: null,
    skills,
  };
}

function defaultProfile(userId: string): UserProfile {
  return {
    id: userId,
    displayName: "New Hunter",
    goal: "Become a machine learning engineer",
    contract: "standard",
    weeklyMinutes: 600,
    timezone: "America/Los_Angeles",
    onboardingCompleted: false,
    challengeAcceptedAt: null,
    targetRole: "machine-learning-engineer",
    dailyMinutes: 300,
    consecutiveFailureDays: 0,
    trainingStatus: "normal",
    recoveryStartedAt: null,
    recoveryDeadline: null,
  };
}

function defaultAgents(now: string): AgentStatus[] {
  return [
    {
      agentType: "coordinator",
      status: "idle",
      lastRunAt: now,
      summary: "Waiting for the next Supabase-backed training event.",
      isMock: true,
    },
    {
      agentType: "learningStrategist",
      status: "idle",
      lastRunAt: now,
      summary: "Using the Phase 2 catalog seed.",
      isMock: true,
    },
    {
      agentType: "resourceCollector",
      status: "idle",
      lastRunAt: now,
      summary: "Resource collection remains manual until Phase 4.",
      isMock: true,
    },
    {
      agentType: "adjuster",
      status: "idle",
      lastRunAt: now,
      summary: "Waiting for submission history.",
      isMock: true,
    },
  ];
}

function activityFromState(state: TrainingState): ActivityEvent[] {
  const questEvents = Object.values(state.assignments)
    .filter((assignment) => assignment.latestSubmissionId)
    .map((assignment) => {
      const submission = state.submissions[assignment.latestSubmissionId!];
      const quest = state.quests[assignment.questId];
      return {
        id: `activity-${submission.id}`,
        type: submission.verificationStatus === "verified" ? "questCompleted" : "submissionNeedsRevision",
        sourceId: submission.id,
        title: submission.verificationStatus === "verified" ? quest.title : "Submission needs revision",
        summary:
          submission.verificationStatus === "verified"
            ? `Quest completed with quality score ${submission.qualityScore}.`
            : submission.hardFailures.join(" "),
        occurredAt: submission.submittedAt,
      } satisfies ActivityEvent;
    });

  const artifactEvents = state.artifacts.map((artifact) => ({
    id: `activity-${artifact.id}`,
    type: "artifactCreated" as const,
    sourceId: artifact.id,
    title: "Portfolio artifact created",
    summary: artifact.title,
    occurredAt: artifact.createdAt,
  }));

  return [...questEvents, ...artifactEvents].sort((left, right) =>
    right.occurredAt.localeCompare(left.occurredAt),
  );
}

function noXpEvents(): XpEvent[] {
  return [];
}

export class SupabaseTrainingRepository implements DemoTrainingRepository {
  private readonly client: SupabaseDatabaseClient;

  constructor(private readonly dependencies: SupabaseTrainingRepositoryDependencies) {
    this.client = dependencies.client as SupabaseDatabaseClient;
  }

  private async userId(): Promise<string> {
    const { data, error } = await this.client.auth.getUser();
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error("Supabase session is required");
    return data.user.id;
  }

  private async selectRows<T>(table: string, userId?: string, orderColumn?: string): Promise<T[]> {
    const query = this.client.from<T>(table).select("*");
    const { data, error } = userId
      ? await query.eq("user_id", userId).order(orderColumn ?? "created_at")
      : await query.order(orderColumn ?? "id");
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  private async selectVisibleQuests(userId: string): Promise<QuestRow[]> {
    const { data, error } = await this.client.rpc("get_visible_quests", {
      p_user_id: userId,
    });
    if (error) throw new Error(error.message);
    return (data ?? []) as QuestRow[];
  }

  private async maybeProfile(userId: string): Promise<ProfileRow | null> {
    const { data, error } = await this.client
      .from<ProfileRow>("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  }

  private async maybeProgress(userId: string): Promise<ProgressRow | null> {
    const { data, error } = await this.client
      .from<ProgressRow>("user_progress")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  }

  private async latestResourceCollectorStatus(): Promise<ResourceCollectorStatusRow | null> {
    const { data, error } = await this.client.rpc("get_latest_resource_collector_status");
    if (error || !data || data.length === 0) return null;
    return data[0] as ResourceCollectorStatusRow;
  }

  async getSnapshot(): Promise<TrainingState> {
    const userId = await this.userId();
    const [
      profileRow,
      progressRow,
      questRows,
      resourceRows,
      skillRows,
      assignmentRows,
      submissionRows,
      feedbackRows,
      artifactRows,
      agentRows,
      collectorStatusRow,
    ] = await Promise.all([
      this.maybeProfile(userId),
      this.maybeProgress(userId),
      this.selectVisibleQuests(userId),
      this.selectRows<ResourceRow>("resources"),
      this.selectRows<SkillStatRow>("skill_stats", userId, "updated_at"),
      this.selectRows<AssignmentRow>("quest_assignments", userId),
      this.selectRows<SubmissionRow>("submissions", userId),
      this.selectRows<FeedbackRow>("feedback", userId),
      this.selectRows<PortfolioArtifactRow>("portfolio_artifacts", userId),
      this.selectRows<AgentRunRow>("agent_runs", userId),
      this.latestResourceCollectorStatus(),
    ]);

    const skills = mapSkillStatsRows(skillRows);
    const profile = profileRow
      ? UserProfileSchema.parse({
          id: userId,
          displayName: profileRow.display_name,
          goal: profileRow.goal,
          contract: profileRow.contract,
          weeklyMinutes: profileRow.weekly_minutes,
          timezone: profileRow.timezone,
          onboardingCompleted: profileRow.onboarding_completed,
          challengeAcceptedAt: profileRow.challenge_accepted_at,
          targetRole: profileRow.target_role ?? "machine-learning-engineer",
          dailyMinutes: profileRow.daily_minutes ?? 300,
          consecutiveFailureDays: profileRow.consecutive_failure_days ?? 0,
          trainingStatus: profileRow.training_status ?? "normal",
          recoveryStartedAt: profileRow.recovery_started_at ?? null,
          recoveryDeadline: profileRow.recovery_deadline ?? null,
        })
      : defaultProfile(userId);

    const progress: UserProgress = progressRow
      ? {
          totalXp: progressRow.total_xp,
          level: progressRow.level,
          currentStreak: progressRow.current_streak,
          longestStreak: progressRow.longest_streak,
          lastQualifiedDate: progressRow.last_qualified_date,
          skills,
        }
      : defaultProgress(skills);

    const agents = agentRows.length > 0
      ? agentRows.map(mapAgentRunRow)
      : defaultAgents(this.dependencies.clock.now());
    if (collectorStatusRow) {
      const collectorStatus = mapResourceCollectorStatusRow(collectorStatusRow);
      const collectorIndex = agents.findIndex((agent) => agent.agentType === "resourceCollector");
      if (collectorIndex >= 0) agents[collectorIndex] = collectorStatus;
      else agents.push(collectorStatus);
    }

    const state: TrainingState = {
      schemaVersion: 1,
      seedVersion: SEED_VERSION,
      profile,
      progress,
      quests: Object.fromEntries(questRows.map((row) => {
        const quest = mapQuestRow(row);
        return [quest.id, quest];
      })),
      assignments: Object.fromEntries(assignmentRows.map((row) => {
        const assignment = mapAssignmentRow(row);
        return [assignment.id, assignment];
      })),
      submissions: Object.fromEntries(submissionRows.map((row) => {
        const submission = mapSubmissionRow(row);
        return [submission.id, submission];
      })),
      feedback: Object.fromEntries(feedbackRows.map((row) => {
        const feedback = mapFeedbackRow(row);
        return [feedback.id, feedback];
      })),
      resources: resourceRows.map(mapResourceRow),
      artifacts: artifactRows.map(mapPortfolioArtifactRow),
      agents,
      activity: [],
      xpEvents: noXpEvents(),
    };
    state.activity = activityFromState(state);
    const reconciled = reconcileTrainingState(
      state,
      this.dependencies.clock.now(),
      this.dependencies.ids,
    );
    if (JSON.stringify(reconciled.state) !== JSON.stringify(state)) {
      if (reconciled.effects.some((effect) => effect.type === "training_reset_required")) {
        await this.clearProgressRows(userId);
      }
      await this.persistState(reconciled.state);
    }
    return TrainingStateSchema.parse(reconciled.state);
  }

  private assignmentsFor(contract: UserProfile["contract"], quests: Record<string, Quest>, now: string, timezone: string): QuestAssignment[] {
    const assignedDate = localDateForInstant(now, timezone);
    return Object.values(quests)
      .filter(
        (quest) => quest.purpose === "training" && quest.trainingContract === contract,
      )
      .map((quest, index) => ({
        id: this.dependencies.ids.next("assignment"),
        questId: quest.id,
        assignedDate,
        slot: index === 0 ? "primary" : quest.optional ? "optional" : "secondary",
        status: "assigned",
        assignedAt: now,
      }));
  }

  private async upsert(table: string, values: unknown, options?: unknown): Promise<void> {
    const { error } = await this.client.from(table).upsert(values, options);
    if (error) throw new Error(error.message);
  }

  private async update(table: string, values: unknown, column: string, value: unknown): Promise<void> {
    const { error } = await this.client.from(table).update(values).eq(column, value);
    if (error) throw new Error(error.message);
  }

  private async deleteOwn(table: string, userId: string): Promise<void> {
    const { error } = await this.client.from(table).delete().eq("user_id", userId);
    if (error) throw new Error(error.message);
  }

  private async clearProgressRows(userId: string): Promise<void> {
    await this.deleteOwn("feedback", userId);
    await this.deleteOwn("submissions", userId);
    await this.deleteOwn("quest_assignments", userId);
    await this.deleteOwn("skill_stats", userId);
    await this.deleteOwn("user_progress", userId);
  }

  private async persistState(state: TrainingState): Promise<void> {
    const userId = state.profile.id;
    await this.upsert("profiles", {
      user_id: userId,
      display_name: state.profile.displayName,
      goal: state.profile.goal,
      contract: state.profile.contract,
      weekly_minutes: state.profile.weeklyMinutes,
      timezone: state.profile.timezone,
      onboarding_completed: state.profile.onboardingCompleted,
      challenge_accepted_at: state.profile.challengeAcceptedAt,
      target_role: state.profile.targetRole,
      daily_minutes: state.profile.dailyMinutes,
      consecutive_failure_days: state.profile.consecutiveFailureDays,
      training_status: state.profile.trainingStatus,
      recovery_started_at: state.profile.recoveryStartedAt,
      recovery_deadline: state.profile.recoveryDeadline,
      updated_at: this.dependencies.clock.now(),
    });
    await this.upsert("user_progress", {
      user_id: userId,
      total_xp: state.progress.totalXp,
      level: state.progress.level,
      current_streak: state.progress.currentStreak,
      longest_streak: state.progress.longestStreak,
      last_qualified_date: state.progress.lastQualifiedDate,
      updated_at: this.dependencies.clock.now(),
    });
    await this.upsert(
      "skill_stats",
      SKILL_KEYS.map((skillKey) => ({
        user_id: userId,
        skill_key: skillKey,
        score: state.progress.skills[skillKey].score,
        skill_xp: state.progress.skills[skillKey].skillXp,
        last_delta: state.progress.skills[skillKey].lastDelta,
        updated_at: this.dependencies.clock.now(),
      })),
    );
    await this.upsert(
      "quest_assignments",
      Object.values(state.assignments).map((assignment) => ({
        id: assignment.id,
        user_id: userId,
        quest_id: assignment.questId,
        assigned_date: assignment.assignedDate,
        slot: assignment.slot,
        status: assignment.status,
        assigned_at: assignment.assignedAt,
        started_at: assignment.startedAt ?? null,
        submitted_at: assignment.submittedAt ?? null,
        completed_at: assignment.completedAt ?? null,
        latest_submission_id: assignment.latestSubmissionId ?? null,
        parent_assignment_id: assignment.parentAssignmentId ?? null,
        checkpoint_index: assignment.checkpointIndex ?? null,
        due_at: assignment.dueAt ?? null,
        expired_at: assignment.expiredAt ?? null,
        penalty_source_assignment_id: assignment.penaltySourceAssignmentId ?? null,
        updated_at: this.dependencies.clock.now(),
      })),
    );
    await this.upsert(
      "submissions",
      Object.values(state.submissions).map((submission) => ({
        id: submission.id,
        user_id: userId,
        assignment_id: submission.assignmentId,
        idempotency_key: submission.idempotencyKey,
        revision_no: submission.revisionNo,
        evidence: submission.evidence,
        self_reflection: submission.selfReflection,
        verification_status: submission.verificationStatus,
        verification_method: submission.verificationMethod,
        quality_score: submission.qualityScore,
        score_breakdown: submission.scoreBreakdown,
        hard_failures: submission.hardFailures,
        submitted_at: submission.submittedAt,
      })),
      { onConflict: "user_id,idempotency_key" },
    );
    await this.upsert(
      "feedback",
      Object.values(state.feedback).map((feedback) => ({
        id: feedback.id,
        user_id: userId,
        submission_id: feedback.submissionId ?? null,
        kind: feedback.kind,
        summary: feedback.summary,
        strengths: feedback.strengths,
        improvements: feedback.improvements,
        next_actions: feedback.nextActions,
        score_breakdown: feedback.scoreBreakdown ?? null,
        xp_awarded: feedback.xpAwarded,
        skill_deltas: feedback.skillDeltas,
        source: feedback.source === "demo" ? "deterministic" : feedback.source,
        model: feedback.model ?? null,
        prompt_version: feedback.promptVersion ?? null,
        ai_confidence: feedback.aiConfidence ?? null,
        adjustment_explanation: feedback.adjustmentExplanation ?? null,
        recommended_quest_id: feedback.recommendedQuestId ?? null,
        created_at: feedback.createdAt,
      })),
    );
    await this.upsert(
      "portfolio_artifacts",
      state.artifacts.map((artifact) => ({
        id: artifact.id,
        user_id: userId,
        submission_id: artifact.submissionId,
        assignment_id: artifact.assignmentId,
        artifact_type: artifact.artifactType,
        title: artifact.title,
        description: artifact.description,
        artifact_url: artifact.artifactUrl ?? null,
        skill_tags: artifact.skillTags,
        quality_score: artifact.qualityScore,
        verification_status: artifact.verificationStatus,
        created_at: artifact.createdAt,
      })),
    );
  }

  async completeOnboarding(input: CompleteOnboardingInput): Promise<TrainingState> {
    const parsedInput = CompleteOnboardingInputSchema.parse(input);
    const now = this.dependencies.clock.now();
    const current = await this.getSnapshot();
    const next = TrainingStateSchema.parse({
      ...current,
      profile: UserProfileSchema.parse({
        ...current.profile,
        displayName: parsedInput.displayName,
        targetRole: parsedInput.targetRole,
        timezone: parsedInput.timezone,
        goal: "Become a machine learning engineer",
        contract: "standard",
        weeklyMinutes: 2_100,
        dailyMinutes: 300,
        onboardingCompleted: true,
      }),
    });
    const courageAssignment: QuestAssignment = {
      id: this.dependencies.ids.next("assignment"),
      questId: "quest-courage-challenge",
      assignedDate: localDateForInstant(now, parsedInput.timezone),
      slot: "primary",
      status: "assigned",
      assignedAt: now,
    };
    next.assignments = { [courageAssignment.id]: courageAssignment };
    await this.persistState(next);
    return this.getSnapshot();
  }

  async acceptChallenge(): Promise<TrainingState> {
    const next = await this.getSnapshot();
    if (next.profile.challengeAcceptedAt) return next;
    next.profile.challengeAcceptedAt = this.dependencies.clock.now();
    await this.persistState(next);
    return this.getSnapshot();
  }

  async continueChallenge(): Promise<TrainingState> {
    const now = this.dependencies.clock.now();
    const next = beginRecovery(await this.getSnapshot(), now);
    await this.persistState(next);
    return this.getSnapshot();
  }

  async abandonChallenge(): Promise<TrainingState> {
    const now = this.dependencies.clock.now();
    const next = abandonTraining(await this.getSnapshot(), now);
    await this.clearProgressRows(next.profile.id);
    await this.persistState(next);
    return this.getSnapshot();
  }

  async updateProfile(input: UpdateProfileInput): Promise<TrainingState> {
    const parsedInput = UpdateProfileInputSchema.parse(input);
    const now = this.dependencies.clock.now();
    const next = await this.getSnapshot();
    const previousContract = next.profile.contract;
    const previousTimezone = next.profile.timezone;
    next.profile = UserProfileSchema.parse({ ...next.profile, ...parsedInput });
    if (
      (next.profile.contract !== previousContract || next.profile.timezone !== previousTimezone) &&
      Object.values(next.assignments).every((assignment) => assignment.status === "assigned")
    ) {
      next.assignments = Object.fromEntries(
        this.assignmentsFor(next.profile.contract, next.quests, now, next.profile.timezone).map((assignment) => [
          assignment.id,
          assignment,
        ]),
      );
    }
    await this.persistState(next);
    return this.getSnapshot();
  }

  async startQuest(assignmentId: string): Promise<TrainingState> {
    const parsedAssignmentId = AssignmentIdInputSchema.parse(assignmentId);
    const now = this.dependencies.clock.now();
    const state = await this.getSnapshot();
    const assignment = state.assignments[parsedAssignmentId];
    if (!assignment) throw new Error(`Unknown assignment: ${parsedAssignmentId}`);
    assignment.status = transitionAssignment(assignment.status, "in_progress");
    assignment.startedAt ??= now;
    await this.update(
      "quest_assignments",
      { status: assignment.status, started_at: assignment.startedAt, updated_at: now },
      "id",
      assignment.id,
    );
    return this.getSnapshot();
  }

  private async submitQuestInternal(
    input: SubmitQuestInput,
    adjudication?: PolicyGatedSubmissionAdjudication,
    diagnostics: AgentRunDiagnostic[] = [],
  ): Promise<SubmissionOutcome> {
    const now = this.dependencies.clock.now();
    const current = await this.getSnapshot();
    const outcome = executeSubmitQuest(current, input, {
      now,
      ids: this.dependencies.ids,
      adjudication,
    });
    const submittedQuest = outcome.state.quests[
      outcome.state.assignments[input.assignmentId].questId
    ];
    if (submittedQuest.purpose === "calibration") {
      outcome.state.progress.skills = calibrateSkills(
        outcome.state.progress.skills,
        outcome.evaluation,
      );
      const hasTrainingAssignment = Object.values(outcome.state.assignments).some(
        (assignment) => outcome.state.quests[assignment.questId].purpose === "training",
      );
      const selected = hasTrainingAssignment ? undefined : selectHardestFeasibleQuest({
        quests: Object.values(outcome.state.quests).filter(
          (quest) => quest.purpose === "training",
        ),
        skills: outcome.state.progress.skills,
        availableMinutes: outcome.state.profile.dailyMinutes,
        resources: outcome.state.resources,
        excludedQuestIds: Object.values(outcome.state.assignments).map(
          (assignment) => assignment.questId,
        ),
      });
      if (selected) {
        const assignmentId = this.dependencies.ids.next("assignment");
        outcome.state.assignments[assignmentId] = {
          id: assignmentId,
          questId: selected.id,
          assignedDate: localDateForInstant(now, outcome.state.profile.timezone),
          slot: "primary",
          status: "assigned",
          assignedAt: now,
        };
      }
    }
    if (diagnostics.length > 0) {
      await this.persistSubmissionOutcome(outcome, diagnostics);
    } else {
      await this.persistState(outcome.state);
    }
    const state = await this.getSnapshot();
    return {
      ...outcome,
      state,
      submission: state.submissions[outcome.submission.id],
    };
  }

  async submitQuest(input: SubmitQuestInput): Promise<SubmissionOutcome> {
    if (this.dependencies.submissionClient) {
      return this.dependencies.submissionClient.submit(input);
    }
    return this.submitQuestInternal(input);
  }

  async submitQuestWithAdjudication(
    input: SubmitQuestInput,
    adjudication: PolicyGatedSubmissionAdjudication,
    diagnostics: AgentRunDiagnostic[],
  ): Promise<SubmissionOutcome> {
    return this.submitQuestInternal(input, adjudication, diagnostics);
  }

  async persistSubmissionOutcome(
    outcome: SubmissionOutcome,
    diagnostics: AgentRunDiagnostic[],
  ): Promise<void> {
    const authenticatedUserId = await this.userId();
    if (outcome.state.profile.id !== authenticatedUserId) {
      throw new Error("Submission outcome does not belong to the authenticated user");
    }
    if (!outcome.state.submissions[outcome.submission.id]) {
      throw new Error("Submission outcome is missing its persisted submission");
    }

    await this.persistState(outcome.state);
    if (diagnostics.length === 0) return;

    const completedAt = this.dependencies.clock.now();
    await this.upsert(
      "agent_runs",
      diagnostics.map((diagnostic) => ({
        id: this.dependencies.ids.next("agent-run"),
        user_id: authenticatedUserId,
        submission_id: outcome.submission.id,
        agent_type: diagnostic.agentType,
        status: diagnostic.status,
        summary:
          diagnostic.status === "completed"
            ? "Structured agent output validated."
            : `Agent degraded: ${diagnostic.errorCode ?? "unknown_error"}.`,
        input: diagnostic.inputSummary,
        output: diagnostic.outputSummary,
        is_mock: false,
        model: diagnostic.model,
        prompt_version: diagnostic.promptVersion,
        latency_ms: diagnostic.latencyMs,
        input_tokens: diagnostic.inputTokens,
        output_tokens: diagnostic.outputTokens,
        error_code: diagnostic.errorCode,
        fallback_used: diagnostic.fallbackUsed,
        trace_id: diagnostic.traceId,
        completed_at: completedAt,
        created_at: completedAt,
      })),
      { onConflict: "user_id,submission_id,agent_type,prompt_version" },
    );
  }

  async resetDemo(): Promise<TrainingState> {
    const userId = await this.userId();
    await this.deleteOwn("portfolio_artifacts", userId);
    await this.deleteOwn("feedback", userId);
    await this.deleteOwn("submissions", userId);
    await this.deleteOwn("quest_assignments", userId);
    await this.deleteOwn("skill_stats", userId);
    await this.deleteOwn("user_progress", userId);
    await this.deleteOwn("agent_runs", userId);
    await this.deleteOwn("profiles", userId);
    return this.getSnapshot();
  }
}
