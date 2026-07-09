import { z } from "zod"

export const clientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z
    .string()
    .min(1, "Phone number is required")
    .regex(/^(?:\+91|0)?[6-9]\d{9}$/, "Invalid Indian phone number (10 digits required)"),
  company_name: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  gstin: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GSTIN format (15 characters expected)")
    .optional()
    .or(z.literal(""))
    .or(z.undefined()),
  payment_terms: z.coerce.number().int().nonnegative().default(7),
  notes: z.string().optional().or(z.literal("")),
  tags: z.array(z.string()).default([]),
})

export type ClientFormValues = z.infer<typeof clientSchema>
