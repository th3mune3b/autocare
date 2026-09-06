import { requireRole } from "@/lib/authorization"
export async function POST(){const auth=await requireRole(["admin"]);if(!auth.ok)return Response.json({error:auth.error},{status:auth.status});return Response.json({error:"Demo seeding is disabled in production. Create records through the protected workspace or run the reviewed Supabase seed script."},{status:409})}
