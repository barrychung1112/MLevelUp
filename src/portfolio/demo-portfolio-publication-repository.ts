import type { SkillKey } from "@/domain/training/types";

import {
  PortfolioPublicationError,
  type PortfolioPublicationRepository,
} from "./portfolio-publication-repository";
import {
  PublicPortfolioProfileInputSchema,
  PublishArtifactInputSchema,
  type PortfolioPublicationState,
  type PublishedArtifact,
} from "./contracts";

export const PORTFOLIO_STORAGE_KEY = "mlevelup-portfolio-publication-v1";
const DEMO_SKILLS: readonly SkillKey[] = ["engineering", "communication"];

export class DemoPortfolioPublicationRepository
  implements PortfolioPublicationRepository
{
  constructor(
    private readonly storage: Storage,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  private read(): PortfolioPublicationState {
    const raw = this.storage.getItem(PORTFOLIO_STORAGE_KEY);
    if (!raw) return { profile: null, artifacts: [] };
    try {
      return JSON.parse(raw) as PortfolioPublicationState;
    } catch {
      return { profile: null, artifacts: [] };
    }
  }

  private write(state: PortfolioPublicationState) {
    this.storage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(state));
  }

  async load() {
    return this.read();
  }

  async saveProfile(input: Parameters<PortfolioPublicationRepository["saveProfile"]>[0]) {
    const values = PublicPortfolioProfileInputSchema.parse(input);
    const state = this.read();
    const timestamp = this.now();
    this.write({
      ...state,
      profile: {
        ...values,
        userId: "demo-user",
        isPublished: state.profile?.isPublished ?? false,
        createdAt: state.profile?.createdAt ?? timestamp,
        updatedAt: timestamp,
      },
    });
  }

  async setVisibility(isPublished: boolean) {
    const state = this.read();
    if (!state.profile) {
      throw new PortfolioPublicationError(
        "profile_required",
        "Create your public profile before publishing it.",
      );
    }
    this.write({
      ...state,
      profile: { ...state.profile, isPublished, updatedAt: this.now() },
    });
  }

  async publishArtifact(input: Parameters<PortfolioPublicationRepository["publishArtifact"]>[0]) {
    const values = PublishArtifactInputSchema.parse(input);
    const state = this.read();
    const existing = state.artifacts.find(
      (item) => item.artifactId === values.artifactId,
    );
    const featuredCount = state.artifacts.filter(
      (item) => item.featured && item.artifactId !== values.artifactId,
    ).length;
    if (values.featured && featuredCount >= 3) {
      throw new PortfolioPublicationError(
        "featured_limit",
        "A portfolio can feature at most three artifacts.",
      );
    }
    const timestamp = this.now();
    const artifact: PublishedArtifact = {
      artifactId: values.artifactId,
      artifactType: existing?.artifactType ?? "technicalWriteup",
      publicTitle: values.publicTitle,
      publicSummary: values.publicSummary,
      artifactUrl: existing?.artifactUrl ?? null,
      skillTags: existing?.skillTags ?? DEMO_SKILLS,
      qualityScore: existing?.qualityScore ?? 80,
      featured: values.featured,
      displayOrder: values.displayOrder,
      publishedAt: existing?.publishedAt ?? timestamp,
      updatedAt: timestamp,
    };
    this.write({
      ...state,
      artifacts: [
        ...state.artifacts.filter((item) => item.artifactId !== values.artifactId),
        artifact,
      ],
    });
  }

  async unpublishArtifact(artifactId: string) {
    const state = this.read();
    this.write({
      ...state,
      artifacts: state.artifacts.filter((item) => item.artifactId !== artifactId),
    });
  }
}
