
-- Apply after 202609060001_autocare_pro.sql. No demo records.
create or replace function private.current_customer_id() returns uuid
language sql stable security definer set search_path='' as $$
 select c.id from public.customers c join public.profiles p on p.id=c.profile_id
 where p.id=auth.uid() and p.status='active' and p.role='customer'
$$;
create function private.assigned_to_job(job_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select private.current_app_role()='mechanic' and exists(
 select 1 from public.job_assignments a join public.employees e on e.id=a.mechanic_id
 where a.repair_job_id=job_id and e.profile_id=auth.uid())
$$;
revoke all on function private.assigned_to_job(uuid) from public;
grant execute on function private.assigned_to_job(uuid) to authenticated;
drop policy profiles_self_update on public.profiles;
create policy admin_profile_update on public.profiles for update to authenticated
using (private.current_app_role()='admin') with check(private.current_app_role()='admin');
create policy staff_employee_directory on public.employees for select to authenticated
using (private.current_app_role()='staff');
drop policy mechanic_jobs on public.repair_jobs;
create policy mechanic_jobs on public.repair_jobs for select to authenticated using(private.assigned_to_job(id));
drop policy staff_inspections on public.inspections;
create policy staff_inspections on public.inspections for all to authenticated
using(private.current_app_role() in ('admin','staff')) with check(private.current_app_role() in ('admin','staff'));
create policy mechanic_vehicle_read on public.vehicles for select to authenticated using(
 exists(select 1 from public.repair_jobs j where j.vehicle_id=vehicles.id and private.assigned_to_job(j.id)));
create policy mechanic_customer_read on public.customers for select to authenticated using(
 exists(select 1 from public.repair_jobs j where j.customer_id=customers.id and private.assigned_to_job(j.id)));
drop policy workshop_inventory on public.inventory_transactions;
create policy workshop_inventory on public.inventory_transactions for select to authenticated using(
 private.current_app_role() in ('admin','staff') or private.assigned_to_job(repair_job_id));
drop policy workshop_labor on public.job_labor;
create policy workshop_labor on public.job_labor for select to authenticated using(
 private.current_app_role() in ('admin','staff') or private.assigned_to_job(repair_job_id));
drop policy customer_status_history on public.job_status_history;
create policy visible_job_history on public.job_status_history for select to authenticated
using(exists(select 1 from public.repair_jobs j where j.id=repair_job_id));
drop policy notifications_self_update on public.notifications;
create policy staff_notifications on public.notifications for all to authenticated
using(private.current_app_role() in ('admin','staff')) with check(private.current_app_role() in ('admin','staff'));
-- Suspended users must not keep access through self-only policies.
do $$ declare t text; begin
 foreach t in array array['profiles','customers','employees','vehicles','service_catalog','appointments','inspections','estimates','estimate_items','repair_jobs','job_assignments','parts','inventory_transactions','job_labor','invoices','invoice_items','payments','job_status_history','notifications','audit_logs'] loop
 execute format('create policy active_account on public.%I as restrictive for all to authenticated using (private.current_app_role() is not null) with check (private.current_app_role() is not null)',t);
 end loop;
end $$;

create function private.validate_workshop_links() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name in ('appointments','repair_jobs') then
  if not exists(select 1 from public.vehicles v where v.id=new.vehicle_id and v.customer_id=new.customer_id) then
   raise exception 'Vehicle must belong to customer'; end if;
 end if;
 if tg_table_name='appointments' then
 if private.current_app_role()='customer' and (new.status<>'pending' or new.source<>'customer_portal' or new.created_by<>auth.uid()) then
 raise exception 'Customers can only create pending bookings'; end if; end if;
 if tg_table_name='repair_jobs' then
  if not exists(select 1 from public.employees e join public.profiles p on p.id=e.profile_id where e.id=new.service_advisor_id and p.role='staff' and p.status='active') then raise exception 'Active service advisor required'; end if;
  if new.estimate_id is not null and not exists(select 1 from public.estimates e join public.inspections i on i.id=e.inspection_id where e.id=new.estimate_id and e.customer_id=new.customer_id and i.vehicle_id=new.vehicle_id) then raise exception 'Estimate does not match job'; end if;
 end if;
 if tg_table_name='estimates' then
  if not exists(select 1 from public.inspections i join public.vehicles v on v.id=i.vehicle_id where i.id=new.inspection_id and v.customer_id=new.customer_id) then raise exception 'Inspection does not belong to customer'; end if;
 end if;
 if tg_table_name='invoices' then
  if not exists(select 1 from public.repair_jobs j where j.id=new.repair_job_id and j.customer_id=new.customer_id) then raise exception 'Invoice customer does not match job'; end if;
 end if;
 if tg_table_name in ('estimates','invoices') then
  if new.discount>new.subtotal then raise exception 'Discount exceeds subtotal'; end if;
  new.total=round(new.subtotal-new.discount+new.tax,2);
  if tg_table_name='invoices' then
   if new.amount_paid>new.total then raise exception 'Payment exceeds total'; end if;
   new.balance_due=new.total-new.amount_paid;
   if new.status not in ('draft','void') then new.status=case when new.balance_due=0 then 'paid'::public.invoice_status when new.amount_paid>0 then 'partially_paid'::public.invoice_status else 'issued'::public.invoice_status end; end if;
  end if;
 end if;
 if tg_table_name='vehicles' and tg_op='UPDATE' and new.customer_id<>old.customer_id and (
 exists(select 1 from public.repair_jobs where vehicle_id=old.id) or exists(select 1 from public.appointments where vehicle_id=old.id) or exists(select 1 from public.inspections where vehicle_id=old.id)) then raise exception 'Vehicle with service history cannot change owner'; end if;
 return new;
end $$;
do $$ declare t text; begin
 foreach t in array array['vehicles','appointments','repair_jobs','estimates','invoices'] loop
 execute format('create trigger validate_links before insert or update on public.%I for each row execute function private.validate_workshop_links()',t);
 end loop;
end $$;

create function private.guard_job_status() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='INSERT' then
  if new.status<>'inspection' then raise exception 'Jobs must start at inspection'; end if;
 elsif new.status<>old.status then
  if not (case old.status
   when 'inspection' then new.status in ('awaiting_approval','cancelled')
   when 'awaiting_approval' then new.status in ('approved','cancelled')
   when 'approved' then new.status in ('in_repair','cancelled')
   when 'in_repair' then new.status in ('on_hold','quality_check')
   when 'on_hold' then new.status in ('in_repair','cancelled')
   when 'quality_check' then new.status in ('in_repair','ready')
   when 'ready' then new.status='delivered' else false end) then raise exception 'Invalid job transition'; end if;
  if new.status='approved' and not exists(select 1 from public.estimates e where e.id=new.estimate_id and e.status='approved') then raise exception 'Customer-approved estimate required'; end if;
  if new.status='ready' then new.completed_at=now(); end if;
  if new.status='delivered' then
   if not exists(select 1 from public.invoices i where i.repair_job_id=new.id and i.status='paid' and i.balance_due=0) then raise exception 'Paid invoice required before delivery'; end if;
   new.delivered_at=now();
  end if;
 end if;
 return new;
end $$;
create trigger guard_job_status before insert or update on public.repair_jobs for each row execute function private.guard_job_status();
create function private.log_job_status() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status<>old.status then insert into public.job_status_history(repair_job_id,from_status,to_status,changed_by) values(new.id,old.status,new.status,auth.uid()); end if;
 return new;
end $$;
create trigger log_job_status after update on public.repair_jobs for each row execute function private.log_job_status();

create function public.change_job_status(job_id uuid,next_status public.job_status) returns public.repair_jobs
language plpgsql security definer set search_path='' as $$
declare result public.repair_jobs;
begin
 if not coalesce(private.current_app_role() in ('admin','staff') or private.assigned_to_job(job_id),false) then raise exception 'Access denied'; end if;
 if private.current_app_role()='mechanic' and next_status not in ('in_repair','on_hold','quality_check') then raise exception 'Advisor must approve or deliver jobs'; end if;
 select * into result from public.repair_jobs where id=job_id for update;
 if not found then raise exception 'Job not found'; end if;
 update public.repair_jobs set status=next_status where id=job_id returning * into result;
 return result;
end $$;
create function public.consume_job_part(job_id uuid,part_id uuid,used_quantity numeric,usage_note text default null) returns public.inventory_transactions
language plpgsql security definer set search_path='' as $$
declare item public.parts; result public.inventory_transactions; job public.repair_jobs;
begin
 if not coalesce(private.current_app_role() in ('admin','staff') or private.assigned_to_job(job_id),false) then raise exception 'Access denied'; end if;
 select * into job from public.repair_jobs where id=job_id for update;
 if not found or job.status not in ('approved','in_repair','on_hold','quality_check') then raise exception 'Job is not open for parts usage'; end if;
 if used_quantity is null or used_quantity<=0 then raise exception 'Positive quantity required'; end if;
 select * into item from public.parts where id=part_id and is_active for update;
 if not found or item.stock_on_hand<used_quantity then raise exception 'Insufficient stock or unavailable part'; end if;
 update public.parts set stock_on_hand=stock_on_hand-used_quantity where id=part_id;
 insert into public.inventory_transactions(part_id,transaction_type,quantity,unit_cost,repair_job_id,note,created_by)
 values(part_id,'job_usage',-used_quantity,item.cost_price,job_id,usage_note,auth.uid()) returning * into result;
 return result;
end $$;
create function public.decide_estimate(estimate_id uuid,decision public.estimate_status,decision_note text default null) returns public.estimates
language plpgsql security definer set search_path='' as $$
declare result public.estimates;
begin
 if private.current_app_role() is distinct from 'customer' or decision not in ('approved','rejected') then raise exception 'Access denied'; end if;
 update public.estimates set status=decision,customer_decision_at=now(),customer_note=decision_note
 where id=estimate_id and customer_id=private.current_customer_id() and status='sent' and (expires_at is null or expires_at>now()) returning * into result;
 if not found then raise exception 'Estimate is unavailable or expired'; end if;
 return result;
end $$;
create function public.assign_mechanic(job_id uuid,employee_id uuid) returns public.job_assignments
language plpgsql security definer set search_path='' as $$
declare result public.job_assignments;
begin
 if not coalesce(private.current_app_role() in ('admin','staff'),false) then raise exception 'Access denied'; end if;
 if not exists(select 1 from public.employees e join public.profiles p on p.id=e.profile_id where e.id=employee_id and p.role='mechanic' and p.status='active') then raise exception 'Active mechanic required'; end if;
 insert into public.job_assignments(repair_job_id,mechanic_id,assigned_by) values(job_id,employee_id,auth.uid())
 on conflict(repair_job_id,mechanic_id) do update set assigned_by=auth.uid() returning * into result;
 return result;
end $$;
create function public.provision_employee(user_id uuid,details jsonb) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Access denied'; end if;
 if details->>'role' not in ('staff','mechanic') then raise exception 'Invalid role'; end if;
 update public.profiles set full_name=details->>'fullName',phone=details->>'phone',role=(details->>'role')::public.app_role where id=user_id;
 delete from public.customers where profile_id=user_id;
 insert into public.employees(profile_id,employee_code,designation,specialization,hire_date,hourly_rate)
 values(user_id,'EMP-'||upper(substr(user_id::text,1,8)),details->>'designation',details->>'specialization',(details->>'hireDate')::date,(details->>'hourlyRate')::numeric);
end $$;
create function public.update_employee(employee_id uuid,details jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare employee public.employees; profile public.profiles;
begin
 if private.current_app_role() is distinct from 'admin' then raise exception 'Access denied'; end if;
 if details->>'role' not in ('staff','mechanic') then raise exception 'Invalid role'; end if;
 select * into employee from public.employees where id=employee_id for update;
 if not found then raise exception 'Employee not found'; end if;
 select * into profile from public.profiles where id=employee.profile_id;
 if details->>'email'<>profile.email then raise exception 'Employee email cannot be changed here'; end if;
 if details->>'role'<>profile.role::text and (exists(select 1 from public.job_assignments where mechanic_id=employee_id) or exists(select 1 from public.repair_jobs where service_advisor_id=employee_id)) then raise exception 'Employee role is linked to workshop history'; end if;
 update public.profiles set full_name=details->>'fullName',phone=details->>'phone',role=(details->>'role')::public.app_role where id=employee.profile_id returning * into profile;
 update public.employees set designation=details->>'designation',specialization=details->>'specialization',hire_date=(details->>'hireDate')::date,hourly_rate=(details->>'hourlyRate')::numeric where id=employee_id returning * into employee;
 return to_jsonb(employee)||jsonb_build_object('profiles',to_jsonb(profile));
end $$;
revoke all on function public.provision_employee(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.provision_employee(uuid,jsonb) to service_role;
revoke all on function public.change_job_status(uuid,public.job_status), public.consume_job_part(uuid,uuid,numeric,text), public.decide_estimate(uuid,public.estimate_status,text), public.assign_mechanic(uuid,uuid), public.update_employee(uuid,jsonb) from public,anon;
grant execute on function public.change_job_status(uuid,public.job_status), public.consume_job_part(uuid,uuid,numeric,text), public.decide_estimate(uuid,public.estimate_status,text), public.assign_mechanic(uuid,uuid), public.update_employee(uuid,jsonb) to authenticated;

create function public.workshop_summary() returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb; role public.app_role:=private.current_app_role(); day_start timestamptz:=date_trunc('day',now() at time zone 'Asia/Karachi') at time zone 'Asia/Karachi';
begin
 if role is null then raise exception 'Access denied'; end if;
 select jsonb_build_object(
 'activeJobs',count(*) filter(where status not in ('delivered','cancelled')),
 'readyForDelivery',count(*) filter(where status='ready'),
 'assignedJobs',count(*),'inProgress',count(*) filter(where status='in_repair'),
 'waitingInspection',count(*) filter(where status='inspection'),
 'waitingQualityCheck',count(*) filter(where status='quality_check'),
 'completedServices',count(*) filter(where status='delivered')) into result from public.repair_jobs;
 result=result||jsonb_build_object('unreadNotifications',(select count(*) from public.notifications where user_id=auth.uid() and channel='in_app' and read_at is null));
 if role='mechanic' then
  return (result - 'readyForDelivery' - 'completedServices')||jsonb_build_object('partsUsed',coalesce((select sum(-quantity) from public.inventory_transactions where transaction_type='job_usage'),0));
 end if;
 result=result||jsonb_build_object(
 'todaysAppointments',(select count(*) from public.appointments where scheduled_at>=day_start and scheduled_at<day_start+interval '1 day' and status not in ('cancelled','no_show')),
 'upcomingAppointments',(select count(*) from public.appointments where scheduled_at>=now() and status in ('pending','confirmed')),
 'pendingEstimates',(select count(*) from public.estimates where status='sent' and (expires_at is null or expires_at>now())),
 'vehicles',(select count(*) from public.vehicles),
 'outstandingInvoices',(select count(*) from public.invoices where status not in ('void','draft') and balance_due>0),
 'outstandingBalance',coalesce((select sum(balance_due) from public.invoices where status not in ('void','draft')),0));
 if role in ('admin','staff') then
  result=result||jsonb_build_object('customers',(select count(*) from public.customers),'lowStock',(select count(*) from public.parts where is_active and stock_on_hand<=reorder_level),'collectedRevenue',coalesce((select sum(amount_paid) from public.invoices where status not in ('void','draft')),0));
 end if;
 return result;
end $$;
revoke all on function public.workshop_summary() from public,anon;
grant execute on function public.workshop_summary() to authenticated;


-- Preserve approval and ownership history when records are edited directly.
create function private.guard_estimate_history() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='UPDATE' and old.status in ('approved','rejected','expired') and new is distinct from old then
  raise exception 'Finalized estimates cannot be edited';
 end if;
 if tg_op='UPDATE' and (new.customer_id<>old.customer_id or new.inspection_id<>old.inspection_id)
 and exists(select 1 from public.repair_jobs where estimate_id=old.id) then raise exception 'Linked estimate ownership cannot change'; end if;
 return new;
end $$;
create trigger guard_estimate_history before update on public.estimates for each row execute function private.guard_estimate_history();
create function private.guard_linked_job() returns trigger language plpgsql set search_path='' as $$
begin
 if old.status not in ('inspection','awaiting_approval') and (new.estimate_id is distinct from old.estimate_id or new.customer_id<>old.customer_id or new.vehicle_id<>old.vehicle_id) then raise exception 'Approved job links cannot change'; end if;
 if (new.customer_id<>old.customer_id or new.vehicle_id<>old.vehicle_id) and exists(select 1 from public.invoices where repair_job_id=old.id) then raise exception 'Invoiced job ownership cannot change'; end if;
 return new;
end $$;
create trigger guard_linked_job before update on public.repair_jobs for each row execute function private.guard_linked_job();
create function private.guard_inspection_vehicle() returns trigger language plpgsql set search_path='' as $$
begin
 if new.vehicle_id<>old.vehicle_id and exists(select 1 from public.estimates where inspection_id=old.id) then raise exception 'Estimated inspection cannot change vehicle'; end if;
 return new;
end $$;
create trigger guard_inspection_vehicle before update on public.inspections for each row execute function private.guard_inspection_vehicle();
create function public.read_notification(notification_id uuid) returns public.notifications language plpgsql security definer set search_path='' as $$
declare result public.notifications;
begin
 if private.current_app_role() is null then raise exception 'Access denied'; end if;
 update public.notifications set read_at=now(),status='read' where id=notification_id and user_id=auth.uid() and channel='in_app' returning * into result;
 if not found then raise exception 'Notification not found'; end if;
 return result;
end $$;
revoke all on function public.read_notification(uuid) from public,anon;
grant execute on function public.read_notification(uuid) to authenticated;

create function public.bootstrap_administrator(user_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Access denied'; end if;
 perform pg_advisory_xact_lock(8642901);
 if exists(select 1 from public.profiles where role='admin') then raise exception 'Administrator already configured'; end if;
 update public.profiles set role='admin' where id=user_id and status='active';
 if not found then raise exception 'Active profile required'; end if;
 insert into public.audit_logs(actor_user_id,action,entity_type,entity_id) values(user_id,'bootstrap_admin','profiles',user_id);
end $$;
revoke all on function public.bootstrap_administrator(uuid) from public,anon,authenticated;
grant execute on function public.bootstrap_administrator(uuid) to service_role;
