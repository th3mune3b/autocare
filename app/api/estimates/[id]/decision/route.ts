import {z} from "zod"
import {requireRole} from "@/lib/authorization"
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}) {
 const auth=await requireRole(["customer"])
 if(!auth.ok)return Response.json({error:auth.error},{status:auth.status})
 try {
 const id=z.string().uuid().parse((await params).id)
 const d=z.object({decision:z.enum(["approved","rejected"]),note:z.string().max(500).optional()}).parse(await request.json())
 const {data,error}=await auth.supabase.rpc("decide_estimate",{estimate_id:id,decision:d.decision,decision_note:d.note??null})
 if(error)return Response.json({error:error.message},{status:409})
 return Response.json({record:data,message:"Estimate decision saved"})
 }catch{return Response.json({error:"Invalid decision"},{status:400})}
}
