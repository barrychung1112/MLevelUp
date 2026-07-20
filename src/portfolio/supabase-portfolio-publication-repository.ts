import { z } from "zod";

import { SkillKeySchema } from "@/domain/training/schemas";

import {
  PortfolioPublicationError,
  type PortfolioPublicationErrorCode,
  type PortfolioPublicationRepository,
} from "./portfolio-publication-repository";
import {
  PublicPortfolioProfileInputSchema,
  PublishArtifactInputSchema,
  type PortfolioPublicationState,
  type PublicPortfolioProfile,
  type PublishedArtifact,
} from "./contracts";

type DatabaseError = { code?: string; message: string };
type QueryResult<T> = Promise<{ data: T | null; error: DatabaseError | null }>;

type FilterQuery<T> = PromiseLike<{ data: T | null; error: DatabaseError | null }> & {
  eq(column: string, value: unknown): FilterQuery<T>;
  maybeSingle(): QueryResult<unknown>;
};

type TableClient = {
  select(columns?: string): FilterQuery<unknown>;
  upsert(value: unknown): QueryResult<unknown>;
  update(value: unknown): FilterQuery<unknown>;
};

type PortfolioSupabaseClient = {
  auth: {
    getUser(): Promise<{
      data: { user: { id: string } | null };
      error: DatabaseError | null;
    }>;
  };
  from(table: string): TableClient;
  rpc(
    name: string,
    args: Record<string, unknown>,
  ): QueryResult<unknown>;
};

type PublicPortfolioRow = {
  user_id: string;
  slug: string;
  display_name: string;
  headline: string;
  bio: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

type PublishedArtifactRow = {
  artifact_id: string;
  public_title: string;
  public_summary: string;
  artifact_type: string;
  artifact_url: string | null;
  skill_tags: unknown;
  quality_score: number;
  featured: boolean;
  display_order: number;
  published_at: string;
  updated_at: string;
};

const skillTagsSchema = z.array(SkillKeySchema).min(1);

const ERROR_MESSAGES: Record<PortfolioPublicationErrorCode, string> = {
  not_authenticated: "Please sign in to manage your public portfolio.",
  slug_conflict: "That public portfolio URL is already in use.",
  artifact_not_found: "That artifact is unavailable or is not yours.",
  artifact_not_verified: "Only verified artifacts can be published.",
  artifact_url_not_https: "Only secure HTTPS artifact links can be published.",
  featured_limit: "A portfolio can feature at most three artifacts.",
  invalid_public_fields: "Check the public title, summary, and ordering values.",
  profile_required: "Create your public profile before publishing it.",
  unavailable: "Portfolio publishing is temporarily unavailable.",
};

function publicationError(code: PortfolioPublicationErrorCode) {
  return new PortfolioPublicationError(code, ERROR_MESSAGES[code]);
}

function normalizeError(error: DatabaseError): PortfolioPublicationError {
  const message = error.message.toLowerCase();
  if (error.code === "23505" || message.includes("public_portfolios_slug_key")) {
    return publicationError("slug_conflict");
  }
  if (message.includes("portfolio_auth_required")) return publicationError("not_authenticated");
  if (message.includes("portfolio_artifact_not_found")) return publicationError("artifact_not_found");
  if (message.includes("portfolio_artifact_not_verified")) return publicationError("artifact_not_verified");
  if (message.includes("portfolio_artifact_url_not_https")) return publicationError("artifact_url_not_https");
  if (message.includes("portfolio_featured_limit")) return publicationError("featured_limit");
  if (message.includes("portfolio_public_fields_invalid")) return publicationError("invalid_public_fields");
  return publicationError("unavailable");
}

function mapProfile(row: PublicPortfolioRow): PublicPortfolioProfile {
  return {
    userId: row.user_id,
    slug: row.slug,
    displayName: row.display_name,
    headline: row.headline,
    bio: row.bio,
    isPublished: row.is_published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapArtifact(row: PublishedArtifactRow): PublishedArtifact {
  return {
    artifactId: row.artifact_id,
    artifactType: row.artifact_type,
    publicTitle: row.public_title,
    publicSummary: row.public_summary,
    artifactUrl: row.artifact_url,
    skillTags: skillTagsSchema.parse(row.skill_tags),
    qualityScore: row.quality_score,
    featured: row.featured,
    displayOrder: row.display_order,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
  };
}

export class SupabasePortfolioPublicationRepository
  implements PortfolioPublicationRepository
{
  constructor(private readonly client: PortfolioSupabaseClient) {}

  private async userId(): Promise<string> {
    const { data, error } = await this.client.auth.getUser();
    if (error || !data.user) throw publicationError("not_authenticated");
    return data.user.id;
  }

  private async profileRow(userId: string): Promise<PublicPortfolioRow | null> {
    const { data, error } = await this.client
      .from("public_portfolios")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw normalizeError(error);
    return data as PublicPortfolioRow | null;
  }

  async load(): Promise<PortfolioPublicationState> {
    const userId = await this.userId();
    const [profile, artifactResult] = await Promise.all([
      this.profileRow(userId),
      this.client
        .from("published_artifacts")
        .select("*")
        .eq("user_id", userId),
    ]);
    if (artifactResult.error) throw normalizeError(artifactResult.error);
    const artifacts = ((artifactResult.data ?? []) as PublishedArtifactRow[])
      .map(mapArtifact)
      .sort(
        (left, right) =>
          Number(right.featured) - Number(left.featured) ||
          left.displayOrder - right.displayOrder ||
          left.publishedAt.localeCompare(right.publishedAt) ||
          left.artifactId.localeCompare(right.artifactId),
      );
    return { profile: profile ? mapProfile(profile) : null, artifacts };
  }

  async saveProfile(input: Parameters<PortfolioPublicationRepository["saveProfile"]>[0]) {
    const values = PublicPortfolioProfileInputSchema.parse(input);
    const userId = await this.userId();
    const existing = await this.profileRow(userId);
    const { error } = await this.client.from("public_portfolios").upsert({
      user_id: userId,
      slug: values.slug,
      display_name: values.displayName,
      headline: values.headline,
      bio: values.bio,
      ...(existing ? {} : { is_published: false }),
    });
    if (error) throw normalizeError(error);
  }

  async setVisibility(isPublished: boolean) {
    const userId = await this.userId();
    const profile = await this.profileRow(userId);
    if (!profile) throw publicationError("profile_required");
    const { error } = await this.client
      .from("public_portfolios")
      .update({ is_published: isPublished })
      .eq("user_id", userId);
    if (error) throw normalizeError(error);
  }

  async publishArtifact(input: Parameters<PortfolioPublicationRepository["publishArtifact"]>[0]) {
    const values = PublishArtifactInputSchema.parse(input);
    const artifactId = z.string().uuid().parse(values.artifactId);
    const { error } = await this.client.rpc("publish_portfolio_artifact", {
      p_artifact_id: artifactId,
      p_public_title: values.publicTitle,
      p_public_summary: values.publicSummary,
      p_show_artifact_url: values.showArtifactUrl,
      p_featured: values.featured,
      p_display_order: values.displayOrder,
    });
    if (error) throw normalizeError(error);
  }

  async unpublishArtifact(artifactId: string) {
    const { error } = await this.client.rpc("unpublish_portfolio_artifact", {
      p_artifact_id: z.string().uuid().parse(artifactId),
    });
    if (error) throw normalizeError(error);
  }
}
