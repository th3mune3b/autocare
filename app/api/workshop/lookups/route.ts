import { requireRole } from "@/lib/authorization"
export async function GET() {
 const auth=await requireRole(["admin","staff","mechanic","customer"])
 if(!auth.ok)return Response.json({error:auth.error},{status:auth.status})
 const db=auth.supabase
 const operational=["admin","staff"].includes(auth.account.role)
 const queries = {
  customers: db.from("customers").select("id,full_name,customer_code").order("full_name").limit(250),
  vehicles: db.from("vehicles").select("id,customer_id,registration_number,make,model").order("registration_number").limit(250),
  ...(operational ? {
   employees:db.from("employees").select("id,employee_code,profiles!inner(full_name,role,status)").eq("profiles.status","active").limit(250),
   inspections:db.from("inspections").select("id,created_at,vehicles!inner(registration_number,customer_id)").order("created_at",{ascending:false}).limit(250),
   jobs:db.from("repair_jobs").select("id,job_number,customer_id").not("status","eq","cancelled").limit(250),
   estimates:db.from("estimates").select("id,estimate_number,customer_id,status").limit(250),
   profiles:db.from("profiles").select("id,full_name,email").eq("status","active").limit(250)
  } : {})
 }
 const entries=await Promise.all(Object.entries(queries).map(async([key,q])=>{const {data,error}=await q;if(error)throw error;return [key,data??[]]})).catch(()=>null)
 if(!entries)return Response.json({error:"Form options could not be loaded. Retry."},{status:503})
 return Response.json(Object.fromEntries(entries))
}

