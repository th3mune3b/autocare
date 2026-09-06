"use client"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, LogIn, Mail, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"

type Mode = "sign-in" | "sign-up" | "forgot" | "reset"
export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter(); const [loading,setLoading]=useState(false); const [error,setError]=useState(""); const [success,setSuccess]=useState("")
  async function submit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();setLoading(true);setError("");setSuccess("");const form=new FormData(event.currentTarget)
    try{const supabase=createClient()
      if(mode==="sign-in"){const {error}=await supabase.auth.signInWithPassword({email:String(form.get("email")),password:String(form.get("password"))});if(error)throw error;router.replace("/dashboard");router.refresh()}
      else if(mode==="sign-up"){const password=String(form.get("password")), confirmation=String(form.get("confirmPassword"));if(password!==confirmation)throw new Error("Passwords do not match");const {data,error}=await supabase.auth.signUp({email:String(form.get("email")),password,options:{emailRedirectTo:`${window.location.origin}/auth/callback?next=/dashboard`,data:{full_name:String(form.get("fullName")),phone:String(form.get("phone"))}}});if(error)throw error;if(data.session){router.replace("/dashboard");router.refresh()}else setSuccess("Account created. Please check your email to verify the account.")}
      else if(mode==="forgot"){const {error}=await supabase.auth.resetPasswordForEmail(String(form.get("email")),{redirectTo:`${window.location.origin}/auth/callback?next=/reset-password`});if(error)throw error;setSuccess("Password reset link email kar diya gaya hai.")}
      else{const password=String(form.get("password")),confirmation=String(form.get("confirmPassword"));if(password!==confirmation)throw new Error("Passwords do not match");const {error}=await supabase.auth.updateUser({password});if(error)throw error;setSuccess("Password updated. You can continue to the dashboard.")}
    }catch(cause){setError(cause instanceof Error?cause.message:"Request could not be completed")}finally{setLoading(false)}}
  const isSignup=mode==="sign-up",isForgot=mode==="forgot",isReset=mode==="reset"
  return <form onSubmit={submit} className="mt-7 space-y-5">
    {isSignup&&<div className="space-y-2"><Label htmlFor="fullName">Full name</Label><Input id="fullName" name="fullName" autoComplete="name" required minLength={3} maxLength={80} className="h-11 rounded-xl"/></div>}
    {isSignup&&<div className="space-y-2"><Label htmlFor="phone">Phone number</Label><Input id="phone" name="phone" autoComplete="tel" placeholder="03XX XXXXXXX" required minLength={10} maxLength={20} className="h-11 rounded-xl"/></div>}
    {!isReset&&<div className="space-y-2"><Label htmlFor="email">Email address</Label><Input id="email" name="email" type="email" autoComplete="email" required className="h-11 rounded-xl"/></div>}
    {!isForgot&&<div className="space-y-2"><Label htmlFor="password">{isReset?"New password":"Password"}</Label><Input id="password" name="password" type="password" autoComplete={isSignup?"new-password":"current-password"} required minLength={8} className="h-11 rounded-xl"/></div>}
    {(isSignup||isReset)&&<div className="space-y-2"><Label htmlFor="confirmPassword">Confirm password</Label><Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} className="h-11 rounded-xl"/></div>}
    {mode==="sign-in"&&<div className="text-right"><Link href="/forgot-password" className="text-sm font-bold text-primary">Forgot password?</Link></div>}
    {error&&<p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm font-medium text-destructive">{error}</p>}{success&&<p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-800">{success}</p>}
    <Button disabled={loading} className="h-12 w-full rounded-xl">{loading?<Loader2 className="animate-spin"/>:isSignup?<UserPlus/>:isForgot?<Mail/>:<LogIn/>}{isSignup?"Create customer account":isForgot?"Send reset link":isReset?"Update password":"Sign in"}</Button>
    {isSignup&&<p className="text-center text-xs leading-5 text-muted-foreground">Staff aur mechanic accounts sirf Admin create kar sakta hai. Public role selection intentionally disabled hai.</p>}
  </form>
}
