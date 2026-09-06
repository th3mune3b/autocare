import Link from "next/link"
export default function AccessDenied() {
  return <main className="grid min-h-screen place-items-center p-6"><section className="panel max-w-md p-8"><h1 className="text-2xl font-bold">Access denied</h1><p className="my-4">Your account cannot access this workspace.</p><Link className="text-primary underline" href="/dashboard">Return to your workspace</Link><form action="/auth/sign-out" method="post"><button className="mt-4 underline">Sign out</button></form></section></main>
}

