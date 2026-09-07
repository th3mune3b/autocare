import { Toaster } from "@/components/ui/sonner"
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Auto-Repair Shop | Workshop Management System",
  description: "Manage appointments, job cards, mechanics, inventory, invoices, and vehicle service history from one secure workspace.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">{children}<Toaster richColors /></body>
    </html>
  );
}
