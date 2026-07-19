import { createArxivSource } from "@/resource-collector/arxiv-source";
import { collectResources, type CollectionOutcome } from "@/resource-collector/collect-resources";
import { createGitHubSource } from "@/resource-collector/github-source";
import { SupabaseResourceCatalogRepository } from "@/resource-collector/supabase-catalog-repository";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server-admin";

export function createResourceCollectionHandler(dependencies: { cronSecret: string; run: () => Promise<CollectionOutcome> }) {
  return async function POST(request: Request) {
    if (!dependencies.cronSecret || request.headers.get("authorization") !== `Bearer ${dependencies.cronSecret}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const outcome = await dependencies.run();
    return Response.json({ status: outcome.status, inserted: outcome.inserted, updated: outcome.updated, duplicates: outcome.duplicates, rejected: outcome.rejected, replayed: outcome.replayed, degradedSources: outcome.sourceFailures.length });
  };
}

async function runLiveCollection(): Promise<CollectionOutcome> {
  const now = new Date().toISOString();
  return collectResources({
    runKey: now.slice(0, 10), now, query: "machine learning engineering", limit: 10,
    sources: [createGitHubSource(fetch, process.env.GITHUB_TOKEN), createArxivSource(fetch)],
    repository: new SupabaseResourceCatalogRepository(createServerSupabaseAdminClient()),
  });
}

export const POST = createResourceCollectionHandler({ cronSecret: process.env.CRON_SECRET ?? "", run: runLiveCollection });
