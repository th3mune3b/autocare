import { requirePageRole } from "@/lib/page-authorization"
import { WorkshopDashboard } from "@/components/workshop-dashboard"
export async function RolePortal({role}: {role: "customer" | "mechanic" | "staff"}) {
  await requirePageRole([role])
  return <WorkshopDashboard />
}

