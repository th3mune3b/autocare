import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { requireSupabasePublicConfig } from "@/lib/supabase/env"

export async function createClient() {
  const cookieStore = await cookies()
  const { url, publishableKey } = requireSupabasePublicConfig()
  return createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(values) {
        try { values.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) }
        catch { /* Server Components cannot write cookies; proxy refreshes them. */ }
      },
    },
  })
}

