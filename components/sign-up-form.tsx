"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function SignUpForm({ defaultName, email }: { defaultName: string; email: string }) {
  const router = useRouter(); const [loading, setLoading] = useState(false); const [error, setError] = useState("")
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("")
    const form = new FormData(event.currentTarget)
    const response = await fetch("/api/auth/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ fullName: form.get("fullName"), phone: form.get("phone") }) })
    const data = await response.json() as { error?: string }
    if (!response.ok) { setError(data.error ?? "Account could not be created"); setLoading(false); return }
    router.push("/dashboard"); router.refresh()
  }
  return <form onSubmit={submit} className="mt-7 space-y-5"><div className="space-y-2"><Label htmlFor="fullName">Full name</Label><Input id="fullName" name="fullName" defaultValue={defaultName} required minLength={3} className="h-11 rounded-xl" /></div><div className="space-y-2"><Label htmlFor="email">Email address</Label><Input id="email" value={email} disabled className="h-11 rounded-xl bg-muted" /></div><div className="space-y-2"><Label htmlFor="phone">Phone number</Label><Input id="phone" name="phone" placeholder="03XX XXXXXXX" required minLength={10} className="h-11 rounded-xl" /></div>{error && <p className="rounded-xl bg-destructive/10 p-3 text-sm font-medium text-destructive">{error}</p>}<Button disabled={loading} className="h-12 w-full rounded-xl">{loading ? <Loader2 className="animate-spin" /> : <UserPlus />} Create customer account</Button><p className="text-center text-xs leading-5 text-muted-foreground">Staff and mechanic accounts are created by an administrator. Public role selection is intentionally disabled.</p></form>
}
