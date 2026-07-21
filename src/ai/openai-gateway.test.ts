import { z } from "zod";
import { describe, expect, it, vi } from "vitest";

import {
  OpenAiStructuredResponseGateway,
  StructuredResponseError,
  type OpenAiResponsesClient,
} from "./openai-gateway";

const ResultSchema = z.strictObject({ result: z.string() });

function request() {
  return {
    model: "gpt-5.6-terra",
    schemaName: "test_result",
    schema: ResultSchema,
    instructions: "Return a bounded result.",
    input: { value: 1 },
    timeoutMs: 1_000,
  };
}

describe("OpenAiStructuredResponseGateway", () => {
  it("returns parsed structured output and usage metadata", async () => {
    const parse = vi.fn().mockResolvedValue({
      id: "response-1",
      model: "gpt-5.6-terra",
      output_parsed: { result: "ok" },
      output: [],
      usage: { input_tokens: 20, output_tokens: 8 },
    });
    const gateway = new OpenAiStructuredResponseGateway({ responses: { parse } });

    const result = await gateway.generate(request());

    expect(result).toEqual({
      data: { result: "ok" },
      responseId: "response-1",
      model: "gpt-5.6-terra",
      inputTokens: 20,
      outputTokens: 8,
    });
    expect(parse).toHaveBeenCalledTimes(1);
    expect(parse.mock.calls[0][0]).toMatchObject({
      model: "gpt-5.6-terra",
      instructions: "Return a bounded result.",
    });
  });

  it("classifies empty structured output", async () => {
    const client: OpenAiResponsesClient = {
      responses: {
        parse: vi.fn().mockResolvedValue({
          id: "response-empty",
          model: "gpt-5.6-terra",
          output_parsed: null,
          output: [],
          usage: null,
        }),
      },
    };
    const gateway = new OpenAiStructuredResponseGateway(client);

    await expect(gateway.generate(request())).rejects.toMatchObject({
      code: "empty_output",
      retryable: false,
    });
  });

  it("classifies explicit model refusal", async () => {
    const client: OpenAiResponsesClient = {
      responses: {
        parse: vi.fn().mockResolvedValue({
          id: "response-refusal",
          model: "gpt-5.6-terra",
          output_parsed: null,
          output: [{ type: "message", content: [{ type: "refusal", refusal: "No." }] }],
          usage: null,
        }),
      },
    };

    await expect(
      new OpenAiStructuredResponseGateway(client).generate(request()),
    ).rejects.toMatchObject({ code: "model_refusal", retryable: false });
  });

  it("retries a 429 once and then succeeds", async () => {
    const rateLimit = Object.assign(new Error("rate limit"), { status: 429 });
    const parse = vi
      .fn()
      .mockRejectedValueOnce(rateLimit)
      .mockResolvedValueOnce({
        id: "response-2",
        model: "gpt-5.6-terra",
        output_parsed: { result: "ok" },
        output: [],
        usage: { input_tokens: 10, output_tokens: 4 },
      });
    const gateway = new OpenAiStructuredResponseGateway({ responses: { parse } });

    await expect(gateway.generate(request())).resolves.toMatchObject({
      data: { result: "ok" },
    });
    expect(parse).toHaveBeenCalledTimes(2);
  });

  it("sanitizes retryable upstream errors after one retry", async () => {
    const parse = vi.fn().mockRejectedValue(
      Object.assign(new Error("secret upstream detail"), { status: 503 }),
    );
    const gateway = new OpenAiStructuredResponseGateway({ responses: { parse } });

    const error = await gateway.generate(request()).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(StructuredResponseError);
    expect(error).toMatchObject({ code: "upstream_unavailable", retryable: true });
    expect((error as Error).message).not.toContain("secret upstream detail");
    expect(parse).toHaveBeenCalledTimes(2);
  });

  it("supports a single-attempt request for scheduled generation", async () => {
    const parse = vi.fn().mockRejectedValue(
      Object.assign(new Error("rate limit"), { status: 429 }),
    );
    const gateway = new OpenAiStructuredResponseGateway({ responses: { parse } });

    await expect(gateway.generate({ ...request(), maxAttempts: 1 })).rejects.toMatchObject({
      code: "rate_limited",
    });
    expect(parse).toHaveBeenCalledTimes(1);
  });
});
