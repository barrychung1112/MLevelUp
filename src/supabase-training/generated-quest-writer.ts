import type { Quest, QuestAssignment } from "@/domain/training/types";

type RpcClient = {
  rpc(name: string, args: Record<string, unknown>): Promise<{
    data: unknown;
    error: { code?: string; message: string } | null;
  }>;
};

export class GeneratedQuestPersistenceError extends Error {
  constructor(public readonly code: string) {
    super(`Generated quest persistence failed (${code})`);
    this.name = "GeneratedQuestPersistenceError";
  }
}

export interface GeneratedQuestWriteInput {
  userId: string;
  quest: Quest;
  assignment: QuestAssignment;
  generationKey: string;
  model: string;
  promptVersion: string;
  traceId: string;
}

export function createGeneratedQuestWriter(client: RpcClient) {
  return {
    async write(input: GeneratedQuestWriteInput): Promise<void> {
      const { error } = await client.rpc("create_generated_daily_quest", {
        p_user_id: input.userId,
        p_quest: input.quest,
        p_assignment_id: input.assignment.id,
        p_assigned_date: input.assignment.assignedDate,
        p_assigned_at: input.assignment.assignedAt,
        p_due_at: input.assignment.dueAt,
        p_generation_key: input.generationKey,
        p_model: input.model,
        p_prompt_version: input.promptVersion,
        p_trace_id: input.traceId,
      });
      if (error) throw new GeneratedQuestPersistenceError(error.code ?? "database_error");
    },
  };
}
