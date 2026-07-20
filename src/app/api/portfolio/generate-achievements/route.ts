import { ZodError, z } from "zod";
import { readAiConfig } from "@/ai/config";
import { createOpenAiGateway, StructuredResponseError } from "@/ai/openai-gateway";
import { ServerSupabaseAuthenticationError, createAuthenticatedSupabaseClient } from "@/lib/supabase/server";
import { createServerSupabaseAdminClient, readServerSupabaseAdminConfig } from "@/lib/supabase/server-admin";
import { generateAchievements } from "@/portfolio-achievements/generate-achievements";
import { SupabaseAchievementRepository } from "@/portfolio-achievements/supabase-achievement-repository";

const InputSchema = z.strictObject({ artifactId: z.string().uuid(), replaceExistingDraft: z.boolean() });
type Dependencies = { authenticate(token: string): Promise<unknown>; generate(context: unknown, input: z.infer<typeof InputSchema>): Promise<Awaited<ReturnType<typeof generateAchievements>>> };

export function createGenerateAchievementsHandler(dependencies: Dependencies) {
  return async (request: Request): Promise<Response> => {
    const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/iu)?.[1];
    if (!token) return Response.json({ error: "Authentication required" }, { status: 401 });
    try {
      const text = await request.text();
      if (new TextEncoder().encode(text).byteLength > 4096) return Response.json({ error: "Request body is too large" }, { status: 413 });
      const context = await dependencies.authenticate(token);
      const input = InputSchema.parse(JSON.parse(text));
      const result = await dependencies.generate(context, input);
      if (!result.ok) {
        const status = result.reason === "artifact_not_found" ? 404 : result.reason === "draft_exists" ? 409 : 422;
        return Response.json({ error: result.reason, code: result.reason }, { status });
      }
      return Response.json({ draft: result.draft });
    } catch (error) {
      if (error instanceof SyntaxError || error instanceof ZodError) return Response.json({ error: "Invalid generation payload" }, { status: 400 });
      if (error instanceof ServerSupabaseAuthenticationError) return Response.json({ error: "Authentication failed" }, { status: 401 });
      if (error instanceof StructuredResponseError) return Response.json({ error: "AI generation unavailable", code: error.code }, { status: 502 });
      return Response.json({ error: "Achievement generation is unavailable" }, { status: 503 });
    }
  };
}

async function authenticate(token: string) {
  const auth = await createAuthenticatedSupabaseClient(token);
  const { data } = await auth.auth.getUser();
  if (!data.user) throw new ServerSupabaseAuthenticationError();
  if (!readServerSupabaseAdminConfig()) throw new Error("Missing admin configuration");
  return { userId: data.user.id, repository: new SupabaseAchievementRepository(createServerSupabaseAdminClient()) };
}

async function generate(context: unknown, input: z.infer<typeof InputSchema>) {
  const config = readAiConfig();
  if (!config) throw new Error("Missing AI configuration");
  const value = context as Awaited<ReturnType<typeof authenticate>>;
  return generateAchievements({ repository: value.repository, gateway: createOpenAiGateway(config), model: config.model, promptVersion: process.env.PORTFOLIO_ACHIEVEMENTS_PROMPT_VERSION?.trim() || "phase5-4-v1" }, { userId: value.userId, ...input });
}

export const POST = createGenerateAchievementsHandler({ authenticate, generate });
