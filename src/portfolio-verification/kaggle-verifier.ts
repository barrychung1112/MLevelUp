import { z } from "zod";

import type { ParsedPlatformUrl } from "./contracts";

type KaggleUrl = Extract<ParsedPlatformUrl, { provider: "kaggle" }>;

export type KaggleMetadataResult =
  | { kind: "found"; metadata: unknown }
  | { kind: "not_found" }
  | { kind: "authentication_required" }
  | { kind: "rate_limited" }
  | { kind: "timeout" }
  | { kind: "redirect" }
  | { kind: "invalid_response" };

export type KaggleMetadataClient = {
  getNotebook(input: {
    owner: string;
    notebook: string;
  }): Promise<KaggleMetadataResult>;
  getCompetition(input: {
    competition: string;
  }): Promise<KaggleMetadataResult>;
};

type KaggleVerificationResult =
  | { status: "verified"; metadata: Record<string, unknown> }
  | { status: "unavailable" | "unsupported"; errorCode: string }
  | { status: "error"; errorCode: string; retryable: true };

export type KaggleVerifier = {
  verify(url: KaggleUrl): Promise<KaggleVerificationResult>;
};

const NotebookMetadataSchema = z.object({
  ref: z.string().min(3).max(240),
  title: z.string().min(1).max(300),
  lastUpdated: z.string().min(1).max(80),
  isPublic: z.boolean(),
});

const CompetitionMetadataSchema = z.object({
  ref: z.string().min(1).max(120),
  title: z.string().min(1).max(300),
  category: z.string().min(1).max(120).nullable().optional(),
  deadline: z.string().min(1).max(80).nullable().optional(),
  isPublic: z.boolean(),
});

function mapFailure(
  result: Exclude<KaggleMetadataResult, { kind: "found" }>,
): KaggleVerificationResult {
  switch (result.kind) {
    case "not_found":
      return { status: "unavailable", errorCode: "kaggle_not_found" };
    case "authentication_required":
      return {
        status: "unsupported",
        errorCode: "provider_metadata_unsupported",
      };
    case "rate_limited":
      return {
        status: "error",
        errorCode: "kaggle_rate_limited",
        retryable: true,
      };
    case "timeout":
      return {
        status: "error",
        errorCode: "kaggle_timeout",
        retryable: true,
      };
    case "redirect":
      return {
        status: "error",
        errorCode: "kaggle_unexpected_redirect",
        retryable: true,
      };
    case "invalid_response":
      return {
        status: "error",
        errorCode: "kaggle_invalid_response",
        retryable: true,
      };
  }
}

export function createKaggleVerifier(options?: {
  client?: KaggleMetadataClient;
}): KaggleVerifier {
  return {
    async verify(url) {
      if (!options?.client) {
        return {
          status: "unsupported",
          errorCode: "provider_metadata_unsupported",
        };
      }

      const response =
        url.resourceType === "notebook"
          ? await options.client.getNotebook(url.request)
          : await options.client.getCompetition(url.request);

      if (response.kind !== "found") return mapFailure(response);

      if (url.resourceType === "notebook") {
        const parsed = NotebookMetadataSchema.safeParse(response.metadata);
        if (!parsed.success) {
          return {
            status: "error",
            errorCode: "kaggle_invalid_response",
            retryable: true,
          };
        }
        if (!parsed.data.isPublic) {
          return { status: "unavailable", errorCode: "kaggle_not_public" };
        }

        const [ownerReference, notebookSlug] = parsed.data.ref.split("/", 2);
        if (
          ownerReference !== url.request.owner ||
          notebookSlug !== url.request.notebook
        ) {
          return {
            status: "error",
            errorCode: "kaggle_invalid_response",
            retryable: true,
          };
        }

        return {
          status: "verified",
          metadata: {
            ownerReference,
            notebookSlug,
            title: parsed.data.title,
            lastUpdatedAt: parsed.data.lastUpdated,
            public: true,
          },
        };
      }

      const parsed = CompetitionMetadataSchema.safeParse(response.metadata);
      if (!parsed.success || parsed.data.ref !== url.request.competition) {
        return {
          status: "error",
          errorCode: "kaggle_invalid_response",
          retryable: true,
        };
      }
      if (!parsed.data.isPublic) {
        return { status: "unavailable", errorCode: "kaggle_not_public" };
      }

      return {
        status: "verified",
        metadata: {
          competitionSlug: parsed.data.ref,
          title: parsed.data.title,
          category: parsed.data.category ?? null,
          deadline: parsed.data.deadline ?? null,
          public: true,
        },
      };
    },
  };
}
