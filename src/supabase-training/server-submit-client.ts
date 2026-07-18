import { z } from "zod";

import type {
  SubmissionOutcome,
  SubmitQuestInput,
} from "@/application/training/training-repository";
import {
  SubmissionEvaluationSchema,
  SubmissionSchema,
  TrainingStateSchema,
} from "@/domain/training/schemas";

const SubmissionOutcomeSchema = z.strictObject({
  state: TrainingStateSchema,
  submission: SubmissionSchema,
  evaluation: SubmissionEvaluationSchema,
});

interface SessionClient {
  auth: {
    getSession(): Promise<{
      data: { session: { access_token: string } | null };
      error: { message: string } | null;
    }>;
  };
}

export interface ServerSubmissionClient {
  submit(input: SubmitQuestInput): Promise<SubmissionOutcome>;
}

export class ServerSubmitError extends Error {
  constructor(
    public readonly code: string,
    public readonly retryable: boolean,
  ) {
    super(`Server submission failed: ${code}`);
    this.name = "ServerSubmitError";
  }
}

function responseError(status: number): ServerSubmitError {
  if (status === 401) return new ServerSubmitError("session_expired", false);
  if (status === 404) return new ServerSubmitError("assignment_not_found", false);
  if (status === 400 || status === 413) {
    return new ServerSubmitError("invalid_submission", false);
  }
  return new ServerSubmitError("service_unavailable", true);
}

export function createServerSubmitClient(
  client: SessionClient,
  fetcher: typeof fetch = fetch,
): ServerSubmissionClient {
  return {
    async submit(input) {
      const { data, error } = await client.auth.getSession();
      const accessToken = data.session?.access_token;
      if (error || !accessToken) {
        throw new ServerSubmitError("session_required", false);
      }

      let response: Response;
      try {
        response = await fetcher("/api/training/submit", {
          method: "POST",
          headers: {
            authorization: `Bearer ${accessToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify(input),
        });
      } catch {
        throw new ServerSubmitError("network_error", true);
      }
      if (!response.ok) throw responseError(response.status);

      try {
        return SubmissionOutcomeSchema.parse(await response.json());
      } catch {
        throw new ServerSubmitError("invalid_response", true);
      }
    },
  };
}
