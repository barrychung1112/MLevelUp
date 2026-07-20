import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { SkillKeySchema } from "@/domain/training/schemas";
import { isDemoMode } from "@/lib/demo-mode";
import { getSupabaseConfig } from "@/lib/supabase/config";

import type { PublicPortfolio, PublicPortfolioProfile, PublishedArtifact } from "./contracts";

type Result = { data: unknown; error: { message: string } | null };
type Query = PromiseLike<Result> & {
  select(columns: string): Query;
  eq(column: string, value: unknown): Query;
  order(column: string, options?: { ascending: boolean }): Query;
  maybeSingle(): Promise<Result>;
};
type PublicClient = { from(table: string): Query };

export class PublicPortfolioReadError extends Error {}

const timestamp = "2026-07-19T00:00:00.000Z";
export const demoPublicPortfolio: PublicPortfolio = {
  profile: {
    userId: "demo-user",
    slug: "demo-ml-engineer",
    displayName: "MLevelUp Pathfinder",
    headline: "Machine Learning Engineer — evidence in progress",
    bio: "Building reproducible models, reliable systems, and clear technical narratives.",
    isPublished: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  },
  artifacts: [
    { artifactId: "demo-1", artifactType: "modelEvaluationReport", publicTitle: "Churn model validation dossier", publicSummary: "A leakage-aware validation study comparing baselines, error slices, and product-facing tradeoffs.", artifactUrl: "https://github.com/", skillTags: ["dataHandling", "modeling", "evaluation", "productThinking"], qualityScore: 91, featured: true, displayOrder: 0, publishedAt: timestamp, updatedAt: timestamp },
    { artifactId: "demo-2", artifactType: "deployedDemo", publicTitle: "Production inference gateway", publicSummary: "A deployable prediction API with health checks, structured logs, and documented operating constraints.", artifactUrl: "https://vercel.com/", skillTags: ["engineering", "communication"], qualityScore: 87, featured: true, displayOrder: 1, publishedAt: timestamp, updatedAt: timestamp },
    { artifactId: "demo-3", artifactType: "technicalWriteup", publicTitle: "Paper-to-prototype field note", publicSummary: "A concise research comparison translated into an experiment plan and measurable implementation decision.", artifactUrl: null, skillTags: ["researchSense", "communication"], qualityScore: 84, featured: false, displayOrder: 2, publishedAt: timestamp, updatedAt: timestamp },
  ],
};

function mapProfile(row: Record<string, unknown>): PublicPortfolioProfile {
  return {
    userId: String(row.user_id), slug: String(row.slug), displayName: String(row.display_name),
    headline: String(row.headline), bio: String(row.bio ?? ""), isPublished: Boolean(row.is_published),
    createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  };
}

function mapArtifact(row: Record<string, unknown>): PublishedArtifact {
  return {
    artifactId: String(row.artifact_id), artifactType: String(row.artifact_type),
    publicTitle: String(row.public_title), publicSummary: String(row.public_summary),
    artifactUrl: typeof row.artifact_url === "string" ? row.artifact_url : null,
    skillTags: z.array(SkillKeySchema).parse(row.skill_tags), qualityScore: Number(row.quality_score),
    featured: Boolean(row.featured), displayOrder: Number(row.display_order),
    publishedAt: String(row.published_at), updatedAt: String(row.updated_at),
  };
}

export function createPublicPortfolioReader(client: PublicClient) {
  return async (slug: string): Promise<PublicPortfolio | null> => {
    const profileResult = await client.from("public_portfolios").select("user_id,slug,display_name,headline,bio,is_published,created_at,updated_at").eq("slug", slug).eq("is_published", true).maybeSingle();
    if (profileResult.error) throw new PublicPortfolioReadError("Public portfolio unavailable");
    if (!profileResult.data) return null;
    const profile = mapProfile(profileResult.data as Record<string, unknown>);
    const artifactResult = await client.from("published_artifacts").select("artifact_id,public_title,public_summary,artifact_type,artifact_url,skill_tags,quality_score,featured,display_order,published_at,updated_at").eq("user_id", profile.userId).order("featured", { ascending: false }).order("display_order", { ascending: true }).order("published_at", { ascending: true }).order("artifact_id", { ascending: true });
    if (artifactResult.error) throw new PublicPortfolioReadError("Public portfolio unavailable");
    return { profile, artifacts: ((artifactResult.data ?? []) as Record<string, unknown>[]).map(mapArtifact) };
  };
}

export async function readPublicPortfolio(slug: string) {
  if (isDemoMode()) return slug === demoPublicPortfolio.profile.slug ? demoPublicPortfolio : null;
  const config = getSupabaseConfig();
  if (!config.available) throw new PublicPortfolioReadError("Public portfolio unavailable");
  const client = createClient(config.url, config.anonKey, { auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false } });
  return createPublicPortfolioReader(client as never)(slug);
}
