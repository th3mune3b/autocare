import { requirePageRole } from "@/lib/page-authorization"
export default async function DashboardLayout({children}: {children: React.ReactNode}) {
  await requirePageRole(["admin", "staff", "mechanic", "customer"])
  return children
}

