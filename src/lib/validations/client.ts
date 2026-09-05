import { z } from "zod"

export const clientSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .min(1, "Phone number is required")
    .transform((val) => val.replace(/[\s\-\(\)]/g, ""))
    .refine((val) => /^(?:\+91|0)?[6-9]\d{9}$/.test(val), {
      message: "Invalid Indian phone number (10 digits required)",
    }),
  company_name: z.string().trim().optional().or(z.literal("")),
  address: z.string().trim().optional().or(z.literal("")),
  gstin: z
    .string()
    .transform((val) => (val ? val.trim().toUpperCase() : ""))
    .refine(
      (val) => !val || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(val),
      { message: "Invalid GSTIN format (15 characters expected)" }
    )
    .optional()
    .or(z.literal("")),
  payment_terms: z.coerce.number().int().nonnegative().default(7),
  notes: z.string().optional().or(z.literal("")),
  tags: z.array(z.string()).default([]),
})


export type ClientFormValues = z.infer<typeof clientSchema>

