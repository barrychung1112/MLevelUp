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

export type AchievementDraftView = { status: "draft" | "approved" | "outdated"; bullets: Array<{ id: string; text: string; source_refs: string[] }> };

export async function generatePortfolioAchievements(input: { artifactId: string; accessToken: string; replaceExistingDraft: boolean; fetchImpl?: typeof fetch }) {
  const response = await (input.fetchImpl ?? fetch)("/api/portfolio/generate-achievements", { method: "POST", headers: { Authorization: `Bearer ${input.accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ artifactId: input.artifactId, replaceExistingDraft: input.replaceExistingDraft }) });
  const body = await response.json() as { draft?: AchievementDraftView; code?: string };
  return response.ok && body.draft ? { ok: true as const, draft: body.draft } : { ok: false as const, code: body.code ?? "request_failed" };
}

export async function updatePortfolioAchievements(input: { artifactId: string; accessToken: string; action: "save" | "approve"; bullets: Array<{ id: string; text: string }>; fetchImpl?: typeof fetch }) {
  const response = await (input.fetchImpl ?? fetch)("/api/portfolio/generate-achievements", { method: "PATCH", headers: { Authorization: `Bearer ${input.accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ artifactId: input.artifactId, action: input.action, bullets: input.bullets }) });
  const body = await response.json() as { status?: string; code?: string };
  return response.ok ? { ok: true as const, status: body.status } : { ok: false as const, code: body.code ?? "request_failed" };
}
