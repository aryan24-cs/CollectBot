import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, differenceInDays, startOfDay } from "date-fns"
import { InvoiceItem } from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = "INR"): string {
  // Format numbers using the Indian number format (en-IN)
  const formatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency,
    maximumFractionDigits: 2,
  })
  return formatter.format(amount)
}

export function formatDate(date: string | Date): string {
  if (!date) return ""
  return format(new Date(date), "dd MMM yyyy")
}

export function formatDateShort(date: string | Date): string {
  if (!date) return ""
  return format(new Date(date), "dd/MM/yyyy")
}

export function getDaysOverdue(dueDate: string | Date): number {
  if (!dueDate) return 0
  const today = startOfDay(new Date())
  const due = startOfDay(new Date(dueDate))
  return differenceInDays(today, due)
}

export function getInvoiceStatusColor(status: string): string {
  switch (status) {
    case "draft":
      return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
    case "sent":
      return "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800"
    case "viewed":
      return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800"
    case "paid":
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
    case "overdue":
      return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
    case "cancelled":
      return "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
    case "partial":
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
    default:
      return "bg-slate-100 text-slate-700 border-slate-200"
  }
}

export function generateInvoiceNumber(prefix: string, counter: number): string {
  const year = new Date().getFullYear()
  const paddedCounter = String(counter).padStart(3, "0")
  return `${prefix}-${year}-${paddedCounter}`
}

export function calculateInvoiceTotals(items: InvoiceItem[]) {
  const subtotal = items.reduce((acc, item) => {
    const qty = Number(item.quantity) || 0
    const rate = Number(item.rate) || 0
    return acc + (qty * rate)
  }, 0)

  const taxAmount = items.reduce((acc, item) => {
    const qty = Number(item.quantity) || 0
    const rate = Number(item.rate) || 0
    const taxRate = Number(item.tax_rate) || 0
    const amount = qty * rate
    return acc + (amount * (taxRate / 100))
  }, 0)

  const total = subtotal + taxAmount

  return {
    subtotal,
    taxAmount,
    total,
  }
}

