import { z } from "zod"
import { requireRole, type AppRole } from "@/lib/authorization"
import { createAdminClient } from "@/lib/supabase/admin"
import { resourceSchemas, financialTotals, type Resource } from "@/lib/workshop-validation"

const all: AppRole[] = ["admin","staff","mechanic","customer"]
const readRoles: Record<Resource, AppRole[]> = {
 customers:["admin","staff","customer"], vehicles:all, appointments:["admin","staff","customer"], employees:["admin"], "repair-jobs":all,
 parts:["admin","staff","mechanic"], inspections:["admin","staff"], estimates:["admin","staff","customer"], invoices:["admin","staff","customer"], notifications:all
}
const selections: Record<Resource,string> = {
 customers:"*", vehicles:"*,customers(full_name)", appointments:"*,customers(full_name),vehicles(registration_number,make,model)",
 employees:"*,profiles(full_name,email,phone,role,status)", "repair-jobs":"*,customers(full_name),vehicles(registration_number,make,model)",
 parts:"*", inspections:"*,vehicles(registration_number,customer_id)", estimates:"*,customers(full_name)", invoices:"*,customers(full_name),repair_jobs(job_number)", notifications:"*"
}
type Row = Record<string, any>
const table = (r: Resource) => r.replaceAll("-","_")
const camel = (s:string) => s.replace(/_([a-z])/g, (_,c:string)=>c.toUpperCase())
function present(r:Resource, row:Row) {
 const out:Row = {}
 for (const [k,v] of Object.entries(row)) if (v === null || typeof v !== "object") out[camel(k)] = v
 if (row.customers) out.customerName = row.customers.full_name
 if (row.vehicles) {out.registrationNumber=row.vehicles.registration_number;out.vehicle=[row.vehicles.make,row.vehicles.model].filter(Boolean).join(" ");out.customerId ??= row.vehicles.customer_id}
 if (r==="vehicles") out.vehicle=[row.make,row.model].join(" ")
 if (r==="employees") Object.assign(out, {fullName:row.profiles?.full_name,email:row.profiles?.email,phone:row.profiles?.phone,role:row.profiles?.role,status:row.profiles?.status})
 if(row.repair_jobs) out.jobNumber=row.repair_jobs.job_number
 return out
}
function fail(error:unknown,status=400) {return Response.json({error: error instanceof Error ? error.message : (error as Row)?.message ?? String(error)}, {status})}
function resourceOf(s:string): Resource | null {return Object.hasOwn(resourceSchemas,s) ? s as Resource : null}
type Context = {params:Promise<{resource:string}>}
export async function GET(request:Request,{params}:Context) {
 const r=resourceOf((await params).resource);if(!r)return fail("Unknown resource",404)
 const auth=await requireRole(readRoles[r]);if(!auth.ok)return fail(auth.error,auth.status)
 const id=new URL(request.url).searchParams.get("id")
 if(id&&!z.string().uuid().safeParse(id).success)return fail("Invalid record ID")
 let q=auth.supabase.from(table(r)).select(selections[r]).order("created_at",{ascending:false}).limit(250)
 if(id)q=q.eq("id",id)
 const {data,error}=await q;if(error)return fail(error)
 return Response.json({records:(data??[]).map(row=>present(r,row)),limit:250})
}
async function mutate(request:Request,context:Context,editing:boolean) {
 try {
 const r=resourceOf((await context.params).resource);if(!r)return fail("Unknown resource",404)
 const roles:AppRole[]=r==="employees"?["admin"]:!editing&&["vehicles","appointments"].includes(r)?["admin","staff","customer"]:["admin","staff"]
 const auth=await requireRole(roles);if(!auth.ok)return fail(auth.error,auth.status)
 const body=await request.json()
 const id=editing?z.string().uuid().parse(body.id):null
 const d=resourceSchemas[r].parse(body) as Row
 if(auth.account.role==="customer"){
   const {data,error}=await auth.supabase.from("customers").select("id").eq("profile_id",auth.account.id).single()
   if(error||!data||d.customerId!==data.id)return fail("Select your own customer account",403)
   if(r==="appointments")d.status="pending"
 }
 if(r==="employees"){
   if(editing) {
     const {data,error}=await auth.supabase.rpc("update_employee",{employee_id:id,details:d})
     if(error)return fail(error)
     return Response.json({record:present(r,data),message:"Employee updated"})
   }
   const admin=createAdminClient()
   const {data:invited,error}=await admin.auth.admin.inviteUserByEmail(d.email,{data:{full_name:d.fullName,phone:d.phone}})
   if(error||!invited.user)return fail(error??"Invitation failed")
   const {error:provisionError}=await admin.rpc("provision_employee",{user_id:invited.user.id,details:d})
   if(provisionError){await admin.auth.admin.deleteUser(invited.user.id);return fail(provisionError)}
   const {data:employee,error:readError}=await auth.supabase.from("employees").select(selections.employees).eq("profile_id",invited.user.id).single()
   if(readError)return fail("Invitation sent; reload employees to check provisioning",503)
   return Response.json({record:present(r,employee),message:"Employee invited by email"},{status:201})
 }
 const payload:Row={}
 for(const [k,v] of Object.entries(d))payload[k.replace(/[A-Z]/g,c=>"_"+c.toLowerCase())]=v===""?null:v
 if(["vehicles","appointments","repair-jobs"].includes(r)){
   const {data,error}=await auth.supabase.from("customers").select("id").eq("id",d.customerId).single()
   if(error||!data)return fail("Customer is unavailable")
 }
 if(r==="appointments"||r==="repair-jobs"){
   const {data,error}=await auth.supabase.from("vehicles").select("id").eq("id",d.vehicleId).eq("customer_id",d.customerId).single()
   if(error||!data)return fail("Vehicle must belong to the selected customer")
 }
 if(r==="repair-jobs"){
   const {data,error}=await auth.supabase.from("employees").select("id,profiles!inner(role,status)").eq("id",d.serviceAdvisorId).eq("profiles.role","staff").eq("profiles.status","active").single()
   if(error||!data)return fail("Select an active service advisor")
 }
 if(r==="estimates"){
   const {data,error}=await auth.supabase.from("inspections").select("id,vehicles!inner(customer_id)").eq("id",d.inspectionId).eq("vehicles.customer_id",d.customerId).single()
   if(error||!data)return fail("Inspection must belong to the selected customer's vehicle")
   payload.total=financialTotals(d as any).total
 }
 if(r==="invoices"){
   const {data,error}=await auth.supabase.from("repair_jobs").select("id").eq("id",d.repairJobId).eq("customer_id",d.customerId).single()
   if(error||!data)return fail("Repair job must belong to the selected customer")
   Object.assign(payload,financialTotals(d as any))
   payload.status=payload.balance_due===0?"paid":d.amountPaid>0?"partially_paid":"issued"
   if(!editing)payload.issued_at=new Date().toISOString()
 }
 if(r==="notifications"){
   const {data,error}=await auth.supabase.from("profiles").select("id").eq("id",d.userId).eq("status","active").single()
   if(error||!data)return fail("Select an active recipient")
   if(!editing){payload.status=d.channel==="in_app"?"sent":"queued";payload.sent_at=d.channel==="in_app"?new Date().toISOString():null}
 }
 if(r==="inspections"&&!editing)payload.inspected_by=auth.account.id
 if(r==="vehicles")payload.registration_number=d.registrationNumber.toUpperCase()
 if(r==="parts")payload.sku=d.sku.toUpperCase()
 if(!editing){
   const codes:Partial<Record<Resource,[string,string]>>={customers:["customer_code","CUS"],appointments:["appointment_number","APT"],"repair-jobs":["job_number","JOB"],estimates:["estimate_number","EST"],invoices:["invoice_number","INV"]}
   const c=codes[r];if(c)payload[c[0]]=c[1]+"-"+crypto.randomUUID().slice(0,8).toUpperCase()
   if(r==="appointments"){payload.created_by=auth.account.id;payload.source=auth.account.role==="customer"?"customer_portal":"staff"}
 }
 const q=editing?auth.supabase.from(table(r)).update(payload).eq("id",id!):auth.supabase.from(table(r)).insert(payload)
 const {data,error}=await q.select(selections[r]).single()
 if(error)return fail(error)
 return Response.json({record:present(r,data),message:editing?"Record updated":"Record created"},{status:editing?200:201})
 } catch(error) {return fail(error instanceof z.ZodError ? error.issues.map(i=>i.path.join(".")+": "+i.message).join("; ") : error)}
}
export const POST=(request:Request,context:Context)=>mutate(request,context,false)
export const PATCH=(request:Request,context:Context)=>mutate(request,context,true)
export async function DELETE(request:Request,{params}:Context) {
 const r=resourceOf((await params).resource);if(!r)return fail("Unknown resource",404)
 const auth=await requireRole(["admin"]);if(!auth.ok)return fail(auth.error,auth.status)
 const id=z.string().uuid().safeParse(new URL(request.url).searchParams.get("id"));if(!id.success)return fail("Invalid record ID")
 if(r==="employees")return fail("Deactivate employee accounts instead of deleting their history",409)
 const {data,error}=await auth.supabase.from(table(r)).delete().eq("id",id.data).select("id").single()
 if(error)return fail(error)
 return Response.json({record:data,message:"Record deleted"})
}

