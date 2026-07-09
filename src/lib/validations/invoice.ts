import { z } from "zod"

export const invoiceItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  rate: z.coerce.number().nonnegative("Rate must be 0 or greater"),
  tax_rate: z.coerce.number().nonnegative("Tax rate must be 0 or greater").default(0),
  sort_order: z.number().int().default(0),
})

export const invoiceSchema = z.object({
  client_id: z.string().min(1, "Client is required"),
  invoice_number: z.string().min(1, "Invoice number is required"),
  issue_date: z.string().min(1, "Issue date is required"),
  due_date: z.string().min(1, "Due date is required"),
  discount: z.coerce.number().nonnegative("Discount must be 0 or greater").default(0),
  notes: z.string().optional().or(z.literal("")),
  terms: z.string().optional().or(z.literal("")),
  is_recurring: z.boolean().default(false),
  recurring_frequency: z.enum(["weekly", "monthly", "quarterly", "yearly"]).optional(),
  recurring_start_date: z.string().optional(),
  recurring_end_date: z.string().optional().or(z.literal("")),
  items: z.array(invoiceItemSchema).min(1, "At least 1 line item is required"),
}).refine((data) => {
  const issue = new Date(data.issue_date)
  const due = new Date(data.due_date)
  return due >= issue
}, {
  message: "Due date must be on or after the issue date",
  path: ["due_date"],
})

export type InvoiceFormValues = z.infer<typeof invoiceSchema>
export type InvoiceItemFormValues = z.infer<typeof invoiceItemSchema>
