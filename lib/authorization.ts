import { createClient } from "@/lib/supabase/server"

export type AppRole = "admin" | "staff" | "mechanic" | "customer"
export type AppAccount = { id: string; fullName: string; email: string; phone: string | null; role: AppRole; status: string }

export async function requireRole(allowed: AppRole[]) {
  try {
    const supabase = await createClient()
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
    const userId = claimsData?.claims?.sub
    if (claimsError || !userId) return { ok: false as const, status: 401, error: "Authentication required" }
    const { data: profile, error } = await supabase.from("profiles").select("id,email,full_name,phone,role,status").eq("id", userId).single()
    if (error || !profile || profile.status !== "active") return { ok: false as const, status: 403, error: "Account is not active" }
    if (!allowed.includes(profile.role as AppRole)) return { ok: false as const, status: 403, error: "You do not have permission for this action" }
    const account: AppAccount = { id: profile.id, fullName: profile.full_name, email: profile.email, phone: profile.phone, role: profile.role as AppRole, status: profile.status }
    return { ok: true as const, account, supabase }
  } catch (error) {
    return { ok: false as const, status: 503, error: error instanceof Error ? error.message : "Authentication service unavailable" }
  }
}
