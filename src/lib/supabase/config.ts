export type SupabaseConfig =
  | { available: false }
  | { available: true; url: string; anonKey: string };

type PublicEnvironment = Record<string, string | undefined>;

export function readSupabaseConfig(environment: PublicEnvironment): SupabaseConfig {
  const url = environment.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = environment.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return { available: false };
  return { available: true, url, anonKey };
}

export function getSupabaseConfig(): SupabaseConfig {
  return readSupabaseConfig({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}
