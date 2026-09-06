import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
export async function GET(request:Request){const url=new URL(request.url),code=url.searchParams.get("code"),next=url.searchParams.get("next")??"/dashboard",safeNext=next.startsWith("/")&&!next.startsWith("//")?next:"/dashboard";if(code){const supabase=await createClient();const {error}=await supabase.auth.exchangeCodeForSession(code);if(!error)return NextResponse.redirect(new URL(safeNext,url.origin))}return NextResponse.redirect(new URL("/sign-in?error=confirmation_failed",url.origin))}
