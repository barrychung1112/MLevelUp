import { createHash } from "node:crypto";

export type ResourceSourceName = "github" | "arxiv" | "official" | "manual";

export interface ResourceIdentityInput {
  source: ResourceSourceName;
  externalId: string;
  title: string;
  url: string;
  publishedAt?: string;
}

export interface ResourceIdentity {
  canonicalUrl: string;
  source: ResourceSourceName;
  externalId: string;
  contentFingerprint: string;
}

const TRACKING_PARAMETER = /^(?:utm_[a-z]+|ref|source)$/iu;

export function canonicalizeResourceUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  url.protocol = "https:";
  url.hostname = url.hostname.toLowerCase();
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMETER.test(key)) url.searchParams.delete(key);
  }
  url.search = url.searchParams.toString();
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/u, "");
  return url.toString().replace(/\?$/u, "");
}

export function createResourceIdentity(input: ResourceIdentityInput): ResourceIdentity {
  const canonicalUrl = canonicalizeResourceUrl(input.url);
  const fingerprintInput = [
    input.source,
    input.title.trim().toLocaleLowerCase("en-US"),
    canonicalUrl,
    input.publishedAt ?? "",
  ].join("\n");

  return {
    canonicalUrl,
    source: input.source,
    externalId: input.externalId,
    contentFingerprint: createHash("sha256").update(fingerprintInput).digest("hex"),
  };
}
