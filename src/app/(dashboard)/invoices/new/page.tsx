"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Sparkles, 
  Eye, 
  Save, 
  Send, 
  Loader2, 
  FileText, 
  Building,
  UserPlus,
  AlertTriangle
} from "lucide-react"
import { toast } from "sonner"

import getSupabaseBrowserClient from "@/lib/supabase/client"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Switch } from "@/components/ui/switch"
import { invoiceSchema, type InvoiceFormValues } from "@/lib/validations/invoice"
import { formatCurrency, formatDate, cn } from "@/lib/utils"
import { Client, Business } from "@/types"

export default function NewInvoicePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get("editId")
  const preselectedClientId = searchParams.get("clientId")
  const supabase = getSupabaseBrowserClient()

  // Data Loading States
  const [clients, setClients] = React.useState<Client[]>([])
  const [business, setBusiness] = React.useState<Business | null>(null)
  const [isLoadingData, setIsLoadingData] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)

  // Selected client helper info
  const [selectedClient, setSelectedClient] = React.useState<Client | null>(null)
  const [isCustomTerms, setIsCustomTerms] = React.useState(false)

  // React Hook Form Configuration
  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema) as any,
    defaultValues: {
      client_id: "",
      invoice_number: "",
      issue_date: new Date().toISOString().split("T")[0],
      due_date: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split("T")[0],
      discount: 0,
      notes: "Thank you for your business!",
      terms: "Payment is due within invoice terms. Late payments are subject to a 2% monthly interest fee.",
      is_recurring: false,
      recurring_frequency: "monthly",
      recurring_start_date: new Date().toISOString().split("T")[0],
      recurring_end_date: "",
      items: [
        { description: "", quantity: 1, rate: 0, tax_rate: 18, sort_order: 0 },
      ],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  })

  // Watch inputs for Live Calculations & Previews
  const watchedItems = form.watch("items") || []
  const watchedDiscount = form.watch("discount") || 0
  const watchedIssueDate = form.watch("issue_date")
  const watchedInvoiceNumber = form.watch("invoice_number")
  const watchedNotes = form.watch("notes")
  const watchedTerms = form.watch("terms")

  // Load clients and business profile
  React.useEffect(() => {
    async function loadData() {
      setIsLoadingData(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push("/login")
          return
        }

        // Fetch Business profile
        const { data: biz } = await supabase
          .from("businesses")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle()

        if (biz) {
          setBusiness(biz)
        }

        // Fetch Clients List
        const { data: clientList } = await supabase
          .from("clients")
          .select("*")
          .eq("business_id", biz?.id)
          .order("name", { ascending: true })

        setClients(clientList || [])

        // If Editing mode: load existing invoice details
        if (editId) {
          const res = await fetch(`/api/invoices/${editId}`)
          if (!res.ok) throw new Error("Failed to load invoice draft")
          const invoiceData = await res.json()
          
          if (invoiceData) {
            const schedule = invoiceData.recurring_schedules?.[0]
            form.reset({
              client_id: invoiceData.client_id || "",
              invoice_number: invoiceData.invoice_number || "",
              issue_date: invoiceData.issue_date || "",
              due_date: invoiceData.due_date || "",
              discount: Number(invoiceData.discount) || 0,
              notes: invoiceData.notes || "",
              terms: invoiceData.terms || "",
              is_recurring: invoiceData.is_recurring || false,
              recurring_frequency: schedule?.frequency || "monthly",
              recurring_start_date: schedule?.next_invoice_date || invoiceData.issue_date || "",
              recurring_end_date: schedule?.end_date || "",
              items: invoiceData.items.map((it: any) => ({
                description: it.description,
                quantity: Number(it.quantity) || 1,
                rate: Number(it.rate) || 0,
                tax_rate: Number(it.tax_rate) || 0,
                sort_order: it.sort_order || 0,
              })),
            })
            
            if (clientList) {
              const matched = clientList.find(c => c.id === invoiceData.client_id)
              if (matched) setSelectedClient(matched)
            }
          }
        } else {
          // If creation mode: auto-fill invoice serial number
          if (biz) {
            const prefix = biz.invoice_prefix || "INV"
            const counter = biz.invoice_counter || 1
            const year = new Date().getFullYear()
            const generatedNumber = `${prefix}-${year}-${String(counter).padStart(3, "0")}`
            form.setValue("invoice_number", generatedNumber)
          }

          // Preselect client from query params
          if (preselectedClientId && clientList) {
            const matched = clientList.find(c => c.id === preselectedClientId)
            if (matched) {
              form.setValue("client_id", preselectedClientId)
              setSelectedClient(matched)
              const days = matched.payment_terms || 7
              const issue = form.getValues("issue_date") ? new Date(form.getValues("issue_date")) : new Date()
              const due = new Date(issue.getTime() + days * 24 * 3600 * 1000)
              form.setValue("due_date", due.toISOString().split("T")[0])
            }
          }
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to load workflow resources.")
      } finally {
        setIsLoadingData(false)
      }
    }

    loadData()
  }, [supabase, router, editId, preselectedClientId])

  // Recalculate totals
  const { subtotal, taxAmount, total } = React.useMemo(() => {
    let sub = 0
    let tax = 0
    watchedItems.forEach((item) => {
      const q = Number(item?.quantity) || 0
      const r = Number(item?.rate) || 0
      const tRate = Number(item?.tax_rate) || 0
      const amt = q * r
      sub += amt
      tax += amt * (tRate / 100)
    })
    const tot = Math.max(0, sub + tax - Number(watchedDiscount || 0))
    return { subtotal: sub, taxAmount: tax, total: tot }
  }, [watchedItems, watchedDiscount])

  // Client Selection helper
  const handleClientChange = (clientIdVal: string | null) => {
    if (!clientIdVal) return
    form.setValue("client_id", clientIdVal, { shouldValidate: true })
    const clientSelected = clients.find((c) => c.id === clientIdVal)
    if (clientSelected) {
      setSelectedClient(clientSelected)
      const paymentTerms = clientSelected.payment_terms || 7
      const issueDateStr = form.getValues("issue_date") || new Date().toISOString().split("T")[0]
      const issueDateObj = new Date(issueDateStr)
      const dueDateObj = new Date(issueDateObj.getTime() + paymentTerms * 24 * 3600 * 1000)
      form.setValue("due_date", dueDateObj.toISOString().split("T")[0], { shouldValidate: true })
    }
  }

  // Issue Date adjustments
  const handleIssueDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newIssueStr = e.target.value
    form.setValue("issue_date", newIssueStr, { shouldValidate: true })
    if (selectedClient) {
      const paymentTerms = selectedClient.payment_terms || 7
      const issueDateObj = new Date(newIssueStr)
      const dueDateObj = new Date(issueDateObj.getTime() + paymentTerms * 24 * 3600 * 1000)
      form.setValue("due_date", dueDateObj.toISOString().split("T")[0], { shouldValidate: true })
    }
  }

  // Save Invoice logic
  const saveInvoice = async (values: InvoiceFormValues, isDraftOnly = true) => {
    if (!business?.upi_id) {
      toast.error("Please configure your UPI ID in Settings before drafting invoices.")
      return
    }

    setIsSaving(true)
    try {
      const method = editId ? "PUT" : "POST"
      const url = editId ? `/api/invoices/${editId}` : "/api/invoices"

      const payload = {
        ...values,
        status: isDraftOnly ? "draft" : "sent"
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to save invoice")
      }

      if (!isDraftOnly) {
        toast.success(`Invoice "${values.invoice_number}" was created and sent!`)
      } else {
        toast.success(`Invoice "${values.invoice_number}" was saved as a draft.`)
      }

      router.push("/invoices")
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Failed to process invoice.")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoadingData) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-ink-secondary animate-pulse max-w-6xl mx-auto">
        <Loader2 className="w-10 h-10 animate-spin text-brand-600 mb-4" />
        <p className="text-xs font-semibold">Loading resources...</p>
      </div>
    )
  }

  const hasMissingUPI = !business?.upi_id

  return (
    <div className="space-y-6 select-none max-w-7xl mx-auto pb-10">
      {/* Top Header */}
      <div className="flex flex-col gap-2 border-b border-surface-border/50 pb-5">
        <Link
          href="/invoices"
          className="inline-flex items-center gap-1.5 text-xs text-ink-secondary hover:text-ink-primary font-semibold transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Invoices
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink-black leading-none mt-2">
          {editId ? "Edit Invoice Draft" : "Create Invoice"}
        </h1>
        <p className="text-ink-secondary text-sm">Design invoices, select client tax rules, and pre-calculate totals.</p>
      </div>

      {/* Onboarding block if UPI is missing */}
      {hasMissingUPI && (
        <div className="p-4 rounded-card bg-danger-light border border-danger/20 text-danger-dark space-y-2 max-w-4xl">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span className="font-extrabold text-xs uppercase tracking-wider">UPI ID Configuration Required</span>
          </div>
          <p className="text-[11px] leading-relaxed font-semibold">
            To generate and send invoices, you must set up your payment details first. UPI integrations cannot process client checkouts without a destination UPI ID.
          </p>
          <button 
            type="button" 
            onClick={() => router.push("/settings")}
            className="text-xs font-bold underline hover:text-danger-dark cursor-pointer border-none bg-transparent p-0 block"
          >
            Go to Settings to configure UPI →
          </button>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit((v) => saveInvoice(v, true))} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: EDITOR FORM WIZARDS (7/12 Width) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* CARD 1: Client Selection */}
            <Card>
              <CardHeader className="border-b border-surface-border/50 pb-4">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-ink-black">Select Client</CardTitle>
                  <Link href="/clients/new" className="text-xs text-brand-600 hover:text-brand-700 hover:underline flex items-center gap-1 font-bold">
                    <UserPlus className="w-3.5 h-3.5" /> Register Client
                  </Link>
                </div>
                <CardDescription className="text-[10px] text-ink-secondary mt-0.5">Choose billing recipient profile.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-1.5">
                  <Select
                    onValueChange={handleClientChange}
                    defaultValue={form.getValues("client_id")}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full bg-cream-50 text-ink-primary h-11 border-none shadow-soft rounded-button px-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500/20 transition-all">
                        <SelectValue placeholder="Search and select client..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-white border border-surface-border rounded-xl shadow-floating max-h-56 z-50">
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="cursor-pointer text-xs font-medium py-2">
                          {c.name} {c.company_name ? `(${c.company_name})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs text-danger" />
                </div>

                {selectedClient && (
                  <div className="text-[10px] text-ink-secondary bg-cream-100 border border-surface-border/50 p-3 rounded-xl flex items-center gap-2 font-semibold">
                    <Building className="w-4 h-4 text-ink-secondary" />
                    <span>
                      Terms: Net {selectedClient.payment_terms} days. Total Paid:{" "}
                      <span className="font-extrabold text-ink-black">
                        {formatCurrency(Number(selectedClient.total_paid || 0))}
                      </span>
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* CARD 2: Invoice Details */}
            <Card>
              <CardHeader className="border-b border-surface-border/50 pb-4">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-ink-black">Invoice Details</CardTitle>
                <CardDescription className="text-[10px] text-ink-secondary mt-0.5">Core registry parameters.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="invoice_number"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-[10px] uppercase font-bold text-ink-secondary">Invoice Number *</FormLabel>
                        <FormControl>
                          <input
                            type="text"
                            placeholder="INV-2026-001"
                            className="w-full bg-cream-50 rounded-button px-4 py-3 text-xs font-medium text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-soft border-none transition-all font-mono"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-xs text-danger" />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-ink-secondary">Issue Date *</Label>
                    <input
                      type="date"
                      className="w-full bg-cream-50 rounded-button px-4 py-3 text-xs font-medium text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-soft border-none transition-all font-mono"
                      value={watchedIssueDate}
                      onChange={handleIssueDateChange}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="due_date"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-[10px] uppercase font-bold text-ink-secondary">Due Date *</FormLabel>
                        <FormControl>
                          <input
                            type="date"
                            className="w-full bg-cream-50 rounded-button px-4 py-3 text-xs font-medium text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-soft border-none transition-all font-mono"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-xs text-danger" />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-ink-secondary">Condition Terms</Label>
                    <Select
                      onValueChange={(val) => {
                        const days = parseInt(val || "7")
                        const issueStr = form.getValues("issue_date") || new Date().toISOString().split("T")[0]
                        const due = new Date(new Date(issueStr).getTime() + days * 24 * 3600 * 1000)
                        form.setValue("due_date", due.toISOString().split("T")[0], { shouldValidate: true })
                      }}
                      defaultValue="7"
                    >
                      <SelectTrigger className="w-full bg-cream-50 text-ink-primary h-11 border-none shadow-soft rounded-button px-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-brand-500/20 transition-all">
                        <SelectValue placeholder="Default Terms" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-surface-border rounded-xl shadow-floating z-50">
                        <SelectItem value="7" className="cursor-pointer text-xs py-2">Net 7 Days</SelectItem>
                        <SelectItem value="15" className="cursor-pointer text-xs py-2">Net 15 Days</SelectItem>
                        <SelectItem value="30" className="cursor-pointer text-xs py-2">Net 30 Days</SelectItem>
                        <SelectItem value="45" className="cursor-pointer text-xs py-2">Net 45 Days</SelectItem>
                        <SelectItem value="60" className="cursor-pointer text-xs py-2">Net 60 Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CARD 3: Line Items (Title has a "+" trigger button on the top right!) */}
            <Card>
              <CardHeader className="border-b border-surface-border/50 pb-4 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-ink-black">Items Breakdown</CardTitle>
                  <CardDescription className="text-[10px] text-ink-secondary mt-0.5">Itemized items and GST configurations.</CardDescription>
                </div>
                <button
                  type="button"
                  onClick={() => append({ description: "", quantity: 1, rate: 0, tax_rate: 18, sort_order: fields.length })}
                  className="w-8 h-8 rounded-full bg-cream-50 hover:bg-cream-100 flex items-center justify-center text-ink-primary shadow-soft transition-all cursor-pointer border-none"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {fields.map((field, index) => {
                  const qty = Number(watchedItems[index]?.quantity) || 0
                  const rate = Number(watchedItems[index]?.rate) || 0
                  const lineTotal = qty * rate

                  return (
                    <div key={field.id} className="grid grid-cols-12 gap-3 items-end border-b border-surface-border/30 pb-4 last:border-b-0 last:pb-0">
                      
                      <div className="col-span-12 sm:col-span-5 space-y-1">
                        <Label className="text-[9px] uppercase font-bold text-ink-secondary">Item Description</Label>
                        <input
                          type="text"
                          placeholder="Website Development Services"
                          className="w-full bg-cream-50 rounded-button px-3.5 py-2.5 text-xs text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-soft border-none transition-all"
                          {...form.register(`items.${index}.description` as const)}
                        />
                      </div>

                      <div className="col-span-3 sm:col-span-2 space-y-1">
                        <Label className="text-[9px] uppercase font-bold text-ink-secondary text-center block w-full">Qty</Label>
                        <input
                          type="number"
                          className="w-full bg-cream-50 rounded-button px-2.5 py-2.5 text-xs font-semibold text-ink-primary text-center focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-soft border-none transition-all font-mono"
                          placeholder="1"
                          {...form.register(`items.${index}.quantity` as const)}
                        />
                      </div>

                      <div className="col-span-4 sm:col-span-2 space-y-1">
                        <Label className="text-[9px] uppercase font-bold text-ink-secondary text-right block w-full font-sans">Rate (₹)</Label>
                        <input
                          type="number"
                          className="w-full bg-cream-50 rounded-button px-2.5 py-2.5 text-xs font-semibold text-ink-primary text-right focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-soft border-none transition-all font-mono"
                          placeholder="0"
                          {...form.register(`items.${index}.rate` as const)}
                        />
                      </div>

                      <div className="col-span-3 sm:col-span-2 space-y-1">
                        <Label className="text-[9px] uppercase font-bold text-ink-secondary text-center block w-full">GST %</Label>
                        <Select
                          onValueChange={(val) => form.setValue(`items.${index}.tax_rate`, parseInt(val || "18"))}
                          defaultValue={watchedItems[index]?.tax_rate?.toString() || "18"}
                        >
                          <SelectTrigger className="w-full bg-cream-50 text-ink-primary h-9.5 border-none shadow-soft rounded-button px-3.5 py-2 text-xs font-semibold font-mono focus:ring-2 focus:ring-brand-500/20 transition-all justify-between">
                            <SelectValue placeholder="GST%" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border border-surface-border rounded-xl shadow-floating z-50">
                            <SelectItem value="0" className="cursor-pointer text-xs font-mono py-1.5">0%</SelectItem>
                            <SelectItem value="5" className="cursor-pointer text-xs font-mono py-1.5">5%</SelectItem>
                            <SelectItem value="12" className="cursor-pointer text-xs font-mono py-1.5">12%</SelectItem>
                            <SelectItem value="18" className="cursor-pointer text-xs font-mono py-1.5">18%</SelectItem>
                            <SelectItem value="28" className="cursor-pointer text-xs font-mono py-1.5">28%</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="col-span-2 sm:col-span-1 flex justify-center pb-1">
                        <button
                          type="button"
                          className="w-8 h-8 rounded-full bg-cream-50 hover:bg-danger-light text-ink-secondary hover:text-danger-dark flex items-center justify-center shadow-soft transition-all cursor-pointer border-none disabled:opacity-40 disabled:cursor-not-allowed"
                          onClick={() => fields.length > 1 && remove(index)}
                          disabled={fields.length === 1}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}

                <button
                  type="button"
                  onClick={() => append({ description: "", quantity: 1, rate: 0, tax_rate: 18, sort_order: fields.length })}
                  className="w-full mt-2 border border-dashed border-surface-border/80 hover:bg-cream-50 text-ink-secondary hover:text-ink-primary text-xs font-bold py-3 rounded-button transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-soft"
                >
                  <Plus className="w-4 h-4" /> Add Item
                </button>
              </CardContent>
            </Card>

            {/* CARD 4: Recurring Settings */}
            <Card>
              <CardHeader className="p-5 border-b border-surface-border/50 flex flex-row items-center justify-between">
                <div className="space-y-0.5">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-ink-black">Automate (Recurring)</CardTitle>
                  <CardDescription className="text-[10px] text-ink-secondary">Generate and dispatch future invoices on schedule.</CardDescription>
                </div>
                <FormField
                  control={form.control}
                  name="is_recurring"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-y-0">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardHeader>
              {form.watch("is_recurring") && (
                <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="recurring_frequency"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-[10px] uppercase font-bold text-ink-secondary">Frequency</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="w-full bg-cream-50 text-ink-primary h-9.5 border-none shadow-soft rounded-button px-3.5 py-2 text-xs font-medium focus:ring-2 focus:ring-brand-500/20 transition-all justify-between">
                            <SelectValue placeholder="Select Frequency" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border border-surface-border rounded-xl shadow-floating z-50">
                            <SelectItem value="weekly" className="cursor-pointer text-xs py-1.5">Weekly</SelectItem>
                            <SelectItem value="monthly" className="cursor-pointer text-xs py-1.5">Monthly</SelectItem>
                            <SelectItem value="quarterly" className="cursor-pointer text-xs py-1.5">Quarterly</SelectItem>
                            <SelectItem value="yearly" className="cursor-pointer text-xs py-1.5">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-xs text-danger" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="recurring_start_date"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-[10px] uppercase font-bold text-ink-secondary">First Date</FormLabel>
                        <FormControl>
                          <input
                            type="date"
                            className="w-full bg-cream-50 rounded-button px-3 py-2 text-xs font-medium text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-soft border-none transition-all font-mono"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-xs text-danger" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="recurring_end_date"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-[10px] uppercase font-bold text-ink-secondary">End Date</FormLabel>
                        <FormControl>
                          <input
                            type="date"
                            placeholder="Until Cancelled"
                            className="w-full bg-cream-50 rounded-button px-3 py-2 text-xs font-medium text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-soft border-none transition-all font-mono"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage className="text-xs text-danger" />
                      </FormItem>
                    )}
                  />
                </CardContent>
              )}
            </Card>

            {/* CARD 5: Totals, Notes & Terms */}
            <Card>
              <CardHeader className="border-b border-surface-border/50 pb-4">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-ink-black">Notes & Terms</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Notes visible left */}
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-[10px] uppercase font-bold text-ink-secondary">Client Notes</FormLabel>
                        <FormControl>
                          <Textarea className="w-full bg-cream-50 rounded-button px-4 py-3 text-xs font-medium text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-soft border-none min-h-[60px]" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="terms"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-[10px] uppercase font-bold text-ink-secondary">Terms & Conditions</FormLabel>
                        <FormControl>
                          <Textarea className="w-full bg-cream-50 rounded-button px-4 py-3 text-xs font-medium text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-soft border-none min-h-[60px]" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Calculations right */}
                <div className="space-y-4 bg-cream-50 p-6 rounded-card border border-surface-border/40 text-xs">
                  <div className="flex justify-between font-semibold text-ink-secondary">
                    <span>Subtotal</span>
                    <span className="font-mono">{formatCurrency(subtotal)}</span>
                  </div>
                  
                  <div className="flex justify-between font-semibold text-ink-secondary">
                    <span>GST (Estimated Tax)</span>
                    <span className="font-mono">{formatCurrency(taxAmount)}</span>
                  </div>

                  <div className="flex items-center justify-between gap-4 font-semibold text-ink-secondary">
                    <span>Discount (₹)</span>
                    <input
                      type="number"
                      className="bg-white rounded-button text-ink-primary font-semibold font-mono text-right w-24 h-8 px-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500/20 border-none shadow-soft transition-all"
                      {...form.register("discount" as const)}
                    />
                  </div>
                  
                  <div className="border-t border-surface-border/60 my-2 pt-2" />
                  
                  <div className="flex justify-between items-center text-sm font-black text-ink-black pt-1">
                    <span>Invoice Total</span>
                    <span className="text-lg text-brand-600 font-display font-extrabold">{formatCurrency(total)}</span>
                  </div>
                </div>

              </CardContent>
              
              <CardFooter className="flex justify-between border-t border-surface-border/50 p-5 mt-2 gap-3">
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    variant="outline"
                    disabled={isSaving || hasMissingUPI}
                  >
                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save Draft
                  </Button>

                  {/* Preview Modal trigger for small responsive devices */}
                  <Dialog>
                    <DialogTrigger className={cn(buttonVariants({ variant: "outline" }), "lg:hidden text-xs cursor-pointer")}>
                      <Eye className="w-3.5 h-3.5" />
                      Preview
                    </DialogTrigger>
                    <DialogContent className="bg-white border-surface-border text-ink-primary max-w-lg max-h-[85vh] overflow-y-auto rounded-card shadow-floating z-50 p-4">
                      <div className="p-1">
                        <InvoiceLivePreview
                          business={business}
                          selectedClient={selectedClient}
                          invoiceNumber={watchedInvoiceNumber}
                          issueDate={watchedIssueDate}
                          dueDate={form.getValues("due_date")}
                          items={watchedItems}
                          subtotal={subtotal}
                          taxAmount={taxAmount}
                          discount={watchedDiscount}
                          total={total}
                          notes={watchedNotes || ""}
                          terms={watchedTerms || ""}
                        />
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <Button
                  type="button"
                  variant="primary"
                  onClick={form.handleSubmit((v: any) => saveInvoice(v, false))}
                  disabled={isSaving || hasMissingUPI}
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Send Invoice
                </Button>
              </CardFooter>
            </Card>

          </div>

          {/* RIGHT COLUMN: STICKY A4 PREVIEW PANE (5/12 Width - Desktop only) */}
          <div className="hidden lg:block lg:col-span-5 sticky top-6 bg-cream-100 border-none rounded-card p-6 shadow-soft">
            <div className="flex justify-between items-center border-b border-surface-border/50 pb-3 mb-4 select-none">
              <h3 className="text-xs font-bold text-ink-black tracking-wider uppercase flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-brand-600 animate-pulse" /> Live Preview
              </h3>
            </div>
            
            <InvoiceLivePreview
              business={business}
              selectedClient={selectedClient}
              invoiceNumber={watchedInvoiceNumber}
              issueDate={watchedIssueDate}
              dueDate={form.getValues("due_date")}
              items={watchedItems}
              subtotal={subtotal}
              taxAmount={taxAmount}
              discount={watchedDiscount}
              total={total}
              notes={watchedNotes || ""}
              terms={watchedTerms || ""}
            />
          </div>

        </form>
      </Form>
    </div>
  )
}

// Live Preview inner subcomponent styled like A4 Sheet
interface PreviewProps {
  business: Business | null
  selectedClient: Client | null
  invoiceNumber: string
  issueDate: string
  dueDate: string
  items: any[]
  subtotal: number
  taxAmount: number
  discount: number
  total: number
  notes: string
  terms: string
}

function InvoiceLivePreview({
  business,
  selectedClient,
  invoiceNumber,
  issueDate,
  dueDate,
  items,
  subtotal,
  taxAmount,
  discount,
  total,
  notes,
  terms,
}: PreviewProps) {
  return (
    <div className="bg-surface-white text-ink-primary p-6 rounded-card shadow-card font-sans border border-surface-border/40 text-xs space-y-6">
      {/* Top details layout */}
      <div className="flex justify-between items-start gap-4 select-none">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-brand-600 block">INVOICE</span>
          <h2 className="text-base font-extrabold text-ink-black mt-1">{business?.name || "Your Workspace"}</h2>
          <p className="text-[10px] text-ink-secondary mt-0.5 leading-tight">{business?.address || "Street Address"}</p>
          <p className="text-[10px] text-ink-secondary leading-tight">{business?.city}, {business?.state} {business?.pincode}</p>
          {business?.gstin && <p className="text-[10px] font-semibold text-ink-primary mt-1">GSTIN: {business.gstin}</p>}
        </div>

        <div className="text-right">
          <div className="text-sm font-bold text-ink-black font-mono"># {invoiceNumber || "INV-000"}</div>
          <div className="mt-2 space-y-1 text-[10px] text-ink-secondary">
            <div>
              <span>Issue Date:</span> <span className="text-ink-primary font-mono font-bold">{formatDate(issueDate)}</span>
            </div>
            <div>
              <span>Due Date:</span> <span className="text-ink-primary font-mono font-bold">{formatDate(dueDate)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-surface-border/50 my-3" />

      {/* Bill To */}
      <div className="select-none">
        <span className="text-[9px] uppercase tracking-wider text-ink-secondary font-bold block mb-1">BILL TO</span>
        <h3 className="text-xs font-bold text-ink-black">{selectedClient?.name || "Recipient Name"}</h3>
        {selectedClient?.company_name && <p className="text-[10px] text-ink-secondary mt-0.5">{selectedClient.company_name}</p>}
        <p className="text-[10px] text-ink-secondary mt-0.5 max-w-xs leading-normal">{selectedClient?.address || "Billing address placeholder"}</p>
        {selectedClient?.gstin && <p className="text-[9px] font-semibold text-ink-secondary mt-1">GSTIN: {selectedClient.gstin}</p>}
      </div>

      {/* Items Table */}
      <div className="border border-surface-border rounded-xl overflow-hidden shadow-soft select-none">
        <table className="w-full text-left border-collapse text-[10px]">
          <thead>
            <tr className="bg-cream-50 text-[9px] font-bold text-ink-secondary border-b border-surface-border">
              <th className="px-3 py-2 w-8">#</th>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2 text-center w-12">Qty</th>
              <th className="px-3 py-2 text-right w-16">Rate</th>
              <th className="px-3 py-2 text-right w-14">GST %</th>
              <th className="px-3 py-2 text-right w-20">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border/50 text-ink-primary">
            {items.map((it, idx) => {
              const qty = Number(it.quantity) || 0
              const rate = Number(it.rate) || 0
              const taxRate = Number(it.tax_rate) || 0
              const amount = qty * rate
              
              if (!it.description && qty === 1 && rate === 0) return null

              return (
                <tr key={idx} className="hover:bg-cream-50/20">
                  <td className="px-3 py-2 font-mono text-ink-muted">{idx + 1}</td>
                  <td className="px-3 py-2 font-bold text-ink-black">{it.description || "(Empty Description)"}</td>
                  <td className="px-3 py-2 text-center font-mono">{qty}</td>
                  <td className="px-3 py-2 text-right font-mono">{formatCurrency(rate)}</td>
                  <td className="px-3 py-2 text-right font-mono text-ink-secondary">{taxRate}%</td>
                  <td className="px-3 py-2 text-right font-mono font-bold text-ink-black">{formatCurrency(amount)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Summary calculations */}
      <div className="flex justify-end pt-2 select-none">
        <div className="w-48 space-y-2 text-[10px]">
          <div className="flex justify-between text-ink-secondary">
            <span>Subtotal:</span>
            <span className="font-mono">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-ink-secondary">
            <span>GST Amount:</span>
            <span className="font-mono">{formatCurrency(taxAmount)}</span>
          </div>
          {Number(discount) > 0 && (
            <div className="flex justify-between text-danger font-bold">
              <span>Discount:</span>
              <span className="font-mono">-{formatCurrency(Number(discount))}</span>
            </div>
          )}
          <div className="flex justify-between items-center text-xs font-black text-ink-black border-t border-surface-border pt-2 bg-cream-50 p-2 rounded-xl">
            <span>TOTAL:</span>
            <span className="font-mono text-brand-600 font-extrabold">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      {/* Payment details */}
      <div className="border-t border-surface-border/50 pt-4 space-y-3 select-none">
        <div className="grid grid-cols-2 gap-4 text-[9px]">
          <div>
            <span className="text-[8px] font-extrabold uppercase tracking-wider text-ink-secondary block mb-1">Payment Details</span>
            {business?.upi_id && <div><span className="text-ink-secondary">UPI ID:</span> <span className="font-bold text-ink-primary font-mono">{business.upi_id}</span></div>}
            {business?.bank_name && (
              <div className="mt-0.5 leading-normal">
                <span className="text-ink-secondary">Bank:</span> <span className="text-ink-primary font-bold">{business.bank_name}</span> | <span className="text-ink-secondary">A/C:</span> <span className="font-mono text-ink-primary font-bold">{business.account_number}</span> | <span className="text-ink-secondary">IFSC:</span> <span className="font-mono text-ink-primary font-bold">{business.ifsc_code}</span>
              </div>
            )}
          </div>
          <div>
            <span className="text-[8px] font-extrabold uppercase tracking-wider text-ink-secondary block mb-1">Notes</span>
            <p className="text-ink-secondary italic leading-relaxed">"{notes}"</p>
          </div>
        </div>

        <div className="text-[8px] text-ink-secondary border-t border-surface-border/50 pt-3 flex justify-between items-center leading-normal">
          <p className="max-w-[75%]"><strong>Terms:</strong> {terms}</p>
          <p className="text-right text-brand-600 font-extrabold uppercase tracking-wider">Powered by CollectBot</p>
        </div>
      </div>
    </div>
  )
}
