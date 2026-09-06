import Link from "next/link"
import { CalendarDays, CarFront, CheckCircle2, ChevronLeft, ClipboardList, FileText, PackageCheck, ShieldCheck, UserRound, Wrench } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

type PortalRole = "customer" | "mechanic" | "staff"

const content = {
  customer: {
    eyebrow: "Customer portal", title: "Your vehicles, repairs and records",
    intro: "Track active work, approve estimates and keep every service document in one place.",
    cards: [["My vehicles", "02", CarFront], ["Upcoming booking", "12 Sep", CalendarDays], ["Active repair", "01", Wrench], ["Unpaid balance", "PKR 0", FileText]],
  },
  mechanic: {
    eyebrow: "Mechanic workspace", title: "Assigned jobs and workshop progress",
    intro: "Record diagnosis, parts usage and repair milestones without losing the job-card trail.",
    cards: [["Assigned today", "05", ClipboardList], ["In progress", "02", Wrench], ["Awaiting parts", "01", PackageCheck], ["Completed today", "03", CheckCircle2]],
  },
  staff: {
    eyebrow: "Service advisor workspace", title: "Customer intake and job control",
    intro: "Manage appointments, inspections, approvals, job cards and vehicle delivery from one queue.",
    cards: [["Appointments", "08", CalendarDays], ["Checked in", "03", CarFront], ["Estimates pending", "03", ShieldCheck], ["Ready to deliver", "03", CheckCircle2]],
  },
} satisfies Record<PortalRole, { eyebrow: string; title: string; intro: string; cards: [string, string, typeof CarFront][] }>

export function RolePortal({ role }: { role: PortalRole }) {
  const item = content[role]
  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-primary text-white"><Wrench className="size-5" /></div><div><p className="font-bold">AutoCare Pro</p><p className="text-xs text-muted-foreground">{item.eyebrow}</p></div></div>
          <div className="flex items-center gap-2"><Button variant="outline" asChild className="rounded-xl"><Link href="/"><ChevronLeft /> Admin overview</Link></Button><div className="grid size-10 place-items-center rounded-xl bg-secondary text-secondary-foreground"><UserRound className="size-5" /></div></div>
        </header>

        <section className="py-8 md:py-12">
          <Badge variant="outline" className="rounded-full border-primary/30 bg-primary/5 px-3 py-1 text-primary">{item.eyebrow}</Badge>
          <h1 className="mt-4 max-w-3xl text-3xl font-extrabold tracking-tight md:text-5xl">{item.title}</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">{item.intro}</p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {item.cards.map(([label, value, Icon]) => <article key={label} className="metric-card"><div className="flex items-start justify-between"><div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="size-5" /></div><span className="text-3xl font-extrabold tracking-tight">{value}</span></div><p className="mt-6 text-sm font-semibold text-muted-foreground">{label}</p></article>)}
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
          <article className="panel overflow-hidden"><div className="panel-heading"><div><h2>{role === "customer" ? "Active repair" : "Priority work queue"}</h2><p>Latest verified job-card information</p></div><Badge className="rounded-md">Live</Badge></div>
            <div className="p-5 md:p-6"><div className="flex flex-wrap justify-between gap-4"><div><p className="font-mono text-xs font-bold text-primary">JOB-1048</p><h3 className="mt-2 text-xl font-bold">Honda Civic 2021 · LEA-218</h3><p className="mt-1 text-sm text-muted-foreground">Periodic service and front brake inspection</p></div><Badge variant="outline" className="h-fit rounded-lg px-3 py-1.5">In repair</Badge></div><div className="mt-8"><div className="mb-2 flex justify-between text-sm"><span className="font-semibold">Repair progress</span><span className="font-bold">72%</span></div><Progress value={72} className="h-2" /></div>
              <div className="mt-8 grid gap-3 sm:grid-cols-4">{["Checked in", "Approved", "In repair", "Quality check"].map((step, index) => <div key={step} className={`rounded-xl border p-3 text-sm font-semibold ${index < 3 ? "border-primary/25 bg-primary/5 text-primary" : "border-border text-muted-foreground"}`}>{step}</div>)}</div>
            </div>
          </article>
          <article className="panel"><div className="panel-heading"><div><h2>Next action</h2><p>Highest-priority task</p></div></div><div className="p-5"><div className="grid size-11 place-items-center rounded-xl bg-amber-500/10 text-amber-600"><ShieldCheck /></div><h3 className="mt-5 text-lg font-bold">{role === "customer" ? "Estimate ready for review" : role === "mechanic" ? "Record inspection findings" : "Send estimate for approval"}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Job JOB-1048 requires action before it can move to the next controlled stage.</p><Button className="mt-6 w-full rounded-xl">Open job card</Button></div></article>
        </section>
      </div>
    </main>
  )
}
