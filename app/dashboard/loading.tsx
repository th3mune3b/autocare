import { Skeleton } from "@/components/ui/skeleton"
export default function Loading() { return <main className="space-y-6 p-8" aria-label="Loading workspace"><Skeleton className="h-16 w-full"/><div className="grid gap-4 sm:grid-cols-3">{[1,2,3].map(x=><Skeleton key={x} className="h-40"/>)}</div><Skeleton className="h-80"/></main> }

