import { z } from "zod";

import type { ParsedPlatformUrl } from "./contracts";
import type { JsonHttpResult, JsonHttpTransport } from "./http-transport";

type GitHubUrl = Extract<ParsedPlatformUrl, { provider: "github" }>;

type GitHubVerificationResult =
  | { status: "verified"; metadata: Record<string, unknown> }
  | { status: "unavailable"; errorCode: string }
  | { status: "error"; errorCode: string; retryable: true };

export type GitHubVerifier = {
  verify(url: GitHubUrl): Promise<GitHubVerificationResult>;
};

const RepositoryResponseSchema = z.object({
  full_name: z.string().min(1).max(240),
  description: z.string().max(500).nullable(),
  default_branch: z.string().min(1).max(240),
  language: z.string().max(120).nullable(),
  topics: z.array(z.string().max(80)).max(50),
  visibility: z.enum(["public", "private"]),
  archived: z.boolean(),
  pushed_at: z.string().min(1).max(80),
});

const CommitResponseSchema = z.object({
  sha: z.string().regex(/^[A-Fa-f0-9]{7,64}$/u),
  commit: z.object({
    message: z.string().min(1).max(100_000),
    author: z.object({
      date: z.string().min(1).max(80),
    }),
    verification: z.object({
      verified: z.boolean(),
    }),
  }),
  author: z.object({ login: z.string().min(1).max(100) }).nullable().optional(),
});

function mapTransportFailure(result: Exclude<JsonHttpResult, { kind: "response" }>) {
  switch (result.kind) {
    case "timeout":
      return {
        status: "error" as const,
        errorCode: "github_timeout",
        retryable: true as const,
      };
    case "redirect":
      return {
        status: "error" as const,
        errorCode: "github_unexpected_redirect",
        retryable: true as const,
      };
    case "invalid_json":
    case "too_large":
      return {
        status: "error" as const,
        errorCode: "github_invalid_response",
        retryable: true as const,
      };
    case "network_error":
      return {
        status: "error" as const,
        errorCode: "github_upstream_error",
        retryable: true as const,
      };
  }
}

function mapStatus(status: number): GitHubVerificationResult | null {
  if (status === 404) {
    return { status: "unavailable", errorCode: "github_not_found" };
  }
  if (status === 403 || status === 429) {
    return {
      status: "error",
      errorCode: "github_rate_limited",
      retryable: true,
    };
  }
  if (status !== 200) {
    return {
      status: "error",
      errorCode: "github_upstream_error",
      retryable: true,
    };
  }
  return null;
}

export function createGitHubVerifier(options: {
  transport: JsonHttpTransport;
  token?: string;
}): GitHubVerifier {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "MLevelUp-Link-Verifier",
  };
  const token = options.token?.trim();
  if (token) headers.Authorization = `Bearer ${token}`;

  return {
    async verify(url) {
      const { owner, repo } = url.request;
      const endpoint =
        url.resourceType === "repository"
          ? `https://api.github.com/repos/${owner}/${repo}`
          : `https://api.github.com/repos/${owner}/${repo}/commits/${url.request.sha}`;
      const response = await options.transport.request({ url: endpoint, headers });

      if (response.kind !== "response") {
        return mapTransportFailure(response);
      }

      const statusResult = mapStatus(response.status);
      if (statusResult) return statusResult;

      if (url.resourceType === "repository") {
        const parsed = RepositoryResponseSchema.safeParse(response.body);
        if (!parsed.success) {
          return {
            status: "error",
            errorCode: "github_invalid_response",
            retryable: true,
          };
        }
        if (parsed.data.visibility !== "public") {
          return {
            status: "unavailable",
            errorCode: "github_not_public",
          };
        }

        return {
          status: "verified",
          metadata: {
            fullName: parsed.data.full_name,
            description: parsed.data.description,
            defaultBranch: parsed.data.default_branch,
            primaryLanguage: parsed.data.language,
            topics: parsed.data.topics,
            visibility: parsed.data.visibility,
            archived: parsed.data.archived,
            pushedAt: parsed.data.pushed_at,
          },
        };
      }

      const parsed = CommitResponseSchema.safeParse(response.body);
      if (!parsed.success) {
        return {
          status: "error",
          errorCode: "github_invalid_response",
          retryable: true,
        };
      }

      return {
        status: "verified",
        metadata: {
          repositoryFullName: `${owner}/${repo}`,
          sha: parsed.data.sha,
          committedAt: parsed.data.commit.author.date,
          authorLogin: parsed.data.author?.login ?? null,
          messageSubject: parsed.data.commit.message.split(/\r?\n/u, 1)[0],
          signatureVerified: parsed.data.commit.verification.verified,
        },
      };
    },
  };
}
