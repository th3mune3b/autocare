import test from "node:test"
import assert from "node:assert/strict"
import {readFile} from "node:fs/promises"
import {PGlite} from "@electric-sql/pglite"
import {pgcrypto} from "@electric-sql/pglite/contrib/pgcrypto"

test("PostgreSQL migrations, CRUD, RLS and transactional workflows",async t=>{
 const db=new PGlite({extensions:{pgcrypto}})
 try{
 await db.exec(`
 create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth;
 create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 create function auth.role() returns text language sql stable as $$ select nullif(current_setting('request.jwt.claim.role',true),'') $$;
 grant usage on schema auth to authenticated,anon,service_role;
 grant execute on all functions in schema auth to authenticated,anon,service_role;
 `)
 for(const file of ["202609060001_autocare_pro.sql","202609060002_workshop_integrity.sql"])
  await db.exec(await readFile(new URL("../supabase/migrations/"+file,import.meta.url),"utf8"))
 await db.exec("grant usage on schema public to authenticated,anon,service_role; grant all on all tables in schema public to authenticated,anon,service_role")
 const ids=Array.from({length:6},()=>crypto.randomUUID())
 const [admin,staff,mechanic,customer,other,unassigned]=ids
 for(const [i,id] of ids.entries())await db.query("insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)",[id,"test"+i+"@example.test",JSON.stringify({full_name:"Test User "+i,phone:"03001234567"})])
 for(const [id,role] of [[admin,"admin"],[staff,"staff"],[mechanic,"mechanic"],[unassigned,"mechanic"]])await db.query("update profiles set role=$1 where id=$2",[role,id])
 async function as(id){await db.exec("reset role");await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role','authenticated',false)",[id]);await db.exec("set role authenticated")}
 async function one(sql,args=[]){return (await db.query(sql,args)).rows[0]}
 const c=(await one("select id from customers where profile_id=$1",[customer])).id
 const c2=(await one("select id from customers where profile_id=$1",[other])).id
 await as(admin)
 const advisor=(await one("insert into employees(profile_id,employee_code,designation,hire_date) values($1,'EMP-A','Advisor',current_date) returning id",[staff])).id
 const mech=(await one("insert into employees(profile_id,employee_code,designation,hire_date) values($1,'EMP-M','Mechanic',current_date) returning id",[mechanic])).id
 const vehicle=(await one("insert into vehicles(customer_id,registration_number,make,model,model_year) values($1,'TEST-A','Test','Vehicle',2024) returning id",[c])).id
 const vehicle2=(await one("insert into vehicles(customer_id,registration_number,make,model,model_year) values($1,'TEST-B','Test','Vehicle',2024) returning id",[c2])).id
 const job=(await one("insert into repair_jobs(customer_id,vehicle_id,service_advisor_id,job_number,complaint) values($1,$2,$3,'JOB-TEST','Inspect test brakes') returning id",[c,vehicle,advisor])).id
 const job2=(await one("insert into repair_jobs(customer_id,vehicle_id,service_advisor_id,job_number,complaint) values($1,$2,$3,'JOB-OTHER','Inspect other brakes') returning id",[c2,vehicle2,advisor])).id
 await t.test("all nine resources persist and return UUID rows",async()=>{
  const examples=[
   ["customers","insert into customers(customer_code,full_name,phone) values('TEMP','Temporary Customer','03001234567') returning *",[],{full_name:"Updated Customer"}],
   ["vehicles","insert into vehicles(customer_id,registration_number,make,model,model_year) values($1,'TEMP-V','Test','Car',2024) returning *",[c],{color:"Blue"}],
   ["appointments","insert into appointments(appointment_number,customer_id,vehicle_id,scheduled_at,complaint,source,created_by) values('TEMP-A',$1,$2,now(),'Test service request','staff',$3) returning *",[c,vehicle,admin],{complaint:"Updated service request"}],
   ["employees","insert into employees(profile_id,employee_code,designation,hire_date) values($1,'TEMP-E','Mechanic',current_date) returning *",[unassigned],{designation:"Senior mechanic"}],
   ["repair_jobs","insert into repair_jobs(customer_id,vehicle_id,service_advisor_id,job_number,complaint) values($1,$2,$3,'TEMP-J','Test service request') returning *",[c,vehicle,advisor],{diagnosis:"Inspection needed"}],
   ["parts","insert into parts(sku,name,cost_price,sale_price) values('TEMP-P','Test part',10,20) returning *",[],{name:"Updated part"}],
   ["notifications","insert into notifications(user_id,channel,type,title,message) values($1,'in_app','test','Test title','Test message') returning *",[customer],{title:"Updated title"}]
  ]
  const inspection=(await one("insert into inspections(vehicle_id,inspected_by,mileage,fuel_level,findings) values($1,$2,100,50,'Test findings') returning id",[vehicle,staff])).id
  examples.push(["estimates","insert into estimates(estimate_number,inspection_id,customer_id,subtotal,total) values('TEMP-EST',$1,$2,100,100) returning *",[inspection,c],{subtotal:150}])
  examples.push(["invoices","insert into invoices(invoice_number,repair_job_id,customer_id,subtotal,total,balance_due) values('TEMP-I',$1,$2,100,100,100) returning *",[job,c],{subtotal:150}])
  for(const [table,sql,args,patch] of examples){
   const row=await one(sql,args);assert.match(row.id,/^[a-f0-9-]{36}$/)
   const [key,value]=Object.entries(patch)[0]
   const updated=await one(`update ${table} set ${key}=$1 where id=$2 returning *`,[value,row.id]);assert.equal(typeof value==="number"?Number(updated[key]):updated[key],value)
   assert.equal((await one(`delete from ${table} where id=$1 returning id`,[row.id])).id,row.id)
  }
 })
 await t.test("customers cannot read another customer's data or escalate roles",async()=>{
  await as(customer)
  assert.deepEqual((await db.query("select id from vehicles")).rows.map(x=>x.id),[vehicle])
  assert.equal((await one("select count(*)::int as n from repair_jobs")).n,1)
  assert.equal((await db.query("update profiles set role='admin' where id=$1 returning id",[customer])).rows.length,0)
  assert.equal((await db.query("select * from repair_jobs where id=$1",[job2])).rows.length,0)
 })
 await t.test("customer cannot submit another customer's vehicle or preapprove appointment",async()=>{
  await assert.rejects(db.query("insert into appointments(appointment_number,customer_id,vehicle_id,scheduled_at,complaint,status,source,created_by) values('BAD',$1,$2,now(),'Test service request','pending','customer_portal',$3)",[c,vehicle2,customer]),/Vehicle must belong/)
  await assert.rejects(db.query("insert into appointments(appointment_number,customer_id,vehicle_id,scheduled_at,complaint,status,source,created_by) values('BAD2',$1,$2,now(),'Test service request','completed','customer_portal',$3)",[c,vehicle,customer]),/pending bookings/)
 })
 const part=crypto.randomUUID()
 await t.test("mechanics see only assigned jobs and their history",async()=>{
  await as(admin);await db.query("select assign_mechanic($1,$2)",[job,mech])
  await db.query("insert into parts(id,sku,name,cost_price,sale_price,stock_on_hand) values($1,'BRAKE','Brake part',10,20,3)",[part])
  await as(mechanic)
  assert.equal((await one("select count(*)::int as n from repair_jobs")).n,1)
  assert.equal((await db.query("select * from repair_jobs where id=$1",[job2])).rows.length,0)
  await assert.rejects(db.query("select consume_job_part($1,$2,1)",[job2,part]),/Access denied/)
  assert.equal((await one("select count(*)::int as n from inspections")).n,0)
 })
 let estimate
 await t.test("approval gates and customer decisions are enforced",async()=>{
  await as(admin)
  const inspection=(await one("insert into inspections(vehicle_id,inspected_by,mileage,fuel_level,findings) values($1,$2,100,50,'Brake findings') returning id",[vehicle,staff])).id
  estimate=(await one("insert into estimates(estimate_number,inspection_id,customer_id,subtotal,total,status) values('EST-JOB',$1,$2,100,100,'sent') returning id",[inspection,c])).id
  await db.query("update repair_jobs set estimate_id=$1 where id=$2",[estimate,job])
  await db.query("select change_job_status($1,'awaiting_approval')",[job])
  await assert.rejects(db.query("select change_job_status($1,'approved')",[job]),/approved estimate/)
  await as(other);await assert.rejects(db.query("select decide_estimate($1,'approved')",[estimate]),/unavailable/)
  await as(customer);await db.query("select decide_estimate($1,'approved')",[estimate])
  await assert.rejects(db.query("select decide_estimate($1,'rejected')",[estimate]),/unavailable/)
  await as(admin);await db.query("select change_job_status($1,'approved')",[job])
 })
 await t.test("parts stock and ledger update atomically and cannot overspend",async()=>{
  await as(mechanic)
  await db.query("select consume_job_part($1,$2,2)",[job,part])
  assert.equal(Number((await one("select stock_on_hand from parts where id=$1",[part])).stock_on_hand),1)
  await assert.rejects(db.query("select consume_job_part($1,$2,2)",[job,part]),/Insufficient stock/)
  assert.equal(Number((await one("select stock_on_hand from parts where id=$1",[part])).stock_on_hand),1)
  assert.equal((await one("select count(*)::int as n from inventory_transactions")).n,1)
  const summary=(await one("select workshop_summary() as data")).data
  assert.equal(summary.partsUsed,2);assert.equal(summary.assignedJobs,1);assert.equal(summary.collectedRevenue,undefined)
  await assert.rejects(db.query("select change_job_status($1,'delivered')",[job]),/Advisor/)
 })
 await t.test("invoice arithmetic and relation checks apply to direct database writes",async()=>{
  await as(admin)
  await assert.rejects(db.query("insert into invoices(invoice_number,repair_job_id,customer_id,subtotal,total,balance_due) values('BAD-I',$1,$2,100,100,100)",[job,c2]),/does not match/)
  await assert.rejects(db.query("insert into invoices(invoice_number,repair_job_id,customer_id,subtotal,discount,total,balance_due) values('BAD-I2',$1,$2,100,101,0,0)",[job,c]),/Discount/)
  const row=await one("insert into invoices(invoice_number,repair_job_id,customer_id,subtotal,total,balance_due,amount_paid,status) values('GOOD-I',$1,$2,100,999,999,25,'issued') returning *",[job,c])
  assert.equal(Number(row.total),100);assert.equal(Number(row.balance_due),75)
 })
 await t.test("suspended accounts lose all record access",async()=>{
  await as(admin);await db.query("update profiles set status='suspended' where id=$1",[customer])
  await as(customer);assert.equal((await one("select count(*)::int as n from vehicles")).n,0)
  await assert.rejects(db.query("select workshop_summary()"),/Access denied/)
 })
 await t.test("anonymous role cannot access records or privileged RPCs",async()=>{
  await db.exec("reset role; set role anon")
  assert.equal((await one("select count(*)::int as n from repair_jobs")).n,0)
  await assert.rejects(db.query("select change_job_status($1,'ready')",[job]),/permission denied/)
 })
 }finally{await db.close()}
})

