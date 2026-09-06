"use client"
import Link from "next/link"
import { useEffect,useState } from "react"
import { FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
type Invoice={id:string;invoiceNumber:string;balanceDue:number;status:string}
export function InvoiceQuickAction(){const[invoice,setInvoice]=useState<Invoice|null>(null);useEffect(()=>{fetch("/api/workshop/invoices").then(async r=>r.ok?(await r.json()).records:[]).then(rows=>setInvoice(rows?.[0]??null)).catch(()=>undefined)},[]);if(!invoice)return null;return <aside className="fixed bottom-5 left-5 z-40 hidden max-w-xs rounded-2xl border border-border bg-white p-4 shadow-xl xl:block"><FileText className="size-5 text-primary"/><p className="mt-2 text-sm font-black">Latest invoice {invoice.invoiceNumber}</p><p className="mt-1 text-xs text-muted-foreground">Balance: PKR {Number(invoice.balanceDue).toLocaleString()}</p><Button asChild size="sm" variant="outline" className="mt-3 rounded-lg"><Link href={`/invoice/${invoice.id}`}>Open printable invoice</Link></Button></aside>}
