"use client"
import { useEffect, useState } from "react"
import { Database, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"

export function DemoDataButton() {
  return null
  /*
  const [visible, setVisible] = useState(false); const [loading, setLoading] = useState(false); const [message, setMessage] = useState("")
  useEffect(() => { Promise.all([fetch("/api/auth/session").then(r=>r.json()), fetch("/api/workshop/summary").then(r=>r.json())]).then(([session, summary]) => setVisible(session.account?.role === "admin" && Number(summary.customers ?? 0) === 0)).catch(()=>undefined) }, [])
  if (!visible) return null
  async function load() { setLoading(true); const response = await fetch("/api/workshop/demo", { method: "POST" }); const data = await response.json(); setMessage(response.ok ? data.message : data.error); setLoading(false); if (response.ok) setTimeout(()=>window.location.reload(), 900) }
  return <aside className="fixed bottom-5 right-5 z-50 max-w-sm rounded-2xl border border-primary/30 bg-white p-4 shadow-2xl"><button onClick={()=>setVisible(false)} className="absolute right-3 top-3 text-muted-foreground"><X className="size-4" /></button><Database className="size-6 text-primary" /><h2 className="mt-3 font-black">Load connected demo records</h2><p className="mt-1 pr-4 text-xs leading-5 text-muted-foreground">Populates the full appointment-to-invoice workflow for immediate FYP demonstration.</p>{message ? <p className="mt-3 text-xs font-bold text-primary">{message}</p> : <Button onClick={load} disabled={loading} size="sm" className="mt-3 rounded-lg">{loading && <Loader2 className="animate-spin" />} Load demo data</Button>}</aside>*/
}
