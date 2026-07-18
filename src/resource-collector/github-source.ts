import {
  boundedLimit,
  ResourceSourceError,
  type FetchLike,
  type ResourceCandidate,
  type ResourceSearchInput,
  type ResourceSource,
} from "./contracts";

type GitHubRepository = {
  id: number;
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  archived: boolean;
  updated_at: string;
  created_at: string;
  license: { spdx_id: string | null } | null;
};

function candidateFromRepository(repository: GitHubRepository): ResourceCandidate {
  return {
    source: "github",
    externalId: String(repository.id),
    title: repository.full_name,
    summary: repository.description?.trim() || "GitHub repository for machine learning engineering practice.",
    url: repository.html_url,
    resourceType: "repository",
    publishedAt: repository.created_at,
    updatedAt: repository.updated_at,
    credibilityHint: repository.archived ? 45 : repository.license?.spdx_id ? 80 : 65,
    freshnessHint: repository.archived ? 20 : 80,
  };
}

export function createGitHubSource(fetcher: FetchLike, token?: string): ResourceSource {
  return {
    source: "github",
    async search(input: ResourceSearchInput): Promise<ResourceCandidate[]> {
      const params = new URLSearchParams({
        q: input.query,
        sort: "updated",
        order: "desc",
        per_page: String(boundedLimit(input.limit)),
      });
      const response = await fetcher(`https://api.github.com/search/repositories?${params}`, {
        headers: {
          Accept: "application/vnd.github+json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!response.ok) throw new ResourceSourceError(`github_http_${response.status}`);
      const payload = await response.json() as { items?: GitHubRepository[] };
      if (!Array.isArray(payload.items)) throw new ResourceSourceError("github_invalid_response");
      return payload.items.slice(0, boundedLimit(input.limit)).map(candidateFromRepository);
    },
  };
}
