import type { SupabaseClient } from "@supabase/supabase-js";
import type { AchievementRepository, AchievementSourceBundle, StoredAchievementDraft } from "./achievement-repository";
import type { AchievementSourceFact } from "./contracts";

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
}
