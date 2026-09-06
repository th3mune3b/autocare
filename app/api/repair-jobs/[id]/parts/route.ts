import {z} from "zod"
import {requireRole} from "@/lib/authorization"
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}) {
 const auth=await requireRole(["admin","staff","mechanic"])
 if(!auth.ok)return Response.json({error:auth.error},{status:auth.status})
 try {
 const id=z.string().uuid().parse((await params).id)
 const d=z.object({partId:z.string().uuid(),quantity:z.coerce.number().finite().positive(),note:z.string().max(300).optional()}).parse(await request.json())
 const {data:job}=await auth.supabase.from("repair_jobs").select("id").eq("id",id).single()
 if(!job)return Response.json({error:"Job not found"},{status:404})
 const {data,error}=await auth.supabase.rpc("consume_job_part",{job_id:id,part_id:d.partId,used_quantity:d.quantity,usage_note:d.note??null})
 if(error)return Response.json({error:error.message},{status:409})
 return Response.json({record:data,message:"Job updated"})
 }catch{return Response.json({error:"Invalid request"},{status:400})}
}
