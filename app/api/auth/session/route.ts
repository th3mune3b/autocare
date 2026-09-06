import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export async function GET(){
  try{const supabase=await createClient();const {data:claims}=await supabase.auth.getClaims();const id=claims?.claims?.sub,email=String(claims?.claims?.email??"")
    if(!id)return Response.json({authenticated:false,account:null,canBootstrap:false},{status:401})
    const {data:profile}=await supabase.from("profiles").select("id,email,full_name,phone,role,status").eq("id",id).single()
    const {data:customer}=profile?.role==="customer"?await supabase.from("customers").select("id").eq("profile_id",id).maybeSingle():{data:null}
    const account=profile?.status==="active"?{id:profile.id,email:profile.email,fullName:profile.full_name,phone:profile.phone,role:profile.role,status:profile.status,customerId:customer?.id??null}:null
    const canBootstrap=Boolean(process.env.INITIAL_ADMIN_EMAIL&&email.toLowerCase()===process.env.INITIAL_ADMIN_EMAIL.toLowerCase()&&profile?.role!=="admin")
    return Response.json({authenticated:true,identity:{displayName:profile?.full_name??email,email},account,canBootstrap})
  }catch(error){return Response.json({authenticated:false,account:null,canBootstrap:false,error:error instanceof Error?error.message:"Session unavailable"},{status:503})}
}
export async function POST(request:Request){
  try{const supabase=await createClient();const {data:claims}=await supabase.auth.getClaims();const id=claims?.claims?.sub,email=String(claims?.claims?.email??"");if(!id)return Response.json({error:"Authentication required"},{status:401})
    const body=await request.json() as {action?:string};if(body.action!=="bootstrap")return Response.json({error:"Unknown action"},{status:400})
    if(!process.env.INITIAL_ADMIN_EMAIL||email.toLowerCase()!==process.env.INITIAL_ADMIN_EMAIL.toLowerCase())return Response.json({error:"This email is not authorized as the initial administrator"},{status:403})
    const admin=createAdminClient();const {data:userData,error:userError}=await supabase.auth.getUser();if(userError||!userData.user?.email_confirmed_at)return Response.json({error:"Verified email required"},{status:403});const {error}=await admin.rpc("bootstrap_administrator",{user_id:id});if(error)throw error
    await admin.from("audit_logs").insert({actor_user_id:id,action:"bootstrap_admin",entity_type:"profiles",entity_id:id})
    return Response.json({message:"Administrator account initialized"})
  }catch(error){return Response.json({error:error instanceof Error?error.message:"Admin setup failed"},{status:400})}
}
