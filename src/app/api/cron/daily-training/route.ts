import { randomUUID } from "node:crypto";

import type { DailyQuestGeneratorResult } from "@/ai/run-daily-quest-generator";
import { runDailyQuestGenerator } from "@/ai/run-daily-quest-generator";
import type { DailyQuestGenerationContext } from "@/ai/daily-quest-context";
import type { AgentRunDiagnostic } from "@/ai/contracts";
import { readDailyQuestAiConfig } from "@/ai/config";
import { createOpenAiGateway, type StructuredResponseGateway } from "@/ai/openai-gateway";
import { generateAiDailyTraining } from "@/application/training/generate-ai-daily-training";
import { localDateForInstant } from "@/domain/training/calendar";
import type { Quest, QuestAssignment, TrainingState } from "@/domain/training/types";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server-admin";
import {
  createGeneratedQuestWriter,
  GeneratedQuestPersistenceError,
} from "@/supabase-training/generated-quest-writer";
import { SupabaseTrainingRepository } from "@/supabase-training/supabase-training-repository";

export interface DailyTrainingRunSummary {
  processed: number;
  assigned: number;
  aiGenerated: number;
  catalogFallback: number;
  degraded: number;
  skipped: number;
  failures: number;
}

interface ProcessDailyTrainingLearnerInput {
  userId: string;
  state: TrainingState;
  now: string;
  localDate: string;
  nextId: () => string;
  generator: (context: DailyQuestGenerationContext) => Promise<DailyQuestGeneratorResult>;
  persistGenerated(input: { quest: Quest; assignment: QuestAssignment; diagnostic: AgentRunDiagnostic }): Promise<void>;
  persistCatalog(assignment: QuestAssignment): Promise<void>;
  persistDiagnostic(diagnostic: AgentRunDiagnostic): Promise<void>;
}

export async function processDailyTrainingLearner(
  input: ProcessDailyTrainingLearnerInput,
): Promise<{ status: "ai_generated" | "catalog_fallback" | "skipped"; degraded: boolean }> {
  const outcome = await generateAiDailyTraining({
    state: input.state,
    now: input.now,
    localDate: input.localDate,
    nextId: input.nextId,
    generator: input.generator,
  });
  if (!outcome.createdAssignment) {
    if (outcome.diagnostic) await input.persistDiagnostic(outcome.diagnostic);
    return { status: "skipped", degraded: outcome.diagnostic?.status === "degraded" };
  }
  if (outcome.source === "ai_generated" && outcome.createdQuest && outcome.diagnostic) {
    await input.persistGenerated({
      quest: outcome.createdQuest,
      assignment: outcome.createdAssignment,
      diagnostic: outcome.diagnostic,
    });
    await input.persistDiagnostic(outcome.diagnostic);
  } else {
    await input.persistCatalog(outcome.createdAssignment);
    if (outcome.diagnostic) await input.persistDiagnostic(outcome.diagnostic);
  }
  return {
    status: outcome.source === "ai_generated" ? "ai_generated" : "catalog_fallback",
    degraded: outcome.diagnostic?.status === "degraded",
  };
}

export function createDailyTrainingHandler(dependencies: { cronSecret: string; run: () => Promise<DailyTrainingRunSummary> }) {
  return async function POST(request: Request) {
    if (!dependencies.cronSecret || request.headers.get("authorization") !== `Bearer ${dependencies.cronSecret}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return Response.json(await dependencies.run());
  };
}

async function runLiveDailyTraining(): Promise<DailyTrainingRunSummary> {
  const client = createServerSupabaseAdminClient();
  const aiConfig = readDailyQuestAiConfig();
  const gateway: StructuredResponseGateway = aiConfig
    ? createOpenAiGateway(aiConfig)
    : { generate: async () => { throw new Error("AI is not configured"); } };
  const generatedWriter = createGeneratedQuestWriter(client);
  const now = new Date().toISOString();
  const summary: DailyTrainingRunSummary = {
    processed: 0,
    assigned: 0,
    aiGenerated: 0,
    catalogFallback: 0,
    degraded: 0,
    skipped: 0,
    failures: 0,
  };
  const pageSize = 100;
  let offset = 0;

  while (true) {
    const { data: learners, error } = await client
      .from("profiles")
      .select("user_id")
      .eq("onboarding_completed", true)
      .order("user_id")
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(error.message);
    if (!learners || learners.length === 0) break;

    for (const learner of learners) {
    summary.processed += 1;
    try {
      const userId = learner.user_id as string;
      const scopedClient = {
        auth: { getUser: async () => ({ data: { user: { id: userId } }, error: null }) },
        from: client.from.bind(client),
        rpc: client.rpc.bind(client),
      };
      const repository = new SupabaseTrainingRepository({
        client: scopedClient as never,
        clock: { now: () => now },
        ids: { next: () => randomUUID() },
      });
      const state = await repository.getSnapshot();
      const localDate = localDateForInstant(now, state.profile.timezone);
      const persistDiagnostic = async (diagnostic: AgentRunDiagnostic) => {
        const completedAt = new Date().toISOString();
        const { error: diagnosticError } = await client.from("agent_runs").insert({
          id: randomUUID(),
          user_id: userId,
          submission_id: null,
          agent_type: diagnostic.agentType,
          status: diagnostic.status,
          summary: diagnostic.status === "completed"
            ? "AI daily quest generated and validated."
            : `Daily quest generation used catalog fallback: ${diagnostic.errorCode ?? "unknown_error"}.`,
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
        });
        if (diagnosticError) throw new Error("Daily quest diagnostic persistence failed");
      };
      const result = await processDailyTrainingLearner({
        userId,
        state,
        now,
        localDate,
        nextId: randomUUID,
        generator: (context) => runDailyQuestGenerator({
          config: aiConfig,
          gateway,
          context,
          traceId: randomUUID(),
        }),
        persistGenerated: async ({ quest, assignment, diagnostic }) => {
          await generatedWriter.write({
            userId,
            quest,
            assignment,
            generationKey: `daily:${assignment.assignedDate}`,
            model: diagnostic.model,
            promptVersion: diagnostic.promptVersion,
            traceId: diagnostic.traceId,
          });
        },
        persistCatalog: async (assignment) => {
          const { error: insertError } = await client.from("quest_assignments").insert({
            id: assignment.id,
            user_id: userId,
            quest_id: assignment.questId,
            assigned_date: assignment.assignedDate,
            slot: assignment.slot,
            status: assignment.status,
            assigned_at: assignment.assignedAt,
            due_at: assignment.dueAt ?? null,
            updated_at: now,
            generation_key: `daily:${assignment.assignedDate}`,
          });
          if (insertError) throw new GeneratedQuestPersistenceError(insertError.code ?? "database_error");
        },
        persistDiagnostic,
      });
      if (result.degraded) summary.degraded += 1;
      if (result.status === "skipped") {
        summary.skipped += 1;
        continue;
      }
      summary.assigned += 1;
      if (result.status === "ai_generated") summary.aiGenerated += 1;
      else summary.catalogFallback += 1;
    } catch (error) {
      if (error instanceof GeneratedQuestPersistenceError && error.code === "23505") {
        summary.skipped += 1;
        continue;
      }
      summary.failures += 1;
    }
    }
    if (learners.length < pageSize) break;
    offset += pageSize;
  }
  return summary;
}

export const POST = createDailyTrainingHandler({ cronSecret: process.env.CRON_SECRET ?? "", run: runLiveDailyTraining });
export const GET = POST;
