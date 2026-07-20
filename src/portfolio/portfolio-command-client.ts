import { z } from "zod";

const VerificationViewSchema = z.object({
  status: z.enum(["verified", "unavailable", "unsupported", "error"]),
  provider: z.enum(["github", "kaggle"]).optional(),
  resourceType: z
    .enum(["repository", "commit", "notebook", "competition"])
    .optional(),
  normalizedUrl: z.string().url().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  errorCode: z.string().optional(),
  verifiedAt: z.string().nullable().optional(),
  staleAfter: z.string().nullable().optional(),
});

export type PortfolioCommandResult =
  | {
      ok: true;
      verification: z.infer<typeof VerificationViewSchema>;
    }
  | { ok: false; status: number; code: string };

export async function verifyPortfolioLink(input: {
  artifactId: string;
  accessToken: string;
  fetchImpl?: typeof fetch;
}): Promise<PortfolioCommandResult> {
  const fetchImpl = input.fetchImpl ?? fetch;
  try {
    const response = await fetchImpl("/api/portfolio/verify-link", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ artifactId: input.artifactId }),
    });
    const body: unknown = await response.json();
    if (!response.ok) {
      const failure = z
        .object({ code: z.string().optional() })
        .safeParse(body);
      return {
        ok: false,
        status: response.status,
        code: failure.success && failure.data.code
          ? failure.data.code
          : "request_failed",
      };
    }

    const parsed = z.object({ verification: VerificationViewSchema }).safeParse(body);
    if (!parsed.success) {
      return { ok: false, status: 502, code: "invalid_response" };
    }
    return { ok: true, verification: parsed.data.verification };
  } catch {
    return { ok: false, status: 0, code: "network_error" };
  }
}
