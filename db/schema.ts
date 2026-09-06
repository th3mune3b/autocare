import { sql } from "drizzle-orm"
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core"

const timestamps = {
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  externalAuthId: text("external_auth_id").notNull(),
  email: text("email").notNull(),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  role: text("role", { enum: ["admin", "staff", "mechanic", "customer"] }).notNull(),
  status: text("status", { enum: ["active", "inactive", "suspended"] }).notNull().default("active"),
  ...timestamps,
}, (table) => [uniqueIndex("users_auth_uidx").on(table.externalAuthId), uniqueIndex("users_email_uidx").on(table.email), index("users_role_idx").on(table.role)])

export const employees = sqliteTable("employees", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  employeeCode: text("employee_code").notNull(),
  designation: text("designation").notNull(),
  specialization: text("specialization"),
  hireDate: text("hire_date").notNull(),
  hourlyRate: real("hourly_rate").notNull().default(0),
  isAvailable: integer("is_available", { mode: "boolean" }).notNull().default(true),
  ...timestamps,
}, (table) => [uniqueIndex("employees_user_uidx").on(table.userId), uniqueIndex("employees_code_uidx").on(table.employeeCode)])

export const customers = sqliteTable("customers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id),
  customerCode: text("customer_code").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email"),
  phone: text("phone").notNull(),
  address: text("address"),
  notes: text("notes"),
  ...timestamps,
}, (table) => [uniqueIndex("customers_code_uidx").on(table.customerCode), uniqueIndex("customers_user_uidx").on(table.userId), index("customers_phone_idx").on(table.phone)])

export const vehicles = sqliteTable("vehicles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  registrationNumber: text("registration_number").notNull(),
  vin: text("vin"),
  make: text("make").notNull(),
  model: text("model").notNull(),
  modelYear: integer("model_year").notNull(),
  color: text("color"),
  fuelType: text("fuel_type"),
  transmission: text("transmission"),
  currentMileage: integer("current_mileage").notNull().default(0),
  ...timestamps,
}, (table) => [uniqueIndex("vehicles_registration_uidx").on(table.registrationNumber), uniqueIndex("vehicles_vin_uidx").on(table.vin), index("vehicles_customer_idx").on(table.customerId)])

export const serviceCatalog = sqliteTable("service_catalog", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  defaultLaborHours: real("default_labor_hours").notNull().default(0),
  defaultPrice: real("default_price").notNull().default(0),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  ...timestamps,
}, (table) => [uniqueIndex("service_catalog_name_uidx").on(table.name)])

export const appointments = sqliteTable("appointments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  appointmentNumber: text("appointment_number").notNull(),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  vehicleId: integer("vehicle_id").notNull().references(() => vehicles.id),
  serviceId: integer("service_id").references(() => serviceCatalog.id),
  scheduledAt: text("scheduled_at").notNull(),
  complaint: text("complaint").notNull(),
  status: text("status", { enum: ["pending", "confirmed", "checked_in", "completed", "cancelled", "no_show"] }).notNull().default("pending"),
  source: text("source", { enum: ["customer_portal", "staff", "walk_in"] }).notNull(),
  createdBy: integer("created_by").notNull().references(() => users.id),
  ...timestamps,
}, (table) => [uniqueIndex("appointments_number_uidx").on(table.appointmentNumber), index("appointments_schedule_idx").on(table.scheduledAt), index("appointments_vehicle_idx").on(table.vehicleId)])

export const inspections = sqliteTable("inspections", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  appointmentId: integer("appointment_id").references(() => appointments.id),
  vehicleId: integer("vehicle_id").notNull().references(() => vehicles.id),
  inspectedBy: integer("inspected_by").notNull().references(() => users.id),
  mileage: integer("mileage").notNull(),
  fuelLevel: integer("fuel_level").notNull(),
  findings: text("findings").notNull(),
  recommendedWork: text("recommended_work"),
  ...timestamps,
}, (table) => [index("inspections_vehicle_idx").on(table.vehicleId)])

export const estimates = sqliteTable("estimates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  estimateNumber: text("estimate_number").notNull(),
  inspectionId: integer("inspection_id").notNull().references(() => inspections.id),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  subtotal: real("subtotal").notNull().default(0),
  discount: real("discount").notNull().default(0),
  tax: real("tax").notNull().default(0),
  total: real("total").notNull().default(0),
  status: text("status", { enum: ["draft", "sent", "approved", "rejected", "expired"] }).notNull().default("draft"),
  customerDecisionAt: text("customer_decision_at"),
  customerNote: text("customer_note"),
  expiresAt: text("expires_at"),
  ...timestamps,
}, (table) => [uniqueIndex("estimates_number_uidx").on(table.estimateNumber), index("estimates_customer_idx").on(table.customerId)])

export const estimateItems = sqliteTable("estimate_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  estimateId: integer("estimate_id").notNull().references(() => estimates.id, { onDelete: "cascade" }),
  itemType: text("item_type", { enum: ["labor", "part", "service"] }).notNull(),
  referenceId: integer("reference_id"),
  description: text("description").notNull(),
  quantity: real("quantity").notNull().default(1),
  unitPrice: real("unit_price").notNull(),
  lineTotal: real("line_total").notNull(),
})

export const repairJobs = sqliteTable("repair_jobs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  jobNumber: text("job_number").notNull(),
  vehicleId: integer("vehicle_id").notNull().references(() => vehicles.id),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  appointmentId: integer("appointment_id").references(() => appointments.id),
  estimateId: integer("estimate_id").references(() => estimates.id),
  serviceAdvisorId: integer("service_advisor_id").notNull().references(() => employees.id),
  priority: text("priority", { enum: ["low", "normal", "high", "urgent"] }).notNull().default("normal"),
  status: text("status", { enum: ["inspection", "awaiting_approval", "approved", "in_repair", "on_hold", "quality_check", "ready", "delivered", "cancelled"] }).notNull().default("inspection"),
  complaint: text("complaint").notNull(),
  diagnosis: text("diagnosis"),
  promisedAt: text("promised_at"),
  completedAt: text("completed_at"),
  deliveredAt: text("delivered_at"),
  ...timestamps,
}, (table) => [uniqueIndex("repair_jobs_number_uidx").on(table.jobNumber), index("repair_jobs_status_idx").on(table.status), index("repair_jobs_vehicle_idx").on(table.vehicleId)])

export const jobAssignments = sqliteTable("job_assignments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  repairJobId: integer("repair_job_id").notNull().references(() => repairJobs.id, { onDelete: "cascade" }),
  mechanicId: integer("mechanic_id").notNull().references(() => employees.id),
  assignedBy: integer("assigned_by").notNull().references(() => users.id),
  assignedAt: text("assigned_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
  notes: text("notes"),
}, (table) => [index("job_assignments_job_idx").on(table.repairJobId), index("job_assignments_mechanic_idx").on(table.mechanicId)])

export const parts = sqliteTable("parts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sku: text("sku").notNull(),
  name: text("name").notNull(),
  brand: text("brand"),
  unit: text("unit").notNull().default("piece"),
  costPrice: real("cost_price").notNull(),
  salePrice: real("sale_price").notNull(),
  stockOnHand: real("stock_on_hand").notNull().default(0),
  reorderLevel: real("reorder_level").notNull().default(0),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  ...timestamps,
}, (table) => [uniqueIndex("parts_sku_uidx").on(table.sku), index("parts_name_idx").on(table.name)])

export const inventoryTransactions = sqliteTable("inventory_transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  partId: integer("part_id").notNull().references(() => parts.id),
  transactionType: text("transaction_type", { enum: ["purchase", "job_usage", "return", "adjustment_in", "adjustment_out"] }).notNull(),
  quantity: real("quantity").notNull(),
  unitCost: real("unit_cost"),
  repairJobId: integer("repair_job_id").references(() => repairJobs.id),
  reference: text("reference"),
  note: text("note"),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("inventory_part_idx").on(table.partId), index("inventory_job_idx").on(table.repairJobId)])

export const jobLabor = sqliteTable("job_labor", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  repairJobId: integer("repair_job_id").notNull().references(() => repairJobs.id, { onDelete: "cascade" }),
  mechanicId: integer("mechanic_id").notNull().references(() => employees.id),
  serviceId: integer("service_id").references(() => serviceCatalog.id),
  description: text("description").notNull(),
  hours: real("hours").notNull(),
  hourlyRate: real("hourly_rate").notNull(),
  lineTotal: real("line_total").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
})

export const invoices = sqliteTable("invoices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  invoiceNumber: text("invoice_number").notNull(),
  repairJobId: integer("repair_job_id").notNull().references(() => repairJobs.id),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  subtotal: real("subtotal").notNull(),
  discount: real("discount").notNull().default(0),
  tax: real("tax").notNull().default(0),
  total: real("total").notNull(),
  amountPaid: real("amount_paid").notNull().default(0),
  balanceDue: real("balance_due").notNull(),
  status: text("status", { enum: ["draft", "issued", "partially_paid", "paid", "void"] }).notNull().default("draft"),
  issuedAt: text("issued_at"),
  dueAt: text("due_at"),
  ...timestamps,
}, (table) => [uniqueIndex("invoices_number_uidx").on(table.invoiceNumber), uniqueIndex("invoices_job_uidx").on(table.repairJobId)])

export const payments = sqliteTable("payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  invoiceId: integer("invoice_id").notNull().references(() => invoices.id),
  receiptNumber: text("receipt_number").notNull(),
  amount: real("amount").notNull(),
  method: text("method", { enum: ["cash", "card", "bank_transfer"] }).notNull(),
  reference: text("reference"),
  receivedBy: integer("received_by").notNull().references(() => users.id),
  paidAt: text("paid_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  note: text("note"),
}, (table) => [uniqueIndex("payments_receipt_uidx").on(table.receiptNumber), index("payments_invoice_idx").on(table.invoiceId)])

export const jobStatusHistory = sqliteTable("job_status_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  repairJobId: integer("repair_job_id").notNull().references(() => repairJobs.id, { onDelete: "cascade" }),
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
  note: text("note"),
  changedBy: integer("changed_by").notNull().references(() => users.id),
  changedAt: text("changed_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("job_status_history_job_idx").on(table.repairJobId)])

export const notifications = sqliteTable("notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  channel: text("channel", { enum: ["in_app", "email"] }).notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  entityType: text("entity_type"),
  entityId: integer("entity_id"),
  status: text("status", { enum: ["queued", "sent", "failed", "read"] }).notNull().default("queued"),
  sentAt: text("sent_at"),
  readAt: text("read_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("notifications_user_idx").on(table.userId), index("notifications_status_idx").on(table.status)])

export const auditLogs = sqliteTable("audit_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  actorUserId: integer("actor_user_id").references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  beforeJson: text("before_json"),
  afterJson: text("after_json"),
  ipAddress: text("ip_address"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("audit_entity_idx").on(table.entityType, table.entityId), index("audit_actor_idx").on(table.actorUserId)])
