import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { ZodType } from "zod";

import type { AiConfig } from "./config";

export interface StructuredResponseRequest<T> {
  model: string;
  schemaName: string;
  schema: ZodType<T>;
  instructions: string;
  input: unknown;
  timeoutMs?: number;
  maxAttempts?: 1 | 2;
}

export interface StructuredResponseResult<T> {
  data: T;
  responseId: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
}

export interface StructuredResponseGateway {
  generate<T>(
    request: StructuredResponseRequest<T>,
  ): Promise<StructuredResponseResult<T>>;
}

interface OpenAiParsedResponse {
  id: string;
  model: string;
  output_parsed: unknown;
  output: Array<{
    type?: string;
    content?: Array<{ type?: string; refusal?: string }>;
  }>;
  usage: { input_tokens?: number; output_tokens?: number } | null;
}

export interface OpenAiResponsesClient {
  responses: {
    parse(
      body: unknown,
      options?: { signal?: AbortSignal },
    ): Promise<OpenAiParsedResponse>;
  };
}

export class StructuredResponseError extends Error {
  constructor(
    public readonly code: string,
    public readonly retryable: boolean,
  ) {
    super(`Structured response failed: ${code}`);
    this.name = "StructuredResponseError";
  }
}

function refusalIn(response: OpenAiParsedResponse): boolean {
  return response.output.some((item) =>
    item.content?.some((content) => content.type === "refusal"),
  );
}

function classifyError(error: unknown): StructuredResponseError {
  if (error instanceof StructuredResponseError) return error;
  if (error instanceof Error && error.name === "AbortError") {
    return new StructuredResponseError("timeout", true);
  }
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? Number(error.status)
      : null;
  if (status === 429) return new StructuredResponseError("rate_limited", true);
  if (status !== null && status >= 500) {
    return new StructuredResponseError("upstream_unavailable", true);
  }
  return new StructuredResponseError("openai_request_failed", false);
}

async function withTimeout<T>(
  work: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work(controller.signal),
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => {
          controller.abort();
          reject(new DOMException("Request timed out", "AbortError"));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export class OpenAiStructuredResponseGateway
  implements StructuredResponseGateway
{
  constructor(private readonly client: OpenAiResponsesClient) {}

  async generate<T>(
    request: StructuredResponseRequest<T>,
  ): Promise<StructuredResponseResult<T>> {
    let lastError: StructuredResponseError | null = null;
    const maxAttempts = request.maxAttempts ?? 2;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        const response = await withTimeout(
          (signal) =>
            this.client.responses.parse(
              {
                model: request.model,
                instructions: request.instructions,
                input: JSON.stringify(request.input),
                max_output_tokens: 1_200,
                text: {
                  format: zodTextFormat(request.schema, request.schemaName),
                },
              },
              { signal },
            ),
          request.timeoutMs ?? 15_000,
        );
        if (refusalIn(response)) {
          throw new StructuredResponseError("model_refusal", false);
        }
        if (response.output_parsed === null) {
          throw new StructuredResponseError("empty_output", false);
        }
        const parsed = request.schema.safeParse(response.output_parsed);
        if (!parsed.success) {
          throw new StructuredResponseError("invalid_structured_output", false);
        }
        return {
          data: parsed.data,
          responseId: response.id,
          model: response.model || request.model,
          inputTokens: response.usage?.input_tokens ?? null,
          outputTokens: response.usage?.output_tokens ?? null,
        };
      } catch (error) {
        lastError = classifyError(error);
        if (!lastError.retryable || attempt === maxAttempts - 1) throw lastError;
      }
    }
    throw lastError ?? new StructuredResponseError("openai_request_failed", false);
  }
}

export function createOpenAiGateway(config: AiConfig): StructuredResponseGateway {
  const client = new OpenAI({ apiKey: config.apiKey });
  const adapter: OpenAiResponsesClient = {
    responses: {
      parse: (body, options) =>
        client.responses.parse(
          body as Parameters<typeof client.responses.parse>[0],
          options,
        ) as unknown as Promise<OpenAiParsedResponse>,
    },
  };
  return new OpenAiStructuredResponseGateway(adapter);
}
