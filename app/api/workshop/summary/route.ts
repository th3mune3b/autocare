import { requireRole } from "@/lib/authorization"
export async function GET() {
 const auth=await requireRole(["admin","staff","mechanic","customer"])
 if(!auth.ok)return Response.json({error:auth.error},{status:auth.status})
 const {data,error}=await auth.supabase.rpc("workshop_summary")
 if(error)return Response.json({error:"Dashboard totals could not be loaded. Check database migrations and retry."},{status:503})
 return Response.json(data)
}

