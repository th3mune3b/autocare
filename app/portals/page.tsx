import Link from "next/link"
import { CarFront, ChevronRight, ClipboardList, LayoutDashboard, Wrench } from "lucide-react"
const roles = [
  { href: "/dashboard", name: "Admin", description: "Operations, people, inventory and reports", icon: LayoutDashboard },
  { href: "/staff", name: "Staff / Service Advisor", description: "Customer intake, estimates and job cards", icon: ClipboardList },
  { href: "/mechanic", name: "Mechanic", description: "Assigned work, parts and progress updates", icon: Wrench },
  { href: "/customer", name: "Customer", description: "Bookings, approvals, invoices and history", icon: CarFront },
]
export default function Portals() { return <main className="grid min-h-screen place-items-center bg-background p-5"><section className="w-full max-w-4xl"><p className="text-sm font-bold uppercase tracking-[.18em] text-primary">AutoCare Pro</p><h1 className="mt-3 text-4xl font-extrabold tracking-tight">Role-based workspaces</h1><p className="mt-3 text-muted-foreground">Select a workspace to inspect the responsibilities and operational view for each role.</p><div className="mt-8 grid gap-4 sm:grid-cols-2">{roles.map(({ href, name, description, icon: Icon }) => <Link key={name} href={href} className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40"><div className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary"><Icon /></div><div className="min-w-0 flex-1"><h2 className="font-bold">{name}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p></div><ChevronRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" /></Link>)}</div></section></main> }
