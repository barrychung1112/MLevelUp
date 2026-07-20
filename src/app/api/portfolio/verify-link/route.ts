import { z, ZodError } from "zod";

import {
  ServerSupabaseAuthenticationError,
  ServerSupabaseConfigurationError,
  createAuthenticatedSupabaseClient,
} from "@/lib/supabase/server";
import {
  createServerSupabaseAdminClient,
  readServerSupabaseAdminConfig,
} from "@/lib/supabase/server-admin";
import { createGitHubVerifier } from "@/portfolio-verification/github-verifier";
import { createBoundedJsonHttpTransport } from "@/portfolio-verification/http-transport";
import { createKaggleVerifier } from "@/portfolio-verification/kaggle-verifier";
import { SupabaseArtifactLinkVerificationRepository } from "@/portfolio-verification/supabase-verification-repository";
import {
  verifyArtifactLink,
  type VerifyArtifactLinkResult,
} from "@/portfolio-verification/verify-artifact-link";

const MAX_BODY_BYTES = 4 * 1024;
const VerifyLinkInputSchema = z.strictObject({
  artifactId: z.string().uuid(),
});

type VerificationContext = {
  userId: string;
  repository: SupabaseArtifactLinkVerificationRepository;
};

type VerifyRouteDependencies = {
  authenticate(token: string): Promise<unknown>;
  verify(
    context: unknown,
    input: { artifactId: string },
  ): Promise<VerifyArtifactLinkResult>;
};

export class VerificationConfigurationError extends Error {}

function json(status: number, body: unknown): Response {
  return Response.json(body, { status });
}

export function createVerifyPortfolioLinkHandler(
  dependencies: VerifyRouteDependencies,
) {
  return async function verifyPortfolioLinkHandler(
    request: Request,
  ): Promise<Response> {
    const authorization = request.headers.get("authorization");
    const match = authorization?.match(/^Bearer\s+(.+)$/iu);
    if (!match) return json(401, { error: "Authentication required" });

    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
      return json(413, { error: "Request body is too large" });
    }

    try {
      const context = await dependencies.authenticate(match[1]);
      const input = VerifyLinkInputSchema.parse(JSON.parse(text));
      const result = await dependencies.verify(context, input);
      if (!result.ok) {
        return json(404, {
          error: "Artifact not found",
          code: "artifact_not_found",
        });
      }
      if (result.verification.status === "error") {
        return json(502, {
          error: "Link provider is temporarily unavailable",
          code: result.verification.errorCode ?? "provider_error",
        });
      }
      return json(200, { verification: result.verification });
    } catch (error) {
      if (error instanceof ServerSupabaseAuthenticationError) {
        return json(401, { error: "Authentication failed" });
      }
      if (error instanceof SyntaxError || error instanceof ZodError) {
        return json(400, { error: "Invalid verification payload" });
      }
      if (
        error instanceof VerificationConfigurationError ||
        error instanceof ServerSupabaseConfigurationError
      ) {
        return json(503, { error: "Link verification is not configured" });
      }
      return json(503, { error: "Link verification is unavailable" });
    }
  };
}

async function authenticate(accessToken: string): Promise<VerificationContext> {
  const authenticated = await createAuthenticatedSupabaseClient(accessToken);
  const { data } = await authenticated.auth.getUser();
  if (!data.user) throw new ServerSupabaseAuthenticationError();
  if (!readServerSupabaseAdminConfig()) {
    throw new VerificationConfigurationError();
  }

  return {
    userId: data.user.id,
    repository: new SupabaseArtifactLinkVerificationRepository(
      createServerSupabaseAdminClient(),
    ),
  };
}

async function verify(
  context: unknown,
  input: { artifactId: string },
): Promise<VerifyArtifactLinkResult> {
  const verificationContext = context as VerificationContext;
  return verifyArtifactLink(
    {
      repository: verificationContext.repository,
      githubVerifier: createGitHubVerifier({
        transport: createBoundedJsonHttpTransport(),
        token: process.env.GITHUB_TOKEN,
      }),
      kaggleVerifier: createKaggleVerifier(),
    },
    { userId: verificationContext.userId, artifactId: input.artifactId },
  );
}

export const POST = createVerifyPortfolioLinkHandler({ authenticate, verify });
