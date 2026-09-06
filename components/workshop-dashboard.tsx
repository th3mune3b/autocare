"use client"
import Link from "next/link"
import {useCallback,useEffect,useMemo,useRef,useState} from "react"
import {Activity,Bell,CalendarDays,ClipboardCheck,CarFront,FileText,LayoutDashboard,Loader2,LogOut,PackageSearch,Pencil,Plus,RefreshCw,ShieldCheck,Trash2,Users,Wrench} from "lucide-react"
import {toast} from "sonner"
import {Badge} from "@/components/ui/badge"
import {Button} from "@/components/ui/button"
import {Dialog,DialogContent,DialogDescription,DialogFooter,DialogHeader,DialogTitle} from "@/components/ui/dialog"
import {Input} from "@/components/ui/input"
import {Label} from "@/components/ui/label"
import {Skeleton} from "@/components/ui/skeleton"
import {Textarea} from "@/components/ui/textarea"
import {Sidebar,SidebarContent,SidebarFooter,SidebarGroup,SidebarGroupContent,SidebarGroupLabel,SidebarHeader,SidebarInset,SidebarMenu,SidebarMenuButton,SidebarMenuItem,SidebarProvider,SidebarTrigger} from "@/components/ui/sidebar"
import {Table,TableBody,TableCell,TableHead,TableHeader,TableRow} from "@/components/ui/table"
type Role = "admin" | "staff" | "mechanic" | "customer"
type Resource = "customers" | "vehicles" | "appointments" | "employees" | "repair-jobs" | "parts" | "estimates" | "invoices" | "notifications" | "inspections"
type RecordRow = Record<string, unknown> & { id: string }
type Session = { authenticated: boolean; identity?: { displayName: string; email: string }; account: null | { id: string; customerId?: string | null; fullName: string; email: string; role: Role }; canBootstrap: boolean; error?: string }
type Field = { key: string; label: string; type?: "text" | "email" | "number" | "date" | "datetime-local" | "textarea" | "select"; required?: boolean; options?: { value: string; label: string }[]; placeholder?: string }

const nav = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, roles: ["admin", "staff", "mechanic", "customer"] },
  { id: "inspections", label: "Inspections", icon: ClipboardCheck, roles: ["admin", "staff"] },
  { id: "appointments", label: "Appointments", icon: CalendarDays, roles: ["admin", "staff", "customer"] },
  { id: "customers", label: "Customers", icon: Users, roles: ["admin", "staff"] },
  { id: "vehicles", label: "Vehicles", icon: CarFront, roles: ["admin", "staff", "customer"] },
  { id: "repair-jobs", label: "Repair jobs", icon: Wrench, roles: ["admin", "staff", "mechanic", "customer"] },
  { id: "employees", label: "Employees", icon: ShieldCheck, roles: ["admin"] },
  { id: "parts", label: "Inventory", icon: PackageSearch, roles: ["admin", "staff", "mechanic"] },
  { id: "estimates", label: "Estimates", icon: ClipboardCheck, roles: ["admin", "staff", "customer"] },
  { id: "invoices", label: "Invoices", icon: FileText, roles: ["admin", "staff", "customer"] },
  { id: "notifications", label: "Notifications", icon: Bell, roles: ["admin", "staff", "mechanic", "customer"] },
  { id: "reports", label: "Reports", icon: Activity, roles: ["admin", "staff"] },
] as const

const titles: Record<string, [string, string]> = {
  inspections: ["Inspections", "Vehicle findings and recommendations"],
  overview: ["Workshop overview", "Live operational snapshot"], appointments: ["Appointments", "Bookings, confirmations and workshop arrivals"],
  customers: ["Customers", "Contact information and linked workshop records"], vehicles: ["Vehicles", "Registered vehicles and service ownership"],
  "repair-jobs": ["Repair jobs", "Inspection-to-delivery job-card control"], employees: ["Employees", "Service advisors and mechanics"],
  parts: ["Parts inventory", "Pricing, stock and reorder thresholds"], estimates: ["Estimates", "Customer approval and repair authorization"],
  invoices: ["Invoices", "Repair billing and outstanding balances"], notifications: ["Notifications", "In-app and email delivery queue"],
  reports: ["Reports", "Revenue, workload and inventory intelligence"],
}

const columns: Record<Resource, { key: string; label: string }[]> = {
  inspections: [{key:"registrationNumber",label:"Vehicle"},{key:"findings",label:"Findings"},{key:"mileage",label:"Mileage"},{key:"fuelLevel",label:"Fuel level"}],
  customers: [{ key: "customerCode", label: "Code" }, { key: "fullName", label: "Customer" }, { key: "phone", label: "Phone" }, { key: "email", label: "Email" }, { key: "address", label: "Address" }],
  vehicles: [{ key: "registrationNumber", label: "Registration" }, { key: "vehicle", label: "Vehicle" }, { key: "customerName", label: "Customer" }, { key: "modelYear", label: "Year" }, { key: "currentMileage", label: "Mileage" }],
  appointments: [{ key: "appointmentNumber", label: "Booking" }, { key: "scheduledAt", label: "Scheduled" }, { key: "customerName", label: "Customer" }, { key: "vehicle", label: "Vehicle" }, { key: "complaint", label: "Request" }, { key: "status", label: "Status" }],
  employees: [{ key: "employeeCode", label: "Code" }, { key: "fullName", label: "Employee" }, { key: "role", label: "Role" }, { key: "designation", label: "Designation" }, { key: "specialization", label: "Specialization" }, { key: "status", label: "Status" }],
  "repair-jobs": [{ key: "jobNumber", label: "Job" }, { key: "vehicle", label: "Vehicle" }, { key: "customerName", label: "Customer" }, { key: "priority", label: "Priority" }, { key: "complaint", label: "Complaint" }, { key: "status", label: "Status" }],
  parts: [{ key: "sku", label: "SKU" }, { key: "name", label: "Part" }, { key: "brand", label: "Brand" }, { key: "stockOnHand", label: "Stock" }, { key: "reorderLevel", label: "Reorder" }, { key: "salePrice", label: "Sale price" }],
  estimates: [{ key: "estimateNumber", label: "Estimate" }, { key: "customerName", label: "Customer" }, { key: "subtotal", label: "Subtotal" }, { key: "discount", label: "Discount" }, { key: "total", label: "Total" }, { key: "status", label: "Status" }],
  invoices: [{ key: "invoiceNumber", label: "Invoice" }, { key: "jobNumber", label: "Job" }, { key: "customerName", label: "Customer" }, { key: "total", label: "Total" }, { key: "amountPaid", label: "Paid" }, { key: "balanceDue", label: "Balance" }, { key: "status", label: "Status" }],
  notifications: [{ key: "createdAt", label: "Created" }, { key: "channel", label: "Channel" }, { key: "title", label: "Title" }, { key: "message", label: "Message" }, { key: "status", label: "Status" }],
}

function format(value: unknown, key: string) {
  if (value === null || value === undefined || value === "") return "—"
  if (["total", "subtotal", "discount", "tax", "amountPaid", "balanceDue", "salePrice", "costPrice"].includes(key)) return `PKR ${Number(value).toLocaleString()}`
  if (["scheduledAt", "issuedAt", "createdAt", "promisedAt"].includes(key)) { const date = new Date(String(value)); return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString([], { dateStyle: "medium", timeStyle: key === "scheduledAt" ? "short" : undefined }) }
  return String(value).replaceAll("_", " ")
}

function statusBadge(value: unknown) {
  const text = format(value, "status"); const positive = ["ready", "paid", "active", "completed", "confirmed", "sent", "approved"].includes(String(value));
  return <Badge variant="outline" className={`rounded-md capitalize ${positive ? "border-emerald-200 bg-emerald-50 text-emerald-700" : ""}`}>{text}</Badge>
}


export function WorkshopDashboard() {
 const [session,setSession]=useState<Session|null>(null)
 const [active,setActive]=useState<string>("overview")
 const [rows,setRows]=useState<RecordRow[]>([])
 const [summary,setSummary]=useState<Record<string,number>|null>(null)
 const [lookups,setLookups]=useState<Record<string,RecordRow[]>>({})
 const [loading,setLoading]=useState(true)
 const [message,setMessage]=useState("")
 const [formError,setFormError]=useState("")
 const [query,setQuery]=useState("")
 const [filter,setFilter]=useState("")
 const [sort,setSort]=useState("createdAt")
 const [dialogOpen,setDialogOpen]=useState(false)
 const [editing,setEditing]=useState<RecordRow|null>(null)
 const [deleting,setDeleting]=useState<RecordRow|null>(null)
 const [detail,setDetail]=useState<RecordRow|null>(null)
 const [form,setForm]=useState<Record<string,string>>({})
 const [saving,setSaving]=useState(false)
 const busy=useRef(false)
 const generation=useRef(0)
 const role=session?.account?.role??"customer"
 const availableNav=nav.filter(x=>(x.roles as readonly string[]).includes(role))
 const canWrite=role==="admin"||role==="staff"||role==="customer"&&["vehicles","appointments"].includes(active)
 const canEdit=role==="admin"||role==="staff"
 const isOverview=["overview","reports"].includes(active)
 const request=useCallback(async(url:string,init?:RequestInit)=>{
  const r=await fetch(url,{cache:"no-store",...init})
  const d=await r.json()
  if(!r.ok)throw new Error(d.error??"Request failed")
  return d
 },[])
 const loadLookups=useCallback(async()=>{
  const data=await request("/api/workshop/lookups")
  const normalized:Record<string,RecordRow[]>={}
  for(const [key,value] of Object.entries(data)) normalized[key]=(value as Record<string,any>[]).map(x=>({
   ...x,id:x.id,fullName:x.full_name??x.profiles?.full_name,customerCode:x.customer_code,
   customerId:x.customer_id??x.vehicles?.customer_id,registrationNumber:x.registration_number??x.vehicles?.registration_number,
   vehicle:[x.make,x.model].filter(Boolean).join(" "),role:x.profiles?.role,status:x.profiles?.status,
   employeeCode:x.employee_code,jobNumber:x.job_number,estimateNumber:x.estimate_number
  }))
  setLookups(normalized)
 },[request])
 const refresh=useCallback(async()=>{
  const version=++generation.current
  setLoading(true);setMessage("")
  try{
   const results=await Promise.all([
    request("/api/workshop/summary"),
    !["overview","reports"].includes(active)?request("/api/workshop/"+active):Promise.resolve(null)
   ])
   if(version!==generation.current)return
   setSummary(results[0])
   if(results[1])setRows(results[1].records)
  }catch(error){if(version===generation.current)setMessage(error instanceof Error?error.message:"Data could not be loaded")}
  finally{if(version===generation.current)setLoading(false)}
 },[active,request])
 useEffect(()=>{request("/api/auth/session").then(setSession).catch(e=>{setMessage(e.message);setLoading(false)})},[request])
 useEffect(()=>{if(session?.account)void refresh();return()=>{generation.current++}},[session,refresh])
 const filteredRows=useMemo(()=>rows.filter(row=>(!filter||String(row.status??row.priority??row.channel??"")===filter)&&Object.values(row).some(v=>String(v??"").toLowerCase().includes(query.toLowerCase()))).sort((a,b)=>String(a[sort]??"").localeCompare(String(b[sort]??""),undefined,{numeric:true})),[rows,query,filter,sort])
 const filterOptions=Array.from(new Set(rows.map(r=>String(r.status??r.priority??r.channel??"")).filter(Boolean)))
  function fieldsFor(resource: Resource): Field[] {
    const customerOptions = (lookups.customers ?? []).map(x => ({ value: String(x.id), label: `${x.fullName} · ${x.customerCode}` })); if (!customerOptions.length && role === "customer" && session?.account?.customerId) customerOptions.push({ value: session.account.customerId, label: "My customer account" }) ; const vehicleOptions = (lookups.vehicles ?? []).filter(x=>x.customerId===form.customerId).map(x => ({ value: String(x.id), label: `${x.registrationNumber} · ${x.vehicle ?? `${x.make} ${x.model}`}` })); const employeeOptions = (lookups.employees ?? []).filter(x => x.role === "staff" && x.status === "active").map(x => ({ value: String(x.id), label: `${x.fullName} · ${x.employeeCode}` }))
    const map: Record<Resource, Field[]> = {
      inspections: [{key:"vehicleId",label:"Vehicle",type:"select",options:(lookups.vehicles??[]).map(x=>({value:x.id,label:String(x.registrationNumber)})),required:true},{key:"mileage",label:"Mileage",type:"number",required:true},{key:"fuelLevel",label:"Fuel level (0?100)",type:"number",required:true},{key:"findings",label:"Findings",type:"textarea",required:true},{key:"recommendedWork",label:"Recommended work",type:"textarea"}],
      customers: [{ key: "fullName", label: "Full name", required: true }, { key: "email", label: "Email", type: "email" }, { key: "phone", label: "Phone", required: true }, { key: "address", label: "Address" }, { key: "notes", label: "Notes", type: "textarea" }],
      vehicles: [{ key: "customerId", label: "Customer", type: "select", options: customerOptions, required: true }, { key: "registrationNumber", label: "Registration number", required: true }, { key: "make", label: "Make", required: true }, { key: "model", label: "Model", required: true }, { key: "modelYear", label: "Model year", type: "number", required: true }, { key: "color", label: "Color" }, { key: "currentMileage", label: "Current mileage", type: "number", required: true }],
      appointments: [{ key: "customerId", label: "Customer", type: "select", options: customerOptions, required: true }, { key: "vehicleId", label: "Vehicle", type: "select", options: vehicleOptions, required: true }, { key: "scheduledAt", label: "Date and time", type: "datetime-local", required: true }, { key: "complaint", label: "Service request / complaint", type: "textarea", required: true }, { key: "status", label: "Status", type: "select", options: ["pending", "confirmed", "checked_in", "completed", "cancelled", "no_show"].map(x => ({ value: x, label: x.replaceAll("_", " ") })) }],
      employees: [{ key: "fullName", label: "Full name", required: true }, { key: "email", label: "Email", type: "email", required: true }, { key: "phone", label: "Phone", required: true }, { key: "role", label: "Role", type: "select", options: [{ value: "staff", label: "Service advisor / staff" }, { value: "mechanic", label: "Mechanic" }], required: true }, { key: "designation", label: "Designation", required: true }, { key: "specialization", label: "Specialization" }, { key: "hireDate", label: "Hire date", type: "date", required: true }, { key: "hourlyRate", label: "Hourly rate", type: "number", required: true }],
      "repair-jobs": [{key:"estimateId",label:"Linked estimate",type:"select",options:(lookups.estimates??[]).filter(x=>x.customerId===form.customerId).map(x=>({value:x.id,label:String(x.estimateNumber)}))},{ key: "customerId", label: "Customer", type: "select", options: customerOptions, required: true }, { key: "vehicleId", label: "Vehicle", type: "select", options: vehicleOptions, required: true }, { key: "serviceAdvisorId", label: "Service advisor", type: "select", options: employeeOptions, required: true }, { key: "complaint", label: "Complaint", type: "textarea", required: true }, { key: "diagnosis", label: "Diagnosis", type: "textarea" }, { key: "priority", label: "Priority", type: "select", options: ["low", "normal", "high", "urgent"].map(x => ({ value: x, label: x })) },  { key: "promisedAt", label: "Promised delivery", type: "datetime-local" }],
      parts: [{ key: "sku", label: "SKU", required: true }, { key: "name", label: "Part name", required: true }, { key: "brand", label: "Brand" }, { key: "unit", label: "Unit", required: true }, { key: "costPrice", label: "Cost price", type: "number", required: true }, { key: "salePrice", label: "Sale price", type: "number", required: true }, { key: "stockOnHand", label: "Opening stock", type: "number", required: true }, { key: "reorderLevel", label: "Reorder level", type: "number", required: true }],
      estimates: [{key:"status",label:"Status",type:"select",options:[{value:"draft",label:"Draft"},{value:"sent",label:"Send for approval"}]},{ key: "inspectionId", label: "Inspection", type:"select", options:(lookups.inspections??[]).filter(x=>x.customerId===form.customerId).map(x=>({value:x.id,label:String(x.registrationNumber)+" ? "+String(x.created_at)})), required: true }, { key: "customerId", label: "Customer", type: "select", options: customerOptions, required: true }, { key: "subtotal", label: "Subtotal", type: "number", required: true }, { key: "discount", label: "Discount", type: "number" }, { key: "tax", label: "Tax", type: "number" }, { key: "expiresAt", label: "Expiry date", type: "date" }],
      invoices: [{ key: "repairJobId", label: "Repair job", type:"select", options:(lookups.jobs??[]).filter(x=>x.customerId===form.customerId).map(x=>({value:x.id,label:String(x.jobNumber)})), required: true }, { key: "customerId", label: "Customer", type: "select", options: customerOptions, required: true }, { key: "subtotal", label: "Subtotal", type: "number", required: true }, { key: "discount", label: "Discount", type: "number" }, { key: "tax", label: "Tax", type: "number" }, { key: "amountPaid", label: "Amount paid", type: "number" }],
      notifications: [{ key: "userId", label: "Recipient", type:"select", options:(lookups.profiles??[]).map(x=>({value:x.id,label:String(x.fullName)+" ? "+String(x.email)})), required: true }, { key: "channel", label: "Channel", type: "select", options: [{ value: "in_app", label: "In-app" }, { value: "email", label: "Email queue" }] }, { key: "type", label: "Type", required: true }, { key: "title", label: "Title", required: true }, { key: "message", label: "Message", type: "textarea", required: true }],
    }; return map[resource]
  }


 async function openForm(row:RecordRow|null) {
  setEditing(row);setFormError("");setDialogOpen(true)
  const initial:Record<string,string>={customerId:role==="customer"?session?.account?.customerId??"":"",status:"pending",priority:"normal",unit:"piece",discount:"0",tax:"0",amountPaid:"0",channel:"in_app"}
  if(active==="estimates")initial.status="draft"
  if(row)for(const [k,v] of Object.entries(row)){
   initial[k]=v===null?"":String(v)
   if(["scheduledAt","promisedAt"].includes(k)&&v){
    const date=new Date(String(v));if(Number.isFinite(date.getTime()))initial[k]=new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16)
   }
  }
  setForm(initial)
  try{await loadLookups()}catch(e){setFormError(e instanceof Error?e.message:"Options unavailable")}
 }
 async function save(event:React.FormEvent) {
  event.preventDefault();if(busy.current)return;busy.current=true;setSaving(true);setFormError("")
  try {
   const payload:Record<string,unknown>={...form,...(editing?{id:editing.id}:{})}
   for(const key of ["scheduledAt","promisedAt"])if(payload[key])payload[key]=new Date(String(payload[key])).toISOString()
   const data=await request("/api/workshop/"+active,{method:editing?"PATCH":"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)})
   setRows(old=>editing?old.map(x=>x.id===data.record.id?data.record:x):[data.record,...old])
   setDialogOpen(false);toast.success(data.message)
   await refresh()
  }catch(e){setFormError(e instanceof Error?e.message:"Save failed")}
  finally{busy.current=false;setSaving(false)}
 }
 async function remove() {
  if(!deleting||busy.current)return;busy.current=true;setSaving(true)
  try{
   await request("/api/workshop/"+active+"?id="+deleting.id,{method:"DELETE"})
   setRows(old=>old.filter(x=>x.id!==deleting.id));setDeleting(null);toast.success("Record deleted");await refresh()
  }catch(e){setMessage(e instanceof Error?e.message:"Delete failed")}
  finally{busy.current=false;setSaving(false)}
 }
 async function decide(row:RecordRow,decision:string){
  if(busy.current)return;busy.current=true;setSaving(true)
  try{await request("/api/estimates/"+row.id+"/decision",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({decision})});toast.success("Decision saved");await refresh()}
  catch(e){setMessage(e instanceof Error?e.message:"Decision failed")}finally{busy.current=false;setSaving(false)}
 }
 function navigate(value:string){setActive(value);setRows([]);setQuery("");setFilter("");setMessage("");setDetail(null)}
 if(!session?.account)return <main className="grid min-h-screen place-items-center p-8">{message?<div role="alert">{message}<Button onClick={()=>window.location.reload()}>Retry</Button></div>:<Skeleton className="h-48 w-full max-w-lg"/>}</main>
 const [title,subtitle]=titles[active]
 return <SidebarProvider><Sidebar collapsible="icon"><SidebarHeader className="p-4"><Link href="/dashboard" className="flex items-center gap-3 font-bold"><Wrench className="text-primary"/>AutoCare Pro</Link></SidebarHeader><SidebarContent><SidebarGroup><SidebarGroupLabel>Workspace</SidebarGroupLabel><SidebarGroupContent><SidebarMenu>{availableNav.map(item=><SidebarMenuItem key={item.id}><SidebarMenuButton tooltip={item.label} isActive={active===item.id} onClick={()=>navigate(item.id)}><item.icon/><span>{item.label}</span></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></SidebarGroupContent></SidebarGroup></SidebarContent><SidebarFooter className="p-4"><p className="truncate font-semibold">{session.account.fullName}</p><p className="capitalize text-sm text-muted-foreground">{role}</p><form action="/auth/sign-out" method="post"><Button variant="outline" type="submit"><LogOut/>Sign out</Button></form></SidebarFooter></Sidebar><SidebarInset>
 <header className="flex flex-wrap items-center justify-between gap-3 border-b p-4 md:px-7"><div className="flex items-center gap-3"><SidebarTrigger/><div><h1 className="text-xl font-bold">{title}</h1><p className="text-sm text-muted-foreground">{subtitle}</p></div></div><div className="flex gap-2"><Button variant="outline" aria-label="Notifications" onClick={()=>navigate("notifications")}><Bell/>{summary?.unreadNotifications??"?"}</Button><Button variant="outline" aria-label="Refresh data" onClick={refresh} disabled={loading}><RefreshCw/></Button>{!isOverview&&canWrite&&<Button onClick={()=>openForm(null)}><Plus/>Add new</Button>}</div></header>
 <main className="min-w-0 p-4 md:p-7">{session.canBootstrap&&<Button className="mb-4" disabled={saving} onClick={async()=>{setSaving(true);try{await request("/api/auth/session",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"bootstrap"})});window.location.reload()}catch(e){setMessage(e instanceof Error?e.message:"Setup failed");setSaving(false)}}}>Initialize administrator account</Button>}
 {message&&<div role="alert" className="mb-4 rounded-xl border border-destructive p-4"><p>{message}</p><p className="text-sm">Saved records remain visible. Retry to refresh totals and lists.</p><Button variant="outline" onClick={refresh}>Retry</Button></div>}
 {isOverview?<Overview summary={summary} role={role} loading={loading} setActive={navigate}/>:<section className="panel overflow-hidden">
 <div className="flex flex-wrap gap-3 border-b p-4"><Input className="max-w-sm" aria-label="Search records" value={query} onChange={e=>setQuery(e.target.value)} placeholder={"Search "+title.toLowerCase()}/><select aria-label="Filter records" className="rounded-md border bg-background p-2" value={filter} onChange={e=>setFilter(e.target.value)}><option value="">All statuses</option>{filterOptions.map(x=><option key={x}>{x}</option>)}</select><select aria-label="Sort records" className="rounded-md border bg-background p-2" value={sort} onChange={e=>setSort(e.target.value)}><option value="createdAt">Created date</option>{columns[active as Resource].map(c=><option key={c.key} value={c.key}>{c.label}</option>)}</select><p className="self-center text-sm text-muted-foreground">{filteredRows.length} records ? latest 250 maximum</p></div>
 {loading?<div className="space-y-3 p-6">{[1,2,3,4].map(x=><Skeleton key={x} className="h-12"/>)}</div>:!filteredRows.length?<div className="p-12 text-center"><h2 className="font-bold">{message?"Records unavailable":"No records found"}</h2><p className="mt-2 text-muted-foreground">{query||filter?"Adjust your search or filters.":canWrite?"Use Add new to create a record.":"Your records will appear here when available."}</p></div>:<div className="overflow-x-auto"><Table><TableHeader><TableRow>{columns[active as Resource].map(c=><TableHead key={c.key}>{c.label}</TableHead>)}<TableHead>Actions</TableHead></TableRow></TableHeader><TableBody>{filteredRows.map(row=><TableRow key={row.id}>{columns[active as Resource].map(c=><TableCell key={c.key} className="max-w-64 break-words">{["status","priority","channel"].includes(c.key)?statusBadge(row[c.key]):format(row[c.key],c.key)}</TableCell>)}<TableCell><div className="flex flex-wrap gap-1">
 {active==="repair-jobs"?<Button asChild variant="outline" size="sm"><Link href={"/dashboard/repair-jobs/"+row.id}>Open job card</Link></Button>:active==="invoices"?<Button asChild variant="outline" size="sm"><Link href={"/invoice/"+row.id}>Open invoice</Link></Button>:<Button variant="outline" size="sm" onClick={()=>setDetail(row)}>Open</Button>}
 {active==="notifications"&&row.channel==="in_app"&&!row.readAt&&row.userId===session.account?.id&&<Button size="sm" disabled={saving} onClick={async()=>{setSaving(true);try{await request("/api/notifications/"+row.id+"/read",{method:"PATCH"});toast.success("Notification read");await refresh()}catch(e){setMessage(e instanceof Error?e.message:"Update failed")}finally{setSaving(false)}}}>Mark read</Button>}{canEdit&&<Button aria-label="Edit record" variant="ghost" size="icon" onClick={()=>openForm(row)}><Pencil/></Button>}
 {role==="admin"&&active!=="employees"&&<Button aria-label="Delete record" variant="ghost" size="icon" onClick={()=>setDeleting(row)}><Trash2/></Button>}
 {role==="customer"&&active==="estimates"&&row.status==="sent"&&<><Button size="sm" disabled={saving} onClick={()=>decide(row,"approved")}>Approve</Button><Button size="sm" variant="outline" disabled={saving} onClick={()=>decide(row,"rejected")}>Reject</Button></>}
 </div></TableCell></TableRow>)}</TableBody></Table></div>}</section>}
 </main></SidebarInset>
 {!isOverview&&<Dialog open={dialogOpen} onOpenChange={open=>!saving&&setDialogOpen(open)}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{editing?"Edit":"Add"} {title}</DialogTitle><DialogDescription>Enter the workshop record details.</DialogDescription></DialogHeader><form onSubmit={save}><div className="grid gap-4 sm:grid-cols-2">{fieldsFor(active as Resource).map(field=><div key={field.key} className={field.type==="textarea"?"sm:col-span-2":""}><Label htmlFor={field.key} className="mb-2">{field.label}{field.required?" *":""}</Label>{field.type==="select"?<SearchSelect id={field.key} value={form[field.key]??""} options={field.options??[]} required={field.required} disabled={saving||(role==="customer"&&field.key==="customerId")} onChange={value=>setForm(old=>({...old,[field.key]:value,...(field.key==="customerId"?{vehicleId:"",inspectionId:"",repairJobId:"",estimateId:""}:{})}))}/>:field.type==="textarea"?<Textarea id={field.key} value={form[field.key]??""} required={field.required} onChange={e=>setForm({...form,[field.key]:e.target.value})}/>:<Input id={field.key} type={field.type??"text"} step={field.type==="number"?"any":undefined} value={form[field.key]??""} required={field.required} onChange={e=>setForm({...form,[field.key]:e.target.value})}/>}</div>)}</div>{formError&&<div role="alert" className="my-4 text-destructive">{formError}<Button type="button" variant="outline" onClick={()=>loadLookups().then(()=>setFormError("")).catch(e=>setFormError(e.message))}>Retry options</Button></div>}<DialogFooter className="mt-6"><Button type="button" variant="outline" disabled={saving} onClick={()=>setDialogOpen(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving?<Loader2 className="animate-spin"/>:null}Save record</Button></DialogFooter></form></DialogContent></Dialog>}
 <Dialog open={!!detail} onOpenChange={open=>!open&&setDetail(null)}><DialogContent className="max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>Record details</DialogTitle><DialogDescription>{title}</DialogDescription></DialogHeader><dl className="space-y-3">{detail&&Object.entries(detail).filter(([key])=>!key.endsWith("Id")&&key!=="id").map(([key,value])=><div key={key}><dt className="text-sm capitalize text-muted-foreground">{key.replace(/[A-Z]/g,c=>" "+c.toLowerCase())}</dt><dd className="break-words">{format(value,key)}</dd></div>)}</dl></DialogContent></Dialog>
 <Dialog open={!!deleting} onOpenChange={open=>!saving&&!open&&setDeleting(null)}><DialogContent><DialogHeader><DialogTitle>Delete this record?</DialogTitle><DialogDescription>Linked workshop history may prevent deletion.</DialogDescription></DialogHeader><Button variant="outline" disabled={saving} onClick={()=>setDeleting(null)}>Cancel</Button><Button variant="destructive" disabled={saving} onClick={remove}>Delete</Button></DialogContent></Dialog>
 </SidebarProvider>
}
function SearchSelect({id,value,options,onChange,required,disabled}:{id:string;value:string;options:{value:string;label:string}[];onChange:(v:string)=>void;required?:boolean;disabled?:boolean}){
 const [search,setSearch]=useState("")
 const matches=options.filter(x=>x.value===value||x.label.toLowerCase().includes(search.toLowerCase()))
 return <div className="space-y-1"><Input aria-label={"Search "+id+" options"} placeholder="Search options" value={search} disabled={disabled} onChange={e=>setSearch(e.target.value)}/><select id={id} className="w-full rounded-md border bg-background p-2" value={value} disabled={disabled} required={required} onChange={e=>onChange(e.target.value)}><option value="">Select an option</option>{matches.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select>{!options.length&&<p className="text-xs text-muted-foreground">No eligible records. Create the related record first.</p>}</div>
}
function Overview({summary,role,loading,setActive}:{summary:Record<string,number>|null;role:Role;loading:boolean;setActive:(v:string)=>void}){
 const metrics:Record<string,[string,string]>={
 activeJobs:["Active repair jobs","repair-jobs"],todaysAppointments:["Today's appointments","appointments"],pendingEstimates:["Pending estimate approvals","estimates"],readyForDelivery:["Ready for delivery","repair-jobs"],customers:["Customers","customers"],vehicles:[role==="customer"?"My vehicles":"Registered vehicles","vehicles"],lowStock:["Low-stock parts","parts"],outstandingBalance:["Outstanding balance (PKR)","invoices"],collectedRevenue:["Collected revenue (PKR)","invoices"],
 assignedJobs:["Assigned jobs","repair-jobs"],inProgress:["Jobs in progress","repair-jobs"],waitingInspection:["Waiting for inspection","repair-jobs"],waitingQualityCheck:["Waiting for quality check","repair-jobs"],partsUsed:["Parts used by assigned jobs","parts"],upcomingAppointments:["Upcoming appointments","appointments"],outstandingInvoices:["Outstanding invoices","invoices"],completedServices:["Completed services","repair-jobs"]
 }
 const keys=role==="mechanic"?["assignedJobs","inProgress","waitingInspection","waitingQualityCheck","partsUsed"]:role==="customer"?["vehicles","upcomingAppointments","activeJobs","pendingEstimates","outstandingInvoices","completedServices"]:["activeJobs","todaysAppointments","pendingEstimates","readyForDelivery","customers","vehicles","lowStock","outstandingBalance","collectedRevenue"]
 if(loading&&!summary)return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{keys.map(x=><Skeleton key={x} className="h-40"/>)}</div>
 if(!summary)return <p>Dashboard totals are unavailable. Use Retry to load them.</p>
 return <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{keys.filter(k=>summary[k]!==undefined).map(k=><button key={k} onClick={()=>setActive(metrics[k][1])} className="metric-card text-left"><p className="text-sm text-muted-foreground">{metrics[k][0]}</p><p className="mt-4 text-3xl font-bold">{summary[k].toLocaleString()}</p></button>)}</section>
}
