import { randomUUID } from "node:crypto";

import { generateDailyTraining } from "@/application/training/generate-daily-training";
import { localDateForInstant } from "@/domain/training/calendar";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server-admin";
import { SupabaseTrainingRepository } from "@/supabase-training/supabase-training-repository";

export interface DailyTrainingRunSummary {
  processed: number;
  assigned: number;
  skipped: number;
  failures: number;
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
  const now = new Date().toISOString();
  const summary: DailyTrainingRunSummary = { processed: 0, assigned: 0, skipped: 0, failures: 0 };
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
      };
      const repository = new SupabaseTrainingRepository({
        client: scopedClient as never,
        clock: { now: () => now },
        ids: { next: () => randomUUID() },
      });
      const state = await repository.getSnapshot();
      const outcome = generateDailyTraining({
        state, now, localDate: localDateForInstant(now, state.profile.timezone), nextId: randomUUID,
      });
      if (!outcome.createdAssignment) {
        summary.skipped += 1;
        continue;
      }
      const assignment = outcome.createdAssignment;
      const { error: insertError } = await client.from("quest_assignments").insert({
        id: assignment.id, user_id: userId, quest_id: assignment.questId, assigned_date: assignment.assignedDate,
        slot: assignment.slot, status: assignment.status, assigned_at: assignment.assignedAt, updated_at: now,
      });
      if (insertError) throw new Error(insertError.message);
      summary.assigned += 1;
    } catch {
      summary.failures += 1;
    }
    }
    if (learners.length < pageSize) break;
    offset += pageSize;
  }
  return summary;
}

export const POST = createDailyTrainingHandler({ cronSecret: process.env.CRON_SECRET ?? "", run: runLiveDailyTraining });
