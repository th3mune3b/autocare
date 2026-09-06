import { z } from "zod"
const uuid = z.string().uuid()
const text = z.string().trim().min(2).max(500)
const money = z.coerce.number().finite().min(0).max(999999999)
const date = z.string().refine(v => Number.isFinite(Date.parse(v)), "Enter a valid date")
const optionalDate = date.optional().or(z.literal(""))
export const resourceSchemas = {
  customers: z.object({fullName: text.min(3), email: z.string().email().optional().or(z.literal("")), phone: text.min(10).max(30), address: z.string().max(1000).optional(), notes: z.string().max(2000).optional()}),
  vehicles: z.object({customerId: uuid, registrationNumber: text, vin: z.string().max(50).optional(), make: text, model: text, modelYear: z.coerce.number().int().min(1980).max(2100), color: z.string().max(50).optional(), currentMileage: z.coerce.number().int().min(0)}),
  appointments: z.object({customerId: uuid, vehicleId: uuid, scheduledAt: date, complaint: text.min(10), status: z.enum(["pending","confirmed","checked_in","completed","cancelled","no_show"]).default("pending")}),
  employees: z.object({fullName: text.min(3), email: z.string().email(), phone: text.min(10), role: z.enum(["staff","mechanic"]), designation: text, specialization: z.string().max(500).optional(), hireDate: date, hourlyRate: money}),
  "repair-jobs": z.object({customerId: uuid, vehicleId: uuid, serviceAdvisorId: uuid, complaint: text.min(10), diagnosis: z.string().max(2000).optional(), priority: z.enum(["low","normal","high","urgent"]).default("normal"), promisedAt: optionalDate, estimateId: uuid.optional().or(z.literal(""))}),
  parts: z.object({sku: text, name: text, brand: z.string().max(100).optional(), unit: text.default("piece"), costPrice: money, salePrice: money, stockOnHand: money, reorderLevel: money}),
  inspections: z.object({vehicleId: uuid, mileage: z.coerce.number().int().min(0), fuelLevel: z.coerce.number().int().min(0).max(100), findings: text, recommendedWork: z.string().max(2000).optional()}),
  estimates: z.object({inspectionId: uuid, customerId: uuid, subtotal: money, discount: money.default(0), tax: money.default(0), expiresAt: optionalDate, status: z.enum(["draft","sent"]).default("draft")}),
  invoices: z.object({repairJobId: uuid, customerId: uuid, subtotal: money, discount: money.default(0), tax: money.default(0), amountPaid: money.default(0)}),
  notifications: z.object({userId: uuid, channel: z.enum(["in_app","email"]), type: text, title: text, message: text}),
}
export type Resource = keyof typeof resourceSchemas
export function financialTotals(d: {subtotal: number; discount: number; tax: number; amountPaid?: number}) {
  if (d.discount > d.subtotal) throw new Error("Discount cannot exceed subtotal")
  const total = Math.round((d.subtotal - d.discount + d.tax) * 100) / 100
  if ((d.amountPaid ?? 0) > total) throw new Error("Amount paid cannot exceed total")
  return {total, balance_due: Math.round((total - (d.amountPaid ?? 0)) * 100) / 100}
}

