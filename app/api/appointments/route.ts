import {GET as getResource,POST as createResource} from "@/app/api/workshop/[resource]/route"
const context={params:Promise.resolve({resource:"appointments"})}
export const GET=(request:Request)=>getResource(request,context)
export const POST=(request:Request)=>createResource(request,context)

