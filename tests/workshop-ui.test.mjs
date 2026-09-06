import test,{after} from "node:test"
import assert from "node:assert/strict"
import {JSDOM} from "jsdom"
import {createServer} from "vite"
import {fileURLToPath} from "node:url"

const dom=new JSDOM("<!doctype html><html><body></body></html>",{url:"http://localhost:3000"})
for(const key of ["window","document","HTMLElement","HTMLInputElement","HTMLSelectElement","HTMLButtonElement","HTMLFormElement","Element","Node","NodeFilter","MutationObserver","Event","CustomEvent","KeyboardEvent","MouseEvent","FocusEvent","DocumentFragment","SVGElement"])if(dom.window[key])globalThis[key]=dom.window[key]
Object.defineProperty(globalThis,"navigator",{value:dom.window.navigator,configurable:true})
globalThis.getComputedStyle=dom.window.getComputedStyle.bind(dom.window)
globalThis.requestAnimationFrame=cb=>setTimeout(cb,0)
globalThis.cancelAnimationFrame=clearTimeout
window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}})
globalThis.ResizeObserver=class {observe(){} unobserve(){} disconnect(){}}
window.HTMLElement.prototype.scrollIntoView=function(){}
window.HTMLElement.prototype.hasPointerCapture=()=>false
window.HTMLElement.prototype.releasePointerCapture=function(){}
const React=await import("react")
const {render,screen,fireEvent,waitFor,cleanup}=await import("@testing-library/react")
const root=fileURLToPath(new URL("..",import.meta.url))
const vite=await createServer({appType:"custom",configFile:false,root,resolve:{alias:{"@":root}},server:{middlewareMode:true}})
const {WorkshopDashboard}=await vite.ssrLoadModule("/components/workshop-dashboard.tsx")
after(async()=>{cleanup();await vite.close();dom.window.close()})
const id=()=>crypto.randomUUID()
const customer=id(),vehicle=id(),advisor=id(),inspection=id(),job=id(),profile=id()
const lookups={
 customers:[{id:customer,full_name:"Test Customer",customer_code:"CUS-TEST"}],
 vehicles:[{id:vehicle,customer_id:customer,registration_number:"TEST-1",make:"Test",model:"Vehicle"}],
 employees:[{id:advisor,employee_code:"EMP-TEST",profiles:{full_name:"Test Advisor",role:"staff",status:"active"}}],
 inspections:[{id:inspection,created_at:"2026-09-06",vehicles:{registration_number:"TEST-1",customer_id:customer}}],
 jobs:[{id:job,job_number:"JOB-TEST",customer_id:customer}],
 estimates:[],profiles:[{id:profile,full_name:"Test Recipient",email:"recipient@example.test"}]
}
const cases=[
 ["customers","Customers",{"Full name":"Saved Customer","Phone":"03001234567"},"Saved Customer"],
 ["vehicles","Vehicles",{"Customer":customer,"Registration number":"SAVED-1","Make":"Saved","Model":"Vehicle","Model year":"2024","Current mileage":"100"},"SAVED-1"],
 ["appointments","Appointments",{"Customer":customer,"Vehicle":vehicle,"Date and time":"2026-09-07T12:00","Service request / complaint":"Saved appointment request"},"Saved appointment request"],
 ["employees","Employees",{"Full name":"Saved Employee","Email":"employee@example.test","Phone":"03001234567","Role":"mechanic","Designation":"Mechanic","Hire date":"2026-09-06","Hourly rate":"100"},"Saved Employee"],
 ["repair-jobs","Repair jobs",{"Customer":customer,"Vehicle":vehicle,"Service advisor":advisor,"Complaint":"Saved job complaint"},"Saved job complaint"],
 ["parts","Inventory",{"SKU":"SAVED-PART","Part name":"Saved Part","Unit":"piece","Cost price":"10","Sale price":"20","Opening stock":"3","Reorder level":"1"},"Saved Part"],
 ["estimates","Estimates",{"Customer":customer,"Inspection":inspection,"Subtotal":"100"},"EST-SAVED"],
 ["invoices","Invoices",{"Customer":customer,"Repair job":job,"Subtotal":"100"},"INV-SAVED"],
 ["notifications","Notifications",{"Recipient":profile,"Type":"repair","Title":"Saved Notification","Message":"Saved message"},"Saved Notification"]
]
let records={},failSave=false,failRefresh=false,posts=0
function installFetch(){
 globalThis.fetch=async(url,init={})=>{
  const path=String(url),method=init.method??"GET"
  const result=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json"}})
  if(path==="/api/auth/session")return result({authenticated:true,account:{id:profile,fullName:"Test Admin",role:"admin"},canBootstrap:false})
  if(path==="/api/workshop/lookups")return result(lookups)
  if(path==="/api/workshop/summary")return failRefresh?result({error:"Refresh unavailable"},503):result({activeJobs:0,todaysAppointments:0,pendingEstimates:0,readyForDelivery:0,customers:records.customers?.length??0,vehicles:0,lowStock:0,outstandingBalance:0,collectedRevenue:0,unreadNotifications:0})
  const resource=path.split("/").pop().split("?")[0]
  if(method==="POST"||method==="PATCH"){
   posts++
   if(failSave)return result({error:"Database rejected this record"},400)
   const body=JSON.parse(init.body)
   const record={...body,id:body.id??id(),estimateNumber:"EST-SAVED",invoiceNumber:"INV-SAVED",customerName:"Test Customer",vehicle:"Saved Vehicle",status:body.status??"active",createdAt:new Date().toISOString()}
   records[resource]=[record]
   return result({record,message:"Record saved"},201)
  }
  if(failRefresh)return result({error:"Refresh unavailable"},503)
  return result({records:records[resource]??[]})
 }
}
async function openResource(label){
 fireEvent.click(await screen.findByRole("button",{name:label,exact:true}))
 await waitFor(()=>assert.ok(screen.queryByText("No records found")))
 fireEvent.click(screen.getByRole("button",{name:/Add new/}))
 await screen.findByRole("dialog")
 await waitFor(()=>assert.ok(screen.getByRole("button",{name:"Save record"})))
}
async function fill(fields){
 for(const [label,value] of Object.entries(fields)){
  const input=screen.getByLabelText(new RegExp("^"+label.replace(/[.*+?^$\{\}()|[\]\\]/g,"\\$&")+"(?: \\*)?$"))
  if(input.tagName==="SELECT")await waitFor(()=>assert.ok(Array.from(input.options).some(o=>o.value===value)))
  fireEvent.change(input,{target:{value}})
 }
}
test("successful mutations visibly render all nine resource records",async t=>{
 for(const [,label,fields,expected] of cases)await t.test(label,async()=>{
  records={};failSave=false;failRefresh=false;posts=0;installFetch()
  render(React.createElement(WorkshopDashboard))
  await openResource(label);await fill(fields)
  fireEvent.submit(screen.getByRole("button",{name:"Save record"}).closest("form"))
  await waitFor(()=>assert.equal(screen.queryByRole("dialog"),null))
  await waitFor(()=>assert.ok(screen.getAllByText(expected).length))
  assert.equal(posts,1)
  cleanup()
 })
})
test("failed save stays open with a server error and permits retry",async()=>{
 records={};failSave=true;failRefresh=false;posts=0;installFetch();render(React.createElement(WorkshopDashboard))
 await openResource("Customers");await fill({"Full name":"Retry Customer","Phone":"03001234567"})
 fireEvent.submit(screen.getByRole("button",{name:"Save record"}).closest("form"))
 await screen.findByText("Database rejected this record")
 assert.ok(screen.getByRole("dialog"))
 assert.equal(screen.getByLabelText(/Full name/).value,"Retry Customer")
 failSave=false
 fireEvent.submit(screen.getByRole("button",{name:"Save record"}).closest("form"))
 await waitFor(()=>assert.equal(screen.queryByRole("dialog"),null))
 await screen.findByText("Retry Customer");cleanup()
})
test("post-save refresh failure retains the inserted row and exposes retry",async()=>{
 records={};failSave=false;failRefresh=false;posts=0;installFetch();render(React.createElement(WorkshopDashboard))
 await openResource("Customers");await fill({"Full name":"Retained Customer","Phone":"03001234567"})
 failRefresh=true
 fireEvent.submit(screen.getByRole("button",{name:"Save record"}).closest("form"))
 await screen.findByText("Refresh unavailable")
 await screen.findByText("Retained Customer")
 assert.ok(screen.getByRole("button",{name:"Retry",exact:true}))
 failRefresh=false
 fireEvent.click(screen.getByRole("button",{name:"Retry",exact:true}))
 await waitFor(()=>assert.equal(screen.queryByText("Refresh unavailable"),null))
 cleanup()
})

