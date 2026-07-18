import { randomUUID } from "node:crypto";
import { ZodError } from "zod";

import { readAiConfig } from "@/ai/config";
import { createOpenAiGateway, type StructuredResponseGateway } from "@/ai/openai-gateway";
import { runFeedbackWorkflow } from "@/ai/run-feedback-workflow";
import {
  SubmissionAssignmentNotFoundError,
  submitWithFeedback,
  type AiSubmissionRepository,
} from "@/application/training/submit-with-feedback";
import type { SubmissionOutcome, SubmitQuestInput } from "@/application/training/training-repository";
import { SubmitQuestInputSchema } from "@/domain/training/schemas";
import {
  ServerSupabaseAuthenticationError,
  ServerSupabaseConfigurationError,
  createAuthenticatedSupabaseClient,
} from "@/lib/supabase/server";
import { SupabaseTrainingRepository } from "@/supabase-training/supabase-training-repository";

const MAX_BODY_BYTES = 64 * 1024;

export class ServerAuthenticationError extends Error {}

interface SubmitRouteDependencies {
  authenticate(token: string): Promise<unknown>;
  submit(context: unknown, input: SubmitQuestInput): Promise<SubmissionOutcome>;
}

function json(status: number, body: unknown): Response {
  return Response.json(body, { status });
}

export function createSubmitQuestHandler(dependencies: SubmitRouteDependencies) {
  return async function submitQuestHandler(request: Request): Promise<Response> {
    const authorization = request.headers.get("authorization");
    const match = authorization?.match(/^Bearer\s+(.+)$/i);
    if (!match) return json(401, { error: "Authentication required" });

    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
      return json(413, { error: "Request body is too large" });
    }

    try {
      const context = await dependencies.authenticate(match[1]);
      const input = SubmitQuestInputSchema.parse(JSON.parse(text));
      const outcome = await dependencies.submit(context, input);
      return json(200, outcome);
    } catch (error) {
      if (
        error instanceof ServerAuthenticationError ||
        error instanceof ServerSupabaseAuthenticationError
      ) return json(401, { error: "Authentication failed" });
      if (error instanceof SubmissionAssignmentNotFoundError) {
        return json(404, { error: "Assignment not found" });
      }
      if (error instanceof SyntaxError || error instanceof ZodError) {
        return json(400, { error: "Invalid submission payload" });
      }
      if (error instanceof ServerSupabaseConfigurationError) {
        return json(503, { error: "Training service is not configured" });
      }
      return json(503, { error: "Submission could not be persisted" });
    }
  };
}

async function authenticate(accessToken: string): Promise<AiSubmissionRepository> {
  try {
    const client = await createAuthenticatedSupabaseClient(accessToken);
    return new SupabaseTrainingRepository({
      client: client as never,
      clock: { now: () => new Date().toISOString() },
      ids: { next: () => randomUUID() },
    });
  } catch (error) {
    if (error instanceof ServerSupabaseAuthenticationError) {
      throw new ServerAuthenticationError();
    }
    throw error;
  }
}

async function submit(
  context: unknown,
  input: SubmitQuestInput,
): Promise<SubmissionOutcome> {
  const repository = context as AiSubmissionRepository;
  const config = readAiConfig();
  const unavailableGateway: StructuredResponseGateway = {
    generate: async () => {
      throw new Error("OpenAI gateway is unavailable");
    },
  };
  const gateway = config ? createOpenAiGateway(config) : unavailableGateway;
  return submitWithFeedback(input, {
    repository,
    workflow: (agentContext) =>
      runFeedbackWorkflow({
        config,
        gateway,
        context: agentContext,
        traceId: randomUUID(),
      }),
  });
}

export const POST = createSubmitQuestHandler({ authenticate, submit });
