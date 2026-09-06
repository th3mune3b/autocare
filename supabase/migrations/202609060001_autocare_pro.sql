create extension if not exists pgcrypto;
create schema if not exists private;

create type public.app_role as enum ('admin','staff','mechanic','customer');
create type public.record_status as enum ('active','inactive','suspended');
create type public.appointment_status as enum ('pending','confirmed','checked_in','completed','cancelled','no_show');
create type public.job_status as enum ('inspection','awaiting_approval','approved','in_repair','on_hold','quality_check','ready','delivered','cancelled');
create type public.estimate_status as enum ('draft','sent','approved','rejected','expired');
create type public.invoice_status as enum ('draft','issued','partially_paid','paid','void');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  phone text,
  role public.app_role not null default 'customer',
  status public.record_status not null default 'active',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles(id) on delete set null,
  customer_code text not null unique,
  full_name text not null,
  email text,
  phone text not null,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete restrict,
  employee_code text not null unique,
  designation text not null,
  specialization text,
  hire_date date not null,
  hourly_rate numeric(12,2) not null default 0 check(hourly_rate >= 0),
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  registration_number text not null unique,
  vin text unique,
  make text not null,
  model text not null,
  model_year int not null check(model_year between 1980 and 2100),
  color text,
  fuel_type text,
  transmission text,
  current_mileage int not null default 0 check(current_mileage >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.service_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  default_labor_hours numeric(6,2) not null default 0 check(default_labor_hours >= 0),
  default_price numeric(12,2) not null default 0 check(default_price >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  appointment_number text not null unique,
  customer_id uuid not null references public.customers(id) on delete restrict,
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  service_id uuid references public.service_catalog(id) on delete set null,
  scheduled_at timestamptz not null,
  complaint text not null check(length(complaint) >= 10),
  status public.appointment_status not null default 'pending',
  source text not null check(source in ('customer_portal','staff','walk_in')),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.inspections (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid references public.appointments(id) on delete set null,
  vehicle_id uuid not null references public.vehicles(id),
  inspected_by uuid not null references public.profiles(id),
  mileage int not null check(mileage >= 0),
  fuel_level int not null check(fuel_level between 0 and 100),
  findings text not null,
  recommended_work text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.estimates (
  id uuid primary key default gen_random_uuid(),
  estimate_number text not null unique,
  inspection_id uuid not null references public.inspections(id),
  customer_id uuid not null references public.customers(id),
  subtotal numeric(12,2) not null default 0 check(subtotal >= 0),
  discount numeric(12,2) not null default 0 check(discount >= 0),
  tax numeric(12,2) not null default 0 check(tax >= 0),
  total numeric(12,2) not null default 0 check(total >= 0),
  status public.estimate_status not null default 'draft',
  customer_decision_at timestamptz,
  customer_note text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.estimate_items (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid not null references public.estimates(id) on delete cascade,
  item_type text not null check(item_type in ('labor','part','service')),
  reference_id uuid,
  description text not null,
  quantity numeric(10,2) not null default 1 check(quantity > 0),
  unit_price numeric(12,2) not null check(unit_price >= 0),
  line_total numeric(12,2) generated always as (quantity * unit_price) stored
);

create table public.repair_jobs (
  id uuid primary key default gen_random_uuid(),
  job_number text not null unique,
  vehicle_id uuid not null references public.vehicles(id),
  customer_id uuid not null references public.customers(id),
  appointment_id uuid references public.appointments(id),
  estimate_id uuid references public.estimates(id),
  service_advisor_id uuid not null references public.employees(id),
  priority text not null default 'normal'
    check(priority in ('low','normal','high','urgent')),
  status public.job_status not null default 'inspection',
  complaint text not null,
  diagnosis text,
  promised_at timestamptz,
  completed_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.job_assignments (
  id uuid primary key default gen_random_uuid(),
  repair_job_id uuid not null references public.repair_jobs(id) on delete cascade,
  mechanic_id uuid not null references public.employees(id),
  assigned_by uuid not null references public.profiles(id),
  assigned_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  notes text,
  unique(repair_job_id, mechanic_id)
);

create table public.parts (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  brand text,
  unit text not null default 'piece',
  cost_price numeric(12,2) not null check(cost_price >= 0),
  sale_price numeric(12,2) not null check(sale_price >= 0),
  stock_on_hand numeric(12,2) not null default 0 check(stock_on_hand >= 0),
  reorder_level numeric(12,2) not null default 0 check(reorder_level >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  part_id uuid not null references public.parts(id),
  transaction_type text not null
    check(transaction_type in ('purchase','job_usage','return','adjustment_in','adjustment_out')),
  quantity numeric(12,2) not null check(quantity <> 0),
  unit_cost numeric(12,2),
  repair_job_id uuid references public.repair_jobs(id),
  reference text,
  note text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.job_labor (
  id uuid primary key default gen_random_uuid(),
  repair_job_id uuid not null references public.repair_jobs(id) on delete cascade,
  mechanic_id uuid not null references public.employees(id),
  service_id uuid references public.service_catalog(id),
  description text not null,
  hours numeric(7,2) not null check(hours > 0),
  hourly_rate numeric(12,2) not null check(hourly_rate >= 0),
  line_total numeric(12,2) generated always as (hours * hourly_rate) stored,
  created_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  repair_job_id uuid not null unique references public.repair_jobs(id),
  customer_id uuid not null references public.customers(id),
  subtotal numeric(12,2) not null check(subtotal >= 0),
  discount numeric(12,2) not null default 0 check(discount >= 0),
  tax numeric(12,2) not null default 0 check(tax >= 0),
  total numeric(12,2) not null check(total >= 0),
  amount_paid numeric(12,2) not null default 0 check(amount_paid >= 0),
  balance_due numeric(12,2) not null check(balance_due >= 0),
  status public.invoice_status not null default 'draft',
  issued_at timestamptz,
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  quantity numeric(10,2) not null check(quantity > 0),
  unit_price numeric(12,2) not null check(unit_price >= 0),
  line_total numeric(12,2) generated always as (quantity * unit_price) stored
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id),
  receipt_number text not null unique,
  amount numeric(12,2) not null check(amount > 0),
  method text not null check(method in ('cash','card','bank_transfer')),
  reference text,
  received_by uuid not null references public.profiles(id),
  paid_at timestamptz not null default now(),
  note text
);

create table public.job_status_history (
  id uuid primary key default gen_random_uuid(),
  repair_job_id uuid not null references public.repair_jobs(id) on delete cascade,
  from_status public.job_status,
  to_status public.job_status not null,
  note text,
  changed_by uuid not null references public.profiles(id),
  changed_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  channel text not null check(channel in ('in_app','email')),
  type text not null,
  title text not null,
  message text not null,
  entity_type text,
  entity_id uuid,
  status text not null default 'queued'
    check(status in ('queued','sent','failed','read')),
  sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_json jsonb,
  after_json jsonb,
  ip_address inet,
  created_at timestamptz not null default now()
);

create index vehicles_customer_idx on public.vehicles(customer_id);
create index appointments_customer_idx on public.appointments(customer_id);
create index appointments_vehicle_idx on public.appointments(vehicle_id);
create index appointments_schedule_idx on public.appointments(scheduled_at);
create index repair_jobs_customer_idx on public.repair_jobs(customer_id);
create index repair_jobs_vehicle_idx on public.repair_jobs(vehicle_id);
create index repair_jobs_status_idx on public.repair_jobs(status);
create index assignments_mechanic_idx on public.job_assignments(mechanic_id);
create index estimates_customer_idx on public.estimates(customer_id);
create index invoices_customer_idx on public.invoices(customer_id);
create index notifications_user_idx on public.notifications(user_id);
create index inventory_part_idx on public.inventory_transactions(part_id);

create function private.current_app_role()
returns public.app_role
language sql stable security definer set search_path=''
as $$
  select p.role
  from public.profiles p
  where p.id = (select auth.uid())
    and p.status = 'active'
$$;

create function private.current_customer_id()
returns uuid
language sql stable security definer set search_path=''
as $$
  select c.id
  from public.customers c
  where c.profile_id = (select auth.uid())
$$;

revoke execute on all functions in schema private from public;
grant usage on schema private to authenticated;
grant execute on function private.current_app_role() to authenticated;
grant execute on function private.current_customer_id() to authenticated;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  insert into public.profiles(id,email,full_name,phone,role)
  values(
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    new.raw_user_meta_data->>'phone',
    'customer'
  );

  insert into public.customers(
    profile_id,customer_code,full_name,email,phone
  )
  values(
    new.id,
    'CUS-' || upper(substr(replace(new.id::text,'-',''),1,8)),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'phone','Pending')
  );

  return new;
end
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path=''
as $$
begin
  new.updated_at = now();
  return new;
end
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','customers','employees','vehicles','service_catalog',
    'appointments','inspections','estimates','repair_jobs','parts','invoices'
  ]
  loop
    execute format(
      'create trigger set_%I_updated_at before update on public.%I
       for each row execute function public.set_updated_at()',
      t,t
    );
  end loop;
end
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','customers','employees','vehicles','service_catalog',
    'appointments','inspections','estimates','estimate_items','repair_jobs',
    'job_assignments','parts','inventory_transactions','job_labor',
    'invoices','invoice_items','payments','job_status_history',
    'notifications','audit_logs'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end
$$;

create policy profiles_self_select
on public.profiles for select to authenticated
using (
  profiles.id = (select auth.uid())
  or (select private.current_app_role()) in ('admin','staff')
);

create policy profiles_self_update
on public.profiles for update to authenticated
using (profiles.id = (select auth.uid()))
with check (
  profiles.id = (select auth.uid())
  and profiles.role = (
    select p.role from public.profiles p
    where p.id = (select auth.uid())
  )
);

create policy staff_manage_customers
on public.customers for all to authenticated
using ((select private.current_app_role()) in ('admin','staff'))
with check ((select private.current_app_role()) in ('admin','staff'));

create policy customer_read_self
on public.customers for select to authenticated
using (customers.profile_id = (select auth.uid()));

create policy staff_manage_vehicles
on public.vehicles for all to authenticated
using ((select private.current_app_role()) in ('admin','staff'))
with check ((select private.current_app_role()) in ('admin','staff'));

create policy customer_vehicles
on public.vehicles for all to authenticated
using (vehicles.customer_id = (select private.current_customer_id()))
with check (vehicles.customer_id = (select private.current_customer_id()));

create policy authenticated_services
on public.service_catalog for select to authenticated
using (true);

create policy admin_services
on public.service_catalog for all to authenticated
using ((select private.current_app_role()) = 'admin')
with check ((select private.current_app_role()) = 'admin');

create policy staff_appointments
on public.appointments for all to authenticated
using ((select private.current_app_role()) in ('admin','staff'))
with check ((select private.current_app_role()) in ('admin','staff'));

create policy customer_appointments
on public.appointments for select to authenticated
using (appointments.customer_id = (select private.current_customer_id()));

create policy customer_create_appointments
on public.appointments for insert to authenticated
with check (
  appointments.customer_id = (select private.current_customer_id())
  and appointments.created_by = (select auth.uid())
  and appointments.source = 'customer_portal'
);

create policy staff_inspections
on public.inspections for all to authenticated
using ((select private.current_app_role()) in ('admin','staff','mechanic'))
with check ((select private.current_app_role()) in ('admin','staff','mechanic'));

create policy staff_estimates
on public.estimates for all to authenticated
using ((select private.current_app_role()) in ('admin','staff'))
with check ((select private.current_app_role()) in ('admin','staff'));

create policy customer_estimates
on public.estimates for select to authenticated
using (estimates.customer_id = (select private.current_customer_id()));

create policy staff_estimate_items
on public.estimate_items for all to authenticated
using ((select private.current_app_role()) in ('admin','staff'))
with check ((select private.current_app_role()) in ('admin','staff'));

create policy customer_estimate_items
on public.estimate_items for select to authenticated
using (
  exists (
    select 1
    from public.estimates e
    where e.id = public.estimate_items.estimate_id
      and e.customer_id = (select private.current_customer_id())
  )
);

create policy staff_jobs
on public.repair_jobs for all to authenticated
using ((select private.current_app_role()) in ('admin','staff'))
with check ((select private.current_app_role()) in ('admin','staff'));

create policy customer_jobs
on public.repair_jobs for select to authenticated
using (repair_jobs.customer_id = (select private.current_customer_id()));

create policy mechanic_jobs
on public.repair_jobs for select to authenticated
using (
  exists (
    select 1
    from public.job_assignments ja
    join public.employees e on e.id = ja.mechanic_id
    where ja.repair_job_id = public.repair_jobs.id
      and e.profile_id = (select auth.uid())
  )
);

create policy admin_employees
on public.employees for all to authenticated
using ((select private.current_app_role()) = 'admin')
with check ((select private.current_app_role()) = 'admin');

create policy employee_self
on public.employees for select to authenticated
using (employees.profile_id = (select auth.uid()));

create policy staff_assignments
on public.job_assignments for all to authenticated
using ((select private.current_app_role()) in ('admin','staff'))
with check ((select private.current_app_role()) in ('admin','staff'));

create policy mechanic_assignments
on public.job_assignments for select to authenticated
using (
  exists (
    select 1
    from public.employees e
    where e.id = public.job_assignments.mechanic_id
      and e.profile_id = (select auth.uid())
  )
);

create policy workshop_parts_read
on public.parts for select to authenticated
using ((select private.current_app_role()) in ('admin','staff','mechanic'));

create policy staff_parts_write
on public.parts for all to authenticated
using ((select private.current_app_role()) in ('admin','staff'))
with check ((select private.current_app_role()) in ('admin','staff'));

create policy workshop_inventory
on public.inventory_transactions for select to authenticated
using ((select private.current_app_role()) in ('admin','staff','mechanic'));

create policy workshop_labor
on public.job_labor for select to authenticated
using ((select private.current_app_role()) in ('admin','staff','mechanic'));

create policy staff_invoices
on public.invoices for all to authenticated
using ((select private.current_app_role()) in ('admin','staff'))
with check ((select private.current_app_role()) in ('admin','staff'));

create policy customer_invoices
on public.invoices for select to authenticated
using (invoices.customer_id = (select private.current_customer_id()));

create policy staff_invoice_items
on public.invoice_items for all to authenticated
using ((select private.current_app_role()) in ('admin','staff'))
with check ((select private.current_app_role()) in ('admin','staff'));

create policy customer_invoice_items
on public.invoice_items for select to authenticated
using (
  exists (
    select 1
    from public.invoices i
    where i.id = public.invoice_items.invoice_id
      and i.customer_id = (select private.current_customer_id())
  )
);

create policy staff_payments
on public.payments for all to authenticated
using ((select private.current_app_role()) in ('admin','staff'))
with check ((select private.current_app_role()) in ('admin','staff'));

create policy customer_status_history
on public.job_status_history for select to authenticated
using (
  exists (
    select 1
    from public.repair_jobs j
    where j.id = public.job_status_history.repair_job_id
      and j.customer_id = (select private.current_customer_id())
  )
  or (select private.current_app_role()) in ('admin','staff','mechanic')
);

create policy notifications_self
on public.notifications for select to authenticated
using (
  notifications.user_id = (select auth.uid())
  or (select private.current_app_role()) in ('admin','staff')
);

create policy notifications_self_update
on public.notifications for update to authenticated
using (notifications.user_id = (select auth.uid()))
with check (notifications.user_id = (select auth.uid()));

create policy audit_admin
on public.audit_logs for select to authenticated
using ((select private.current_app_role()) = 'admin');