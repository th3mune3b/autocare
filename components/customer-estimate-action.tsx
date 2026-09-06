"use client"
import { useEffect, useState } from "react"
import { Check, ClipboardCheck, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"

type Estimate = { id: string; estimateNumber: string; status: string; total: number }
export function CustomerEstimateAction() {
  const [estimate, setEstimate] = useState<Estimate | null>(null); const [loading, setLoading] = useState(false); const [visible, setVisible] = useState(false)
  useEffect(()=>{ Promise.all([fetch("/api/auth/session").then(r=>r.json()),fetch("/api/workshop/estimates").then(r=>r.json())]).then(([session,data])=>{ const pending=(data.records??[]).find((x:Estimate)=>x.status==="sent"); if(session.account?.role==="customer"&&pending){setEstimate(pending);setVisible(true)}}).catch(()=>undefined)},[])
  if(!visible||!estimate) return null
  async function decide(decision:"approved"|"rejected"){if(!estimate)return;setLoading(true);const response=await fetch(`/api/estimates/${estimate.id}/decision`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({decision})});if(response.ok)setVisible(false);setLoading(false)}
  return <aside className="fixed bottom-5 right-5 z-50 max-w-sm rounded-2xl border border-amber-200 bg-white p-5 shadow-2xl"><ClipboardCheck className="size-6 text-amber-600"/><h2 className="mt-3 font-black">Estimate approval required</h2><p className="mt-1 text-sm text-muted-foreground">{estimate.estimateNumber} · PKR {Number(estimate.total).toLocaleString()}</p><div className="mt-4 flex gap-2"><Button onClick={()=>decide("approved")} disabled={loading} size="sm" className="rounded-lg">{loading?<Loader2 className="animate-spin"/>:<Check/>} Approve</Button><Button onClick={()=>decide("rejected")} disabled={loading} size="sm" variant="outline" className="rounded-lg"><X/> Reject</Button></div></aside>
}
