import { createClient } from "@supabase/supabase-js";

type ServerEnvironment = Readonly<Record<string, string | undefined>>;

export interface ServerSupabaseAdminConfig {
  url: string;
  serviceRoleKey: string;
}

export function readServerSupabaseAdminConfig(
  environment: ServerEnvironment = process.env,
): ServerSupabaseAdminConfig | null {
  const url = environment.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = environment.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) return null;

  return { url, serviceRoleKey };
}

export function createServerSupabaseAdminClient(
  environment: ServerEnvironment = process.env,
) {
  const config = readServerSupabaseAdminConfig(environment);
  if (!config) throw new Error("Server Supabase administration is not configured");

  return createClient(config.url, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
