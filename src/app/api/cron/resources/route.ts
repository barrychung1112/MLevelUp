import { createOpenAiGateway } from "@/ai/openai-gateway";
import { readAiConfig } from "@/ai/config";
import { createArxivSource } from "@/resource-collector/arxiv-source";
import { checkResourceAvailability } from "@/resource-collector/check-availability";
import { collectResources, type CollectionOutcome } from "@/resource-collector/collect-resources";
import { curateCandidate } from "@/resource-collector/curator";
import { createGitHubSource } from "@/resource-collector/github-source";
import { SupabaseResourceCatalogRepository } from "@/resource-collector/supabase-catalog-repository";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server-admin";

export function createResourceCollectionHandler(dependencies: { cronSecret: string; run: () => Promise<CollectionOutcome> }) {
  return async function POST(request: Request) {
    if (!dependencies.cronSecret || request.headers.get("authorization") !== `Bearer ${dependencies.cronSecret}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const outcome = await dependencies.run();
    return Response.json({
      status: outcome.status,
      candidateCount: outcome.candidateCount,
      inserted: outcome.inserted,
      updated: outcome.updated,
      duplicates: outcome.duplicates,
      rejected: outcome.rejected,
      fallbackCount: outcome.fallbackCount,
      unavailableCount: outcome.unavailableCount,
      uncheckedCount: outcome.uncheckedCount,
      replayed: outcome.replayed,
      degradedSources: outcome.sourceFailures.length,
    });
  };
}

async function runLiveCollection(): Promise<CollectionOutcome> {
  const now = new Date().toISOString();
  const baseConfig = readAiConfig();
  const promptVersion = process.env.OPENAI_RESOURCE_PROMPT_VERSION?.trim() || "phase4-resource-v1";
  const config = baseConfig ? { ...baseConfig, promptVersion } : null;
  const gateway = config ? createOpenAiGateway(config) : null;
  return collectResources({
    runKey: now.slice(0, 10), now, query: "machine learning engineering", limit: 10,
    sources: [createGitHubSource(fetch, process.env.GITHUB_TOKEN), createArxivSource(fetch)],
    repository: new SupabaseResourceCatalogRepository(createServerSupabaseAdminClient()),
    curate: (candidate) => curateCandidate(candidate, gateway, config),
    checkAvailability: (url) => checkResourceAvailability(url, fetch),
    runMetadata: { model: config?.model, promptVersion },
  });
}

export const POST = createResourceCollectionHandler({ cronSecret: process.env.CRON_SECRET ?? "", run: runLiveCollection });
export const GET = POST;
