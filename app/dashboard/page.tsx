import { WorkshopDashboard } from "@/components/workshop-dashboard"
import { DemoDataButton } from "@/components/demo-data-button"
import { CustomerEstimateAction } from "@/components/customer-estimate-action"
import { InvoiceQuickAction } from "@/components/invoice-quick-action"
export const dynamic = "force-dynamic"
export default function DashboardPage() { return <><WorkshopDashboard /><DemoDataButton /><CustomerEstimateAction /><InvoiceQuickAction /></> }
