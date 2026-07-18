import {
  boundedLimit,
  ResourceSourceError,
  type FetchLike,
  type ResourceCandidate,
  type ResourceSearchInput,
  type ResourceSource,
} from "./contracts";

function textFor(xml: string, tag: string): string | undefined {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "iu"));
  return match?.[1]?.replace(/\s+/gu, " ").trim();
}

function entries(xml: string): string[] {
  return [...xml.matchAll(/<entry[^>]*>([\s\S]*?)<\/entry>/giu)].map((match) => match[1]);
}

function candidateFromEntry(entry: string): ResourceCandidate {
  const id = textFor(entry, "id");
  const title = textFor(entry, "title");
  const summary = textFor(entry, "summary");
  if (!id || !title || !summary) throw new ResourceSourceError("arxiv_invalid_entry");
  const externalId = id.match(/abs\/([^v\s]+)(?:v\d+)?$/u)?.[1];
  if (!externalId) throw new ResourceSourceError("arxiv_invalid_identifier");
  return {
    source: "arxiv",
    externalId,
    title,
    summary,
    url: `https://arxiv.org/abs/${externalId}`,
    resourceType: "paper",
    publishedAt: textFor(entry, "published"),
    updatedAt: textFor(entry, "updated"),
    credibilityHint: 90,
    freshnessHint: 75,
  };
}

export function createArxivSource(fetcher: FetchLike): ResourceSource {
  return {
    source: "arxiv",
    async search(input: ResourceSearchInput): Promise<ResourceCandidate[]> {
      const params = new URLSearchParams({ search_query: `all:${input.query}`, start: "0", max_results: String(boundedLimit(input.limit)) });
      const response = await fetcher(`https://export.arxiv.org/api/query?${params}`);
      if (!response.ok) throw new ResourceSourceError(`arxiv_http_${response.status}`);
      const xml = await response.text();
      return entries(xml).slice(0, boundedLimit(input.limit)).map(candidateFromEntry);
    },
  };
}
