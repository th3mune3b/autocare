import Link from "next/link"
import { ArrowRight, BarChart3, CalendarCheck2, CarFront, CheckCircle2, ClipboardCheck, FileText, Gauge, Menu, PackageSearch, ShieldCheck, Users, Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"

const features = [
  { icon: CalendarCheck2, title: "Appointments", text: "Online bookings, service-advisor scheduling and check-in control." },
  { icon: ClipboardCheck, title: "Digital job cards", text: "Inspection, estimates, approvals and controlled repair stages." },
  { icon: Wrench, title: "Mechanic workspace", text: "Assignments, diagnosis, labor time, parts usage and completion updates." },
  { icon: PackageSearch, title: "Inventory control", text: "Stock levels, reorder warnings and a traceable parts movement ledger." },
  { icon: FileText, title: "Invoices & history", text: "Labor and parts billing linked to each vehicle’s complete service history." },
  { icon: BarChart3, title: "Workshop reports", text: "Operational, revenue, workload and inventory insight for management." },
]
const roles = [
  ["Admin", "Control users, inventory, finances, reports and system settings."],
  ["Service advisor", "Manage customers, bookings, inspections, estimates and delivery."],
  ["Mechanic", "View assigned work and record repair progress with accountability."],
  ["Customer", "Book service, approve estimates and track vehicles, invoices and history."],
]

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#f6f7f8] text-[#182027]">
      <header className="sticky top-0 z-30 border-b border-black/5 bg-[#f6f7f8]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link href="/" className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-primary text-white shadow-[0_8px_25px_rgba(241,90,36,.25)]"><Wrench className="size-5" /></div><div><p className="font-extrabold tracking-tight">Auto-Repair Shop</p><p className="text-[11px] text-muted-foreground">Workshop Management System</p></div></Link>
          <nav className="hidden items-center gap-7 text-sm font-semibold md:flex"><a href="#platform" className="hover:text-primary">Platform</a><a href="#workflow" className="hover:text-primary">Workflow</a><a href="#roles" className="hover:text-primary">User roles</a><a href="#security" className="hover:text-primary">Security</a></nav>
          <div className="flex items-center gap-2"><Button variant="ghost" asChild className="hidden rounded-xl sm:inline-flex"><Link href="/sign-in">Sign in</Link></Button><Button asChild className="rounded-xl"><Link href="/sign-up">Create account <ArrowRight /></Link></Button></div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-black/5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(241,90,36,.13),transparent_35%),linear-gradient(rgba(24,32,39,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(24,32,39,.035)_1px,transparent_1px)] bg-[size:auto,42px_42px,42px_42px]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 lg:grid-cols-[.86fr_1.14fr] lg:px-8 lg:py-28">
          <div><div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white px-3 py-1.5 text-xs font-bold text-primary shadow-sm"><ShieldCheck className="size-4" /> One secure workshop workspace</div><h1 className="mt-6 max-w-2xl text-5xl font-black leading-[1.03] tracking-[-.045em] sm:text-6xl">Every repair, part and payment—under control.</h1><p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">Auto-Repair Shop connects customers, service advisors, mechanics and management across the complete vehicle-service lifecycle.</p><div className="mt-8 flex flex-wrap gap-3"><Button size="lg" asChild className="h-12 rounded-xl px-6"><Link href="/sign-up">Set up your account <ArrowRight /></Link></Button><Button size="lg" variant="outline" asChild className="h-12 rounded-xl bg-white px-6"><Link href="/dashboard">Open workspace</Link></Button></div><div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-muted-foreground">{["Role-based access", "Complete audit trail", "Single-branch focused"].map(item => <span key={item} className="flex items-center gap-2"><CheckCircle2 className="size-4 text-emerald-600" />{item}</span>)}</div></div>

          <div className="rounded-[28px] border border-black/10 bg-white p-8 shadow-xl"><p className="text-sm font-bold text-primary">Connected workshop workflow</p><h2 className="mt-3 text-2xl font-bold">From booking to delivery</h2><div className="mt-6 grid gap-3">{["Book an appointment", "Inspect the vehicle", "Review the estimate", "Track repair progress", "View the invoice"].map(label => <div key={label} className="rounded-xl border p-4 font-semibold">{label}</div>)}</div><p className="mt-6 text-sm text-muted-foreground">Sign in to view your workshop records and service updates.</p></div>
        </div>
      </section>

      <section id="platform" className="mx-auto max-w-7xl px-5 py-20 lg:px-8"><div className="max-w-2xl"><p className="section-kicker">Complete platform</p><h2 className="section-title">Built around actual workshop work—not disconnected forms.</h2><p className="section-copy">Every record stays linked from customer and vehicle to job card, consumed parts, invoice and service history.</p></div><div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{features.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-2xl border border-black/8 bg-white p-6 shadow-[0_12px_35px_rgba(24,32,39,.045)]"><div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary"><Icon /></div><h3 className="mt-6 text-lg font-extrabold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></article>)}</div></section>

      <section id="workflow" className="bg-[#182027] py-20 text-white"><div className="mx-auto max-w-7xl px-5 lg:px-8"><p className="section-kicker text-orange-400">Controlled workflow</p><h2 className="section-title max-w-3xl text-white">No job skips approval, accountability or quality control.</h2><div className="mt-12 grid gap-3 md:grid-cols-5">{[["01", "Appointment"], ["02", "Inspection"], ["03", "Estimate approval"], ["04", "Repair & QC"], ["05", "Invoice & delivery"]].map(([number, label]) => <div key={number} className="rounded-2xl border border-white/10 bg-white/5 p-5"><p className="font-mono text-sm font-bold text-orange-400">{number}</p><p className="mt-12 font-bold">{label}</p></div>)}</div></div></section>

      <section id="roles" className="mx-auto max-w-7xl px-5 py-20 lg:px-8"><div className="grid gap-12 lg:grid-cols-[.7fr_1.3fr]"><div><p className="section-kicker">Role-based experience</p><h2 className="section-title">The right information for each person.</h2><p className="section-copy">Permissions are enforced on the server, not hidden with cosmetic frontend conditions.</p></div><div className="grid gap-4 sm:grid-cols-2">{roles.map(([title, text], i) => <article key={title} className="rounded-2xl border border-black/8 bg-white p-6"><div className="flex items-center justify-between"><span className="font-mono text-xs font-black text-primary">0{i + 1}</span><Users className="size-5 text-muted-foreground" /></div><h3 className="mt-8 text-xl font-extrabold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></article>)}</div></div></section>

      <section id="security" className="mx-5 mb-20 lg:mx-8"><div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 rounded-[28px] bg-primary p-8 text-white sm:p-12 lg:flex-row lg:items-center"><div><p className="text-sm font-bold uppercase tracking-[.16em] text-white/70">Ready to work</p><h2 className="mt-3 max-w-2xl text-3xl font-black tracking-tight sm:text-4xl">Start with clean data and controlled access.</h2></div><Button size="lg" variant="secondary" asChild className="h-12 rounded-xl bg-white px-6 text-[#182027] hover:bg-white/90"><Link href="/sign-up">Create customer account <ArrowRight /></Link></Button></div></section>

      <footer className="border-t border-black/8 bg-white"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 px-5 py-8 text-sm text-muted-foreground sm:flex-row lg:px-8"><p>© 2026 Auto-Repair Shop. Final Year Project.</p><div className="flex gap-5"><Link href="/sign-in">Sign in</Link><Link href="/dashboard">Workspace</Link><a href="#platform">Platform</a></div></div></footer>
    </main>
  )
}
