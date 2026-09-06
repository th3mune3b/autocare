import "server-only"
import { redirect } from "next/navigation"
import { requireRole, type AppRole } from "@/lib/authorization"

export async function requirePageRole(roles: AppRole[]) {
  const auth = await requireRole(roles)
  if (!auth.ok) {
    if (auth.status === 401) redirect("/sign-in")
    if (auth.status === 403) redirect("/access-denied")
    throw new Error("The authentication service is unavailable. Please retry.")
  }
  return auth
}

