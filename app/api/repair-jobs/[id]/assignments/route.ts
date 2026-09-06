import {z} from "zod"
import {requireRole} from "@/lib/authorization"
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}) {
 const auth=await requireRole(["admin","staff"])
 if(!auth.ok)return Response.json({error:auth.error},{status:auth.status})
 try {
 const id=z.string().uuid().parse((await params).id)
 const d=z.object({mechanicId:z.string().uuid()}).parse(await request.json())
 const {data:job}=await auth.supabase.from("repair_jobs").select("id").eq("id",id).single()
 if(!job)return Response.json({error:"Job not found"},{status:404})
 const {data,error}=await auth.supabase.rpc("assign_mechanic",{job_id:id,employee_id:d.mechanicId})
 if(error)return Response.json({error:error.message},{status:409})
 return Response.json({record:data,message:"Job updated"})
 }catch{return Response.json({error:"Invalid request"},{status:400})}
}
