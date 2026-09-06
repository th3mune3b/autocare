import {z} from "zod"
import {requireRole} from "@/lib/authorization"
export async function PATCH(_:Request,{params}:{params:Promise<{id:string}>}){
 const auth=await requireRole(["admin","staff","mechanic","customer"]);if(!auth.ok)return Response.json({error:auth.error},{status:auth.status})
 const id=z.string().uuid().safeParse((await params).id);if(!id.success)return Response.json({error:"Invalid notification"},{status:400})
 const {data,error}=await auth.supabase.rpc("read_notification",{notification_id:id.data})
 if(error)return Response.json({error:"Notification could not be marked read"},{status:400})
 return Response.json({record:data})
}
