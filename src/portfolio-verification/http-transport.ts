export type JsonHttpRequest = {
  url: string;
  headers?: Readonly<Record<string, string>>;
};

export type JsonHttpResult =
  | { kind: "response"; status: number; body: unknown }
  | { kind: "timeout" }
  | { kind: "network_error" }
  | { kind: "redirect" }
  | { kind: "too_large" }
  | { kind: "invalid_json" };

export type JsonHttpTransport = {
  request(request: JsonHttpRequest): Promise<JsonHttpResult>;
};

type BoundedTransportOptions = {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  maxBytes?: number;
};

export function createBoundedJsonHttpTransport(
  options: BoundedTransportOptions = {},
): JsonHttpTransport {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 8_000;
  const maxBytes = options.maxBytes ?? 256_000;

  return {
    async request(request) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetchImpl(request.url, {
          method: "GET",
          headers: request.headers,
          redirect: "manual",
          signal: controller.signal,
        });

        if (response.status >= 300 && response.status < 400) {
          return { kind: "redirect" };
        }

        const declaredLength = Number(response.headers.get("content-length"));
        if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
          return { kind: "too_large" };
        }

        const bytes = new Uint8Array(await response.arrayBuffer());
        if (bytes.byteLength > maxBytes) {
          return { kind: "too_large" };
        }

        try {
          const text = new TextDecoder().decode(bytes);
          return {
            kind: "response",
            status: response.status,
            body: text.length === 0 ? null : JSON.parse(text),
          };
        } catch {
          return { kind: "invalid_json" };
        }
      } catch (error) {
        if (
          controller.signal.aborted ||
          (error instanceof DOMException && error.name === "AbortError")
        ) {
          return { kind: "timeout" };
        }
        return { kind: "network_error" };
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
