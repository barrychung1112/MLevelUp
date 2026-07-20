import type { SupabaseClient } from "@supabase/supabase-js";
import type { AchievementRepository, AchievementSourceBundle, StoredAchievementDraft } from "./achievement-repository";
import type { AchievementSourceFact } from "./contracts";
import { validateAchievementBullets } from "./grounding-validator";
import { buildAchievementSourceFacts, fingerprintSourceFacts } from "./source-facts";
import { z } from "zod";

const DraftRowSchema = z.object({
  bullets: z.array(z.object({ id: z.string(), text: z.string(), source_refs: z.array(z.string()) })),
  source_fingerprint: z.string(),
});

export class SupabaseAchievementRepository implements AchievementRepository {
  constructor(private readonly client: SupabaseClient) {}

  async loadOwnedSource(userId: string, artifactId: string): Promise<AchievementSourceBundle | null> {
    const { data, error } = await this.client.from("portfolio_artifacts").select("id,user_id,title,artifact_type,quality_score,skill_tags").eq("user_id", userId).eq("id", artifactId).maybeSingle();
    if (error) throw new Error("Achievement source unavailable");
    if (!data) return null;
    const row = data as Record<string, unknown>;
    const verificationResult = await this.client.from("artifact_link_verifications").select("provider,verified_at,metadata").eq("user_id", userId).eq("artifact_id", artifactId).eq("status", "verified").order("verified_at", { ascending: false }).limit(1).maybeSingle();
    if (verificationResult.error) throw new Error("Achievement source unavailable");
    const verification = verificationResult.data as Record<string, unknown> | null;
    return {
      artifact: { title: String(row.title), artifactType: String(row.artifact_type), qualityScore: Number(row.quality_score), skillTags: Array.isArray(row.skill_tags) ? row.skill_tags.map(String) : [] },
      verification: verification ? { provider: String(verification.provider), verifiedAt: String(verification.verified_at), metadata: (verification.metadata ?? {}) as Record<string, unknown> } : null,
    };
  }

  async loadDraft(userId: string, artifactId: string): Promise<unknown | null> {
    const { data, error } = await this.client.from("artifact_achievement_drafts").select("*").eq("user_id", userId).eq("artifact_id", artifactId).maybeSingle();
    if (error) throw new Error("Achievement draft unavailable");
    return data;
  }

  async saveDraft(draft: StoredAchievementDraft, facts: readonly AchievementSourceFact[]): Promise<void> {
    void facts;
    const { error } = await this.client.from("artifact_achievement_drafts").upsert({ artifact_id: draft.artifactId, user_id: draft.userId, bullets: draft.bullets, status: draft.status, source_fingerprint: draft.sourceFingerprint, model: draft.model, prompt_version: draft.promptVersion, generated_at: new Date().toISOString(), approved_at: null }, { onConflict: "artifact_id" });
    if (error) throw new Error("Achievement draft unavailable");
  }

  async updateDraft(userId: string, artifactId: string, edits: readonly { id: string; text: string }[], action: "save" | "approve") {
    const [rawDraft, source] = await Promise.all([this.loadDraft(userId, artifactId), this.loadOwnedSource(userId, artifactId)]);
    if (!rawDraft || !source) return { ok: false as const, reason: "artifact_not_found" as const };
    const draft = DraftRowSchema.safeParse(rawDraft);
    if (!draft.success) return { ok: false as const, reason: "draft_invalid" as const };
    const stored = new Map(draft.data.bullets.map((bullet) => [bullet.id, bullet]));
    const bullets = edits.map((edit) => {
      const original = stored.get(edit.id);
      return original ? { id: original.id, text: edit.text, source_refs: original.source_refs } : null;
    });
    if (bullets.some((bullet) => bullet === null) || new Set(edits.map((edit) => edit.id)).size !== edits.length) return { ok: false as const, reason: "draft_invalid" as const };
    const facts = buildAchievementSourceFacts(source);
    const fingerprint = fingerprintSourceFacts(facts);
    if (fingerprint !== draft.data.source_fingerprint) {
      await this.client.from("artifact_achievement_drafts").update({ status: "outdated", approved_at: null }).eq("user_id", userId).eq("artifact_id", artifactId);
      return { ok: false as const, reason: "draft_outdated" as const };
    }
    const complete = bullets.filter((bullet): bullet is NonNullable<typeof bullet> => bullet !== null);
    const validation = validateAchievementBullets(complete.map((bullet) => ({ text: bullet.text, sourceRefs: bullet.source_refs })), facts);
    if (!validation.ok) return { ok: false as const, reason: "grounding_failed" as const, errors: validation.errors };
    const status = action === "approve" ? "approved" : "draft";
    const { error } = await this.client.from("artifact_achievement_drafts").update({ bullets: complete, status, approved_at: status === "approved" ? new Date().toISOString() : null }).eq("user_id", userId).eq("artifact_id", artifactId);
    if (error) throw new Error("Achievement draft unavailable");
    return { ok: true as const, status, bullets: complete };
  }
}
