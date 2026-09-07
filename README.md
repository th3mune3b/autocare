# Auto-Repair Shop

Single-branch workshop management with Next.js App Router, TypeScript, Tailwind, Supabase Auth/PostgreSQL, RLS, and Zod.

## Setup

1. Install dependencies with `npm ci` (Node 22.13+).
2. Copy `.env.example` to `.env.local` and configure your Supabase project.
3. Apply migrations in filename order through the Supabase SQL Editor or Supabase CLI:
   - `supabase/migrations/202609060001_autocare_pro.sql` for a new database only.
   - `supabase/migrations/202609060002_workshop_integrity.sql` for the hardened policies, relationship checks, transactional actions, and summary function.
   Existing databases that already have the first migration need only the second. Migrations contain no sample operational records.
4. Configure Supabase Auth site URL and allow `http://localhost:3000/auth/callback` plus the deployed site's callback URL. Enable email confirmation and configure production SMTP in Supabase.
5. Run `npm run dev`.

Set `INITIAL_ADMIN_EMAIL` to the first administrator's email before signup. Sign up, confirm the email, sign in, and choose **Initialize administrator account** in the workspace. The server verifies the configured email and database initialization permits only one bootstrap. Public signup always creates a Customer. Admins invite Staff and Mechanics through Employees; invitations use Supabase Auth email delivery.

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are browser configuration. `SUPABASE_SECRET_KEY` is server-only and is used for employee invitations and administrator initialization. Never commit `.env.local`; the checked-in example contains no credentials.

## Workflow

- Create customers and their vehicles, then appointments.
- Record an inspection for the vehicle, create its estimate, and change the estimate from Draft to Send for approval.
- The customer approves or rejects sent estimates from their workspace. Expired and finalized estimates cannot be approved again.
- Create a repair job with the same customer/vehicle, an active Staff service advisor, and the linked estimate. Open its job card to assign active Mechanics and move through the workflow.
- Approval requires a customer-approved estimate. Mechanics can progress only assigned jobs through repair, hold, and quality-check stages. Staff/Admin manage approval, readiness, and delivery.
- Record parts usage on the job card. Stock deduction and the inventory ledger entry commit together; insufficient stock rolls back the action.
- Create an invoice using a valid job. Record amounts actually collected offline in Amount paid. This is manual bookkeeping, not an online payment gateway. Totals and balances are recomputed in PostgreSQL; delivery requires a paid invoice.
- Notifications support in-app messages, read indicators, and an email queue. Queued email is **not sent automatically** by this repository; a delivery worker/provider is required before advertising notification email delivery. Employee invitation and password-reset emails are handled separately by Supabase Auth.

Operational lists show the latest 250 records with local search, filters, sorting, and details. Relationship options are bounded at 250 and searchable within the loaded set. Summaries aggregate the full authorized database rather than those bounded lists. The workshop day uses Asia/Karachi.

## Authorization and integrity

Page guards protect the dashboard, role entry pages, job cards, and invoices. APIs check active roles independently. RLS scopes customers to owned records and mechanics to assigned jobs. PostgreSQL functions validate permissions again for stock, workflow, assignments, and estimate decisions. The public landing and portals pages contain only product information.

Successful writes return full persisted display records. The dashboard inserts/replaces them locally, refetches records and totals, and retains saved rows if refresh fails. Errors stay visible with retry actions. Employee deletion is unavailable to preserve identity/history; contact fields and operational employee details can be edited.

## Verification

- `npm run build`: production Next.js build and TypeScript validation.
- `npm test`: production build followed by Node test suites.
- `node --test tests/workshop-database.test.mjs`: isolated PostgreSQL migrations, CRUD for all nine resources, ownership, RLS, approval, stock rollback, and invoice checks.
- UI tests mock network responses; database tests use PGlite with an emulated Supabase Auth schema. They do not create records or send email in your live project.

Live role-session checks, production SMTP, and deployment require the configured external services. Apply the migration before running the updated app against an existing Supabase project.

## Vercel

Import the repository into Vercel and select the **Next.js** framework preset. Use `npm run build`; keep the default Next.js output directory (do not set `dist`). Set the environment variables from `.env.example` in Vercel, using the deployment URL for `NEXT_PUBLIC_SITE_URL`. Add that URL to Supabase Auth's site/redirect settings, apply the migrations, and deploy.

Online payment gateways, WhatsApp/SMS integrations, and multi-branch operation remain future scope.

