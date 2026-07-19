import { describe, expect, test, vi } from "vitest";

import { checkResourceAvailability } from "./check-availability";

describe("checkResourceAvailability", () => {
  test.each([200, 204, 301, 399])("classifies HTTP %i as available", async (status) => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status }));

    await expect(checkResourceAvailability("https://example.com/resource", fetcher))
      .resolves.toEqual({ status: "available" });
  });

  test.each([404, 410])("classifies HTTP %i as unavailable", async (status) => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status }));

    await expect(checkResourceAvailability("https://example.com/resource", fetcher))
      .resolves.toEqual({ status: "unavailable" });
  });

  test.each([405, 501])("retries HTTP %i with a minimal GET", async (status) => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));

    await expect(checkResourceAvailability("https://example.com/resource", fetcher))
      .resolves.toEqual({ status: "available" });
    expect(fetcher).toHaveBeenNthCalledWith(1, "https://example.com/resource", expect.objectContaining({ method: "HEAD" }));
    expect(fetcher).toHaveBeenNthCalledWith(2, "https://example.com/resource", expect.objectContaining({ method: "GET" }));
  });

  test.each([429, 500])("classifies ambiguous HTTP %i as unchecked", async (status) => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status }));

    await expect(checkResourceAvailability("https://example.com/resource", fetcher))
      .resolves.toEqual({ status: "unchecked", errorCode: "ambiguous_status" });
  });

  test("classifies a transport error as unchecked", async () => {
    const fetcher = vi.fn().mockRejectedValue(new TypeError("network failed"));

    await expect(checkResourceAvailability("https://example.com/resource", fetcher))
      .resolves.toEqual({ status: "unchecked", errorCode: "network_error" });
  });

  test("aborts a slow request and classifies it as unchecked", async () => {
    const fetcher = vi.fn((_url: string | URL | Request, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("timed out", "AbortError")));
      }),
    ) as typeof fetch;

    await expect(checkResourceAvailability("https://example.com/resource", fetcher, 5))
      .resolves.toEqual({ status: "unchecked", errorCode: "timeout" });
  });
});
