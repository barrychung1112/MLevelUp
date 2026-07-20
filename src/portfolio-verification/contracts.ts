export type VerificationProvider = "github" | "kaggle";

export type VerificationResourceType =
  | "repository"
  | "commit"
  | "notebook"
  | "competition";

export type LinkVerificationStatus =
  | "verified"
  | "unavailable"
  | "unsupported"
  | "error"
  | "stale";

export type GitHubRepositoryRequest = {
  owner: string;
  repo: string;
};

export type GitHubCommitRequest = GitHubRepositoryRequest & {
  sha: string;
};

export type KaggleNotebookRequest = {
  owner: string;
  notebook: string;
};

export type KaggleCompetitionRequest = {
  competition: string;
};

export type ParsedPlatformUrl =
  | {
      provider: "github";
      resourceType: "repository";
      normalizedUrl: string;
      externalId: string;
      request: GitHubRepositoryRequest;
    }
  | {
      provider: "github";
      resourceType: "commit";
      normalizedUrl: string;
      externalId: string;
      request: GitHubCommitRequest;
    }
  | {
      provider: "kaggle";
      resourceType: "notebook";
      normalizedUrl: string;
      externalId: string;
      request: KaggleNotebookRequest;
    }
  | {
      provider: "kaggle";
      resourceType: "competition";
      normalizedUrl: string;
      externalId: string;
      request: KaggleCompetitionRequest;
    };

export type ParsePlatformUrlResult =
  | { ok: true; value: ParsedPlatformUrl }
  | { ok: false; reason: "unsupported_url" };
