# AutoCare Pro – Workshop Management System

Production-oriented single-branch workshop management app built with Next.js/Vinext, Supabase Auth, PostgreSQL and Row Level Security.

## Local setup

1. Create a Supabase project.
2. Run `supabase/migrations/202609060001_autocare_pro.sql` in the Supabase SQL editor (or with the Supabase CLI).
3. Copy `.env.example` to `.env.local` and set the project URL, publishable key, server secret key and initial admin email.
4. Run `npm install` then `npm run dev`.

The first account whose email matches `INITIAL_ADMIN_EMAIL` can use the protected bootstrap action once to become Admin. Public signup always creates a Customer; Staff and Mechanic users are invited by an Admin.

## Environment variables

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are safe browser configuration. `SUPABASE_SECRET_KEY` is server-only and must never be exposed in client code or committed. Configure Supabase Auth email templates and add `/auth/callback?next=/dashboard` to the allowed redirect URLs.

## Scope

The current FYP supports a single branch, appointments, customer vehicles and history, repair jobs with controlled statuses, estimates and approvals, invoices, inventory, notifications and role-specific access. Online payments, automated WhatsApp/SMS and multi-branch operations remain future scope.

## Verification

`npm run build`, `npx tsc --noEmit` and `npm test` are the project checks. Without real Supabase environment variables the UI builds, but authentication and persistence intentionally return a configuration error instead of silently using demo data.
