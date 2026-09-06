import "server-only"
import { createClient } from "@supabase/supabase-js"
import { requireSupabasePublicConfig } from "@/lib/supabase/env"

export function createAdminClient() {
  const { url } = requireSupabasePublicConfig()
  const secret = process.env.SUPABASE_SECRET_KEY
  if (!secret) throw new Error("SUPABASE_SECRET_KEY is not configured")
  return createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } })
}

