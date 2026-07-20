import type { FetchLike } from "./contracts";

export type AvailabilityCheck = {
  status: "available" | "unavailable" | "unchecked";
  errorCode?: "timeout" | "ambiguous_status" | "network_error";
};

function classifyStatus(status: number): AvailabilityCheck {
  if (status >= 200 && status <= 399) return { status: "available" };
  if (status === 404 || status === 410) return { status: "unavailable" };
  return { status: "unchecked", errorCode: "ambiguous_status" };
}

export async function checkResourceAvailability(
  url: string,
  fetcher: FetchLike = fetch,
  timeoutMs = 5_000,
): Promise<AvailabilityCheck> {
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    let response = await fetcher(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
    });
    if (response.status === 405 || response.status === 501) {
      response = await fetcher(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: { Range: "bytes=0-0" },
      });
    }
    return classifyStatus(response.status);
  } catch (error) {
    if (timedOut || (error instanceof Error && error.name === "AbortError")) {
      return { status: "unchecked", errorCode: "timeout" };
    }
    return { status: "unchecked", errorCode: "network_error" };
  } finally {
    clearTimeout(timeout);
  }
}
