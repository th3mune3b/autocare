import Link from "next/link"
import { AuthForm } from "@/components/auth-form"
export default function ResetPasswordPage(){return <main className="grid min-h-screen place-items-center bg-[#f6f7f8] p-5"><section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl"><Link href="/" className="font-black text-primary">Auto-Repair Shop</Link><h1 className="mt-7 text-3xl font-black">Choose new password</h1><AuthForm mode="reset"/></section></main>}
