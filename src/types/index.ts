export interface Business {
  id: string
  user_id: string
  name: string
  logo_url: string | null
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  pincode: string | null
  gstin: string | null
  pan: string | null
  bank_name: string | null
  account_number: string | null
  ifsc_code: string | null
  upi_id: string | null
  currency: string
  timezone: string
  whatsapp_number: string | null
  invoice_prefix: string
  invoice_counter: number
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  business_id: string
  name: string
  email: string | null
  phone: string
  company_name: string | null
  address: string | null
  gstin: string | null
  payment_terms: number
  notes: string | null
  tags: string[]
  total_invoiced: number
  total_paid: number
  created_at: string
  updated_at: string
}

export interface InvoiceItem {
  id?: string
  invoice_id?: string
  description: string
  quantity: number
  rate: number
  amount: number
  tax_rate: number
  tax_amount: number
  sort_order: number
}

export interface Invoice {
  id: string
  business_id: string
  client_id: string | null
  invoice_number: string
  status: 'draft' | 'sent' | 'viewed' | 'paid' | 
          'overdue' | 'cancelled' | 'partial'
  issue_date: string
  due_date: string
  subtotal: number
  tax_amount: number
  discount: number
  total: number
  amount_paid: number
  balance_due: number
  notes: string | null
  terms: string | null
  pdf_url: string | null
  payment_link: string | null
  payment_link_id: string | null
  sent_at: string | null
  viewed_at: string | null
  paid_at: string | null
  reminder_paused: boolean
  reminder_count: number
  is_recurring: boolean
  created_at: string
  updated_at: string
  client?: Client
  items?: InvoiceItem[]
}

export interface Payment {
  id: string
  invoice_id: string
  business_id: string
  amount: number
  payment_method: string
  razorpay_id: string | null
  status: 'pending' | 'success' | 'failed' | 'refunded'
  paid_at: string | null
  notes: string | null
  created_at: string
}

export interface NotificationSettings {
  id: string
  business_id: string
  reminder_7_before: boolean
  reminder_3_before: boolean
  reminder_1_before: boolean
  reminder_due_day: boolean
  reminder_1_after: boolean
  reminder_3_after: boolean
  reminder_7_after: boolean
  reminder_14_after: boolean
  channel_whatsapp: boolean
  channel_email: boolean
  quiet_hours_start: string
  quiet_hours_end: string
  owner_payment_alert: boolean
  owner_daily_summary: boolean
}

export interface DashboardStats {
  totalInvoicedThisMonth: number
  totalCollectedThisMonth: number
  totalOutstanding: number
  totalOverdue: number
  collectionRate: number
  overdueInvoices: Invoice[]
  recentActivity: ActivityLog[]
}

export interface ActivityLog {
  id: string
  business_id: string
  type: string
  description: string
  metadata: Record<string, unknown>
  created_at: string
}
