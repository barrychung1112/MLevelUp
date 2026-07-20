import type {
  ParsePlatformUrlResult,
  ParsedPlatformUrl,
} from "./contracts";

const GITHUB_OWNER = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/u;
const GITHUB_REPO = /^[A-Za-z0-9_.-]{1,100}$/u;
const GITHUB_SHA = /^[A-Fa-f0-9]{7,64}$/u;
const KAGGLE_OWNER = /^[A-Za-z0-9_-]{1,50}$/u;
const KAGGLE_SLUG = /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/u;
const KAGGLE_COMPETITION = /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/u;

const unsupported = (): ParsePlatformUrlResult => ({
  ok: false,
  reason: "unsupported_url",
});

function pathSegments(url: URL): string[] | null {
  if (url.pathname.includes("//")) {
    return null;
  }

  const segments = url.pathname.split("/").slice(1);
  if (segments.at(-1) === "") {
    segments.pop();
  }

  return segments.length > 0 && segments.every(Boolean) ? segments : null;
}

function parseGitHub(segments: string[]): ParsedPlatformUrl | null {
  if (segments.length !== 2 && segments.length !== 4) {
    return null;
  }

  const owner = segments[0];
  const rawRepo = segments[1];
  const repo = rawRepo.endsWith(".git") ? rawRepo.slice(0, -4) : rawRepo;

  if (!GITHUB_OWNER.test(owner) || !GITHUB_REPO.test(repo)) {
    return null;
  }

  if (segments.length === 2) {
    return {
      provider: "github",
      resourceType: "repository",
      normalizedUrl: `https://github.com/${owner}/${repo}`,
      externalId: `${owner}/${repo}`,
      request: { owner, repo },
    };
  }

  const [, , action, sha] = segments;
  if (action !== "commit" || !GITHUB_SHA.test(sha)) {
    return null;
  }

  return {
    provider: "github",
    resourceType: "commit",
    normalizedUrl: `https://github.com/${owner}/${repo}/commit/${sha}`,
    externalId: sha,
    request: { owner, repo, sha },
  };
}

function parseKaggle(segments: string[]): ParsedPlatformUrl | null {
  if (segments[0] === "code" && segments.length === 3) {
    const [, owner, notebook] = segments;
    if (!KAGGLE_OWNER.test(owner) || !KAGGLE_SLUG.test(notebook)) {
      return null;
    }

    return {
      provider: "kaggle",
      resourceType: "notebook",
      normalizedUrl: `https://www.kaggle.com/code/${owner}/${notebook}`,
      externalId: `${owner}/${notebook}`,
      request: { owner, notebook },
    };
  }

  if (segments[0] === "competitions" && segments.length === 2) {
    const competition = segments[1];
    if (!KAGGLE_COMPETITION.test(competition)) {
      return null;
    }

    return {
      provider: "kaggle",
      resourceType: "competition",
      normalizedUrl: `https://www.kaggle.com/competitions/${competition}`,
      externalId: competition,
      request: { competition },
    };
  }

  return null;
}

export function parsePlatformUrl(input: string): ParsePlatformUrlResult {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return unsupported();
  }

  if (
    url.protocol !== "https:" ||
    url.username !== "" ||
    url.password !== "" ||
    url.port !== ""
  ) {
    return unsupported();
  }

  const segments = pathSegments(url);
  if (segments === null) {
    return unsupported();
  }

  const parsed =
    url.hostname === "github.com"
      ? parseGitHub(segments)
      : url.hostname === "www.kaggle.com"
        ? parseKaggle(segments)
        : null;

  return parsed === null ? unsupported() : { ok: true, value: parsed };
}
