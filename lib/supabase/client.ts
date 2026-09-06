import { createBrowserClient } from "@supabase/ssr"
import { requireSupabasePublicConfig } from "@/lib/supabase/env"

export function createClient() {
  const { url, publishableKey } = requireSupabasePublicConfig()
  return createBrowserClient(url, publishableKey)
}

