import { createClient } from "@supabase/supabase-js";

import { getSupabaseConfig } from "./config";

export class ServerSupabaseConfigurationError extends Error {}
export class ServerSupabaseAuthenticationError extends Error {}

export async function createAuthenticatedSupabaseClient(accessToken: string) {
  const config = getSupabaseConfig();
  if (!config.available) {
    throw new ServerSupabaseConfigurationError("Supabase is not configured");
  }
  const client = createClient(config.url, config.anonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { data, error } = await client.auth.getUser(accessToken);
  if (error || !data.user) {
    throw new ServerSupabaseAuthenticationError("Invalid Supabase access token");
  }

  return {
    auth: {
      getUser: async () => ({ data: { user: data.user }, error: null }),
    },
    from: client.from.bind(client),
  };
}
