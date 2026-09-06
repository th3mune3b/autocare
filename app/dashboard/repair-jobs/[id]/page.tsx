import Link from "next/link"
import {notFound} from "next/navigation"
import {z} from "zod"
import {requirePageRole} from "@/lib/page-authorization"
import {JobActions} from "@/components/job-actions"
export default async function JobPage({params}:{params:Promise<{id:string}>}) {
 const auth=await requirePageRole(["admin","staff","mechanic","customer"])
 const id=(await params).id;if(!z.string().uuid().safeParse(id).success)notFound()
 const db=auth.supabase
 const {data:job,error}=await db.from("repair_jobs").select("*,customers(full_name),vehicles(registration_number,make,model)").eq("id",id).maybeSingle()
 if(error)throw new Error("Job could not be loaded")
 if(!job)notFound()
 const operational=["admin","staff"].includes(auth.account.role)
 const [history,assignments,parts,invoices,directory,stock]=await Promise.all([
 db.from("job_status_history").select("*").eq("repair_job_id",id).order("changed_at",{ascending:false}).limit(100),
 db.from("job_assignments").select("id,assigned_at,employees(employee_code)").eq("repair_job_id",id).limit(100),
 db.from("inventory_transactions").select("id,quantity,created_at,parts(name,sku)").eq("repair_job_id",id).limit(100),
 auth.account.role!=="mechanic"?db.from("invoices").select("id,invoice_number,status,total,balance_due").eq("repair_job_id",id):Promise.resolve({data:[],error:null}),
 operational?db.from("employees").select("id,profiles!inner(full_name,role,status)").eq("profiles.role","mechanic").eq("profiles.status","active").limit(250):Promise.resolve({data:[],error:null}),
 auth.account.role!=="customer"?db.from("parts").select("id,name,stock_on_hand").eq("is_active",true).limit(250):Promise.resolve({data:[],error:null})
 ])
 if([history,assignments,parts,invoices,directory,stock].some(x=>x.error))throw new Error("Job details could not be loaded")
 return <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-8"><Link className="text-primary underline" href="/dashboard">Back to workspace</Link><header className="panel p-6"><p className="text-sm text-muted-foreground">AutoCare Pro · Job card</p><h1 className="mt-2 text-3xl font-bold">{job.job_number}</h1><p className="mt-2">{job.vehicles?.registration_number} · {job.vehicles?.make} {job.vehicles?.model} · {job.customers?.full_name}</p><p className="mt-3 capitalize">Status: {job.status.replaceAll("_"," ")} · Priority: {job.priority}</p></header><section className="panel space-y-3 p-6"><h2 className="text-xl font-bold">Service request</h2><p className="whitespace-pre-wrap">{job.complaint}</p><h3 className="font-semibold">Diagnosis</h3><p className="whitespace-pre-wrap">{job.diagnosis||"No diagnosis recorded."}</p>{job.promised_at&&<p>Promised delivery: {new Date(job.promised_at).toLocaleString("en-PK",{timeZone:"Asia/Karachi"})}</p>}</section>
 {auth.account.role!=="customer"&&<JobActions id={id} status={job.status} role={auth.account.role} mechanics={(directory.data??[]).map((x:any)=>({id:x.id,label:x.profiles.full_name}))} parts={(stock.data??[]).map(x=>({id:x.id,label:x.name+" · stock "+x.stock_on_hand}))}/>}
 <div className="grid gap-6 md:grid-cols-2"><section className="panel p-6"><h2 className="mb-4 text-xl font-bold">Status history</h2>{!history.data?.length?<p>No status changes yet.</p>:<ol className="space-y-3">{history.data.map(x=><li key={x.id}><p className="capitalize">{x.from_status?.replaceAll("_"," ")} → {x.to_status.replaceAll("_"," ")}</p><p className="text-sm text-muted-foreground">{new Date(x.changed_at).toLocaleString("en-PK",{timeZone:"Asia/Karachi"})}</p>{x.note&&<p>{x.note}</p>}</li>)}</ol>}</section><section className="panel p-6"><h2 className="mb-4 text-xl font-bold">Assigned mechanics</h2>{!assignments.data?.length?<p>No mechanics assigned.</p>:assignments.data.map((x:any)=><p key={x.id}>{x.employees?.employee_code??"Assigned mechanic"} · {new Date(x.assigned_at).toLocaleDateString()}</p>)}</section>{auth.account.role!=="customer"&&<section className="panel p-6"><h2 className="mb-4 text-xl font-bold">Parts usage</h2>{!parts.data?.length?<p>No parts used.</p>:parts.data.map((x:any)=><p key={x.id}>{x.parts?.name} ({x.parts?.sku}) · {Math.abs(Number(x.quantity))}</p>)}</section>}{auth.account.role!=="mechanic"&&<section className="panel p-6"><h2 className="mb-4 text-xl font-bold">Invoices</h2>{!invoices.data?.length?<p>No invoice issued.</p>:invoices.data.map(x=><Link className="block text-primary underline" key={x.id} href={"/invoice/"+x.id}>{x.invoice_number} · {x.status} · Balance PKR {Number(x.balance_due).toLocaleString()}</Link>)}</section>}</div></main>
}

