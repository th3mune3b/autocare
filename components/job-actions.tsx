"use client"
import {useRef,useState} from "react"
import {useRouter} from "next/navigation"
import {toast} from "sonner"
import {Button} from "@/components/ui/button"
import {Input} from "@/components/ui/input"
const transitions:Record<string,string[]>={inspection:["awaiting_approval","cancelled"],awaiting_approval:["approved","cancelled"],approved:["in_repair","cancelled"],in_repair:["on_hold","quality_check"],on_hold:["in_repair","cancelled"],quality_check:["in_repair","ready"],ready:["delivered"]}
type Option={id:string;label:string}
export function JobActions({id,status,role,mechanics,parts}:{id:string;status:string;role:string;mechanics:Option[];parts:Option[]}){
 const router=useRouter();const lock=useRef(false);const [saving,setSaving]=useState(false);const [error,setError]=useState("")
 async function submit(event:React.FormEvent<HTMLFormElement>,action:string){
  event.preventDefault();if(lock.current)return;lock.current=true;setSaving(true);setError("")
  const form=event.currentTarget;const body=Object.fromEntries(new FormData(form))
  try{
   const r=await fetch("/api/repair-jobs/"+id+"/"+action,{method:action==="status"?"PATCH":"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)})
   const d=await r.json();if(!r.ok)throw new Error(d.error??"Update failed")
   toast.success(d.message);form.reset();router.refresh()
  }catch(e){setError(e instanceof Error?e.message:"Update failed")}finally{lock.current=false;setSaving(false)}
 }
 const stages=(transitions[status]??[]).filter(x=>role!=="mechanic"||["in_repair","on_hold","quality_check"].includes(x))
 return <section className="panel space-y-5 p-6"><h2 className="text-xl font-bold">Job actions</h2>{error&&<p role="alert" className="text-destructive">{error}</p>}{stages.length>0&&<form onSubmit={e=>submit(e,"status")} className="flex flex-wrap gap-3"><select aria-label="Next status" name="status" required className="rounded-md border bg-background p-2">{stages.map(x=><option key={x} value={x}>{x.replaceAll("_"," ")}</option>)}</select><Button disabled={saving}>Update status</Button></form>}{role!=="mechanic"&&<form onSubmit={e=>submit(e,"assignments")} className="flex flex-wrap gap-3"><OptionSelect name="mechanicId" options={mechanics}/><Button disabled={saving||!mechanics.length}>Assign mechanic</Button></form>}{["approved","in_repair","on_hold","quality_check"].includes(status)&&<form onSubmit={e=>submit(e,"parts")} className="flex flex-wrap gap-3"><OptionSelect name="partId" options={parts}/><Input aria-label="Quantity" name="quantity" type="number" min="0.01" step="0.01" required placeholder="Quantity" className="max-w-32"/><Input aria-label="Usage note" name="note" maxLength={300} placeholder="Usage note" className="max-w-xs"/><Button disabled={saving||!parts.length}>Record parts usage</Button></form>}</section>
}
function OptionSelect({name,options}:{name:string;options:Option[]}){
 const [search,setSearch]=useState("")
 return <div><Input aria-label={"Search "+name} placeholder="Search options" value={search} onChange={e=>setSearch(e.target.value)}/><select aria-label={name} name={name} required className="w-full rounded-md border bg-background p-2"><option value="">Select an option</option>{options.filter(x=>x.label.toLowerCase().includes(search.toLowerCase())).map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select></div>
}

