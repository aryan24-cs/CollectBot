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
  UserPlus
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
        { description: "", quantity: 1, rate: 0, tax_rate: 18, sort_order: 1 },
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

          // Preselect client from query params if coming from Client Details page
          if (preselectedClientId && clientList) {
            const matched = clientList.find(c => c.id === preselectedClientId)
            if (matched) {
              form.setValue("client_id", preselectedClientId)
              setSelectedClient(matched)
              // Auto-fill due date
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

  // Recalculate totals in real-time
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

  // Handle Client Selection & set due dates
  const handleClientChange = (clientIdVal: string | null) => {
    if (!clientIdVal) return
    form.setValue("client_id", clientIdVal, { shouldValidate: true })
    const clientSelected = clients.find((c) => c.id === clientIdVal)
    if (clientSelected) {
      setSelectedClient(clientSelected)
      
      // Auto adjust due date
      const paymentTerms = clientSelected.payment_terms || 7
      const issueDateStr = form.getValues("issue_date") || new Date().toISOString().split("T")[0]
      const issueDateObj = new Date(issueDateStr)
      const dueDateObj = new Date(issueDateObj.getTime() + paymentTerms * 24 * 3600 * 1000)
      
      form.setValue("due_date", dueDateObj.toISOString().split("T")[0], { shouldValidate: true })
    }
  }

  // Handle Issue Date changes to update due date if client selected
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

  // Save Invoice handler
  const saveInvoice = async (values: InvoiceFormValues, isDraftOnly = true) => {
    if (!business?.upi_id || !business?.bank_name || !business?.account_number || !business?.ifsc_code) {
      toast.error("Please configure your UPI ID and Bank Details in Settings first before creating invoices.")
      return
    }

    setIsSaving(true)
    try {
      const method = editId ? "PUT" : "POST"
      const url = editId ? `/api/invoices/${editId}` : "/api/invoices"

      // Force status to draft if clicked "Save as Draft"
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

      // If clicked Send Invoice, generate PDF and trigger whatsapp queue (handled in Phase 3/4)
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
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-white">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
        <p className="text-slate-400">Loading resources...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 select-none max-w-7xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/invoices"
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "text-slate-400 hover:text-white hover:bg-slate-800 -ml-3 mb-2 gap-2 text-xs"
            )}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Invoices
          </Link>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            {editId ? "Edit Invoice Draft" : "Create Invoice"}
          </h1>
          <p className="text-slate-400 text-sm">Design invoices, select client tax rules, and pre-calculate totals.</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((v) => saveInvoice(v, true))} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: EDIT FORM */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl text-slate-100 shadow-2xl">
              <CardHeader className="border-b border-slate-800/60 pb-4">
                <CardTitle className="text-lg text-indigo-400 flex items-center gap-2">
                  <FileText className="w-5 h-5" /> Invoice Metadata
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 pt-5">
                {/* Client selection row */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-slate-300">Select Client *</Label>
                    <Link href="/clients/new" className="text-xs text-indigo-400 hover:underline flex items-center gap-1">
                      <UserPlus className="w-3 h-3" /> Add New Client
                    </Link>
                  </div>
                  <Select
                    onValueChange={handleClientChange}
                    defaultValue={form.getValues("client_id")}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-slate-950 border-slate-800 text-white focus:ring-indigo-500">
                        <SelectValue placeholder="Search and select client..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} {c.company_name ? `(${c.company_name})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />

                  {/* Client outstanding helper status */}
                  {selectedClient && (
                    <div className="text-[11px] text-amber-400 bg-amber-500/5 border border-amber-500/10 p-2.5 rounded-lg flex items-center gap-2 mt-1">
                      <Building className="w-3.5 h-3.5" />
                      <span>
                        This client has Net {selectedClient.payment_terms} days terms. Outstanding:{" "}
                        <span className="font-bold">
                          {formatCurrency(
                            Math.max(0, Number(selectedClient.total_invoiced || 0) - Number(selectedClient.total_paid || 0))
                          )}
                        </span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Serial number & issue date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control as any}
                    name="invoice_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-300">Invoice Number *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="INV-2026-001"
                            className="bg-slate-950 border-slate-800 text-white focus-visible:ring-indigo-500 font-mono"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2">
                    <Label className="text-slate-300">Issue Date *</Label>
                    <Input
                      type="date"
                      className="bg-slate-950 border-slate-800 text-white focus-visible:ring-indigo-500 font-mono"
                      value={watchedIssueDate}
                      onChange={handleIssueDateChange}
                    />
                  </div>
                </div>

                {/* Due date & Terms */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control as any}
                    name="due_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-300">Due Date *</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            className="bg-slate-950 border-slate-800 text-white focus-visible:ring-indigo-500 font-mono"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2">
                    <Label className="text-slate-300">Payment Conditions</Label>
                    <Select
                      onValueChange={(val) => {
                        if (val === "custom") {
                          setIsCustomTerms(true)
                        } else {
                          setIsCustomTerms(false)
                          if (selectedClient) {
                            // If client has payment terms, override with what user picked
                            const days = parseInt(val || "7")
                            const issueStr = form.getValues("issue_date") || new Date().toISOString().split("T")[0]
                            const due = new Date(new Date(issueStr).getTime() + days * 24 * 3600 * 1000)
                            form.setValue("due_date", due.toISOString().split("T")[0])
                          }
                        }
                      }}
                      defaultValue="7"
                    >
                      <SelectTrigger className="bg-slate-950 border-slate-800 text-white focus:ring-indigo-500">
                        <SelectValue placeholder="Default terms" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                        <SelectItem value="7">Net 7 Days</SelectItem>
                        <SelectItem value="15">Net 15 Days</SelectItem>
                        <SelectItem value="30">Net 30 Days</SelectItem>
                        <SelectItem value="45">Net 45 Days</SelectItem>
                        <SelectItem value="60">Net 60 Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Line items editor section */}
            <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl text-slate-100 shadow-2xl">
              <CardHeader className="border-b border-slate-800/60 pb-4">
                <CardTitle className="text-lg text-indigo-400">Line Items Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-5">
                {fields.map((field, index) => {
                  const qty = Number(watchedItems[index]?.quantity) || 0
                  const rate = Number(watchedItems[index]?.rate) || 0
                  const taxRate = Number(watchedItems[index]?.tax_rate) || 0
                  const lineTotal = qty * rate

                  return (
                    <div key={field.id} className="grid grid-cols-12 gap-3 items-end border-b border-slate-850 pb-4 last:border-b-0 last:pb-0">
                      <div className="col-span-12 sm:col-span-5 space-y-1.5">
                        {index === 0 && <Label className="text-slate-400 text-xs">Item Description</Label>}
                        <Input
                          placeholder="e.g. Website Development"
                          className="bg-slate-950 border-slate-800 text-white focus-visible:ring-indigo-500 text-xs"
                          {...form.register(`items.${index}.description` as const)}
                        />
                      </div>

                      <div className="col-span-3 sm:col-span-2 space-y-1.5">
                        {index === 0 && <Label className="text-slate-400 text-xs text-center w-full block">Qty</Label>}
                        <Input
                          type="number"
                          className="bg-slate-950 border-slate-800 text-white focus-visible:ring-indigo-500 font-mono text-center text-xs"
                          placeholder="1"
                          {...form.register(`items.${index}.quantity` as const)}
                        />
                      </div>

                      <div className="col-span-4 sm:col-span-2 space-y-1.5">
                        {index === 0 && <Label className="text-slate-400 text-xs text-right w-full block">Rate (₹)</Label>}
                        <Input
                          type="number"
                          className="bg-slate-950 border-slate-800 text-white focus-visible:ring-indigo-500 font-mono text-right text-xs"
                          placeholder="0"
                          {...form.register(`items.${index}.rate` as const)}
                        />
                      </div>

                      <div className="col-span-3 sm:col-span-2 space-y-1.5">
                        {index === 0 && <Label className="text-slate-400 text-xs text-center w-full block">GST %</Label>}
                        <Select
                          onValueChange={(val) => form.setValue(`items.${index}.tax_rate`, parseInt(val || "18"))}
                          defaultValue={watchedItems[index]?.tax_rate?.toString() || "18"}
                        >
                          <SelectTrigger className="bg-slate-950 border-slate-800 text-white focus:ring-indigo-500 text-xs h-8 px-2 font-mono">
                            <SelectValue placeholder="Tax%" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 border-slate-800 text-slate-100 min-w-[80px]">
                            <SelectItem value="0">0%</SelectItem>
                            <SelectItem value="5">5%</SelectItem>
                            <SelectItem value="12">12%</SelectItem>
                            <SelectItem value="18">18%</SelectItem>
                            <SelectItem value="28">28%</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="col-span-2 sm:col-span-1 flex items-center justify-center pb-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-slate-500 hover:text-rose-400 h-8 w-8"
                          onClick={() => fields.length > 1 && remove(index)}
                          disabled={fields.length === 1}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => append({ description: "", quantity: 1, rate: 0, tax_rate: 18, sort_order: fields.length })}
                  className="w-full mt-2 bg-slate-950/40 border-slate-800 border-dashed hover:bg-slate-800 text-slate-300 gap-1.5 text-xs font-semibold"
                >
                  <Plus className="w-4 h-4" /> Add Line Item
                </Button>
              </CardContent>
            </Card>

            {/* Recurring Invoice Settings */}
            <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl text-slate-100 shadow-2xl">
              <CardHeader className="p-5 border-b border-slate-800/60 flex flex-row items-center justify-between">
                <div className="space-y-0.5">
                  <CardTitle className="text-sm font-bold text-white">Automate Invoicing (Recurring)</CardTitle>
                  <CardDescription className="text-[10px] text-slate-400">Generate and dispatch future invoices on a schedule.</CardDescription>
                </div>
                <FormField
                  control={form.control as any}
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
                  {/* Frequency selection */}
                  <FormField
                    control={form.control as any}
                    name="recurring_frequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-450 text-xs font-semibold">Billing Frequency</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="bg-slate-950 border-slate-800 text-white text-xs w-full h-8">
                            <SelectValue placeholder="Select Frequency" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-950 border-slate-800 text-white">
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                            <SelectItem value="yearly">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />

                  {/* Start Date */}
                  <FormField
                    control={form.control as any}
                    name="recurring_start_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-450 text-xs font-semibold">First Issue Date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            className="bg-slate-950 border-slate-800 text-white text-xs h-8"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />

                  {/* End Date */}
                  <FormField
                    control={form.control as any}
                    name="recurring_end_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-450 text-xs font-semibold">End Date (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            placeholder="Until Cancelled"
                            className="bg-slate-950 border-slate-800 text-white text-xs h-8"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                </CardContent>
              )}
            </Card>

            {/* Totals & Notes */}
            <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl text-slate-100 shadow-2xl">
              <CardContent className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Notes and terms left */}
                <div className="space-y-4">
                  <FormField
                    control={form.control as any}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-400 text-xs">Notes visible on Invoice</FormLabel>
                        <FormControl>
                          <Textarea className="bg-slate-950 border-slate-800 text-white min-h-[50px] text-xs" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control as any}
                    name="terms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-400 text-xs">Terms & Conditions</FormLabel>
                        <FormControl>
                          <Textarea className="bg-slate-950 border-slate-800 text-white min-h-[50px] text-xs" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Calculations right */}
                <div className="space-y-3 bg-slate-950/50 p-4 rounded-xl border border-slate-800/80 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Subtotal</span>
                    <span className="font-mono">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Estimated Tax (GST)</span>
                    <span className="font-mono">{formatCurrency(taxAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-400">Discount Amount (₹)</span>
                    <Input
                      type="number"
                      className="bg-slate-950 border-slate-800 text-white focus-visible:ring-indigo-500 font-mono text-right w-24 h-7 text-xs"
                      {...form.register("discount" as const)}
                    />
                  </div>
                  <hr className="border-slate-850" />
                  <div className="flex justify-between items-center text-base font-bold text-white pt-1">
                    <span>Invoice Total</span>
                    <span className="font-mono text-indigo-400">{formatCurrency(total)}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between border-t border-slate-800/60 p-5 mt-2 gap-3">
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    className="bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs gap-1.5"
                    disabled={isSaving}
                  >
                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save Draft
                  </Button>

                  {/* Preview Modal for mobile */}
                  <Dialog>
                    <DialogTrigger className={cn(buttonVariants({ variant: "outline" }), "border-slate-805 text-slate-300 hover:bg-slate-800 lg:hidden text-xs gap-1.5 cursor-pointer")}>
                      <Eye className="w-3.5 h-3.5" />
                      Preview
                    </DialogTrigger>
                    <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-lg max-h-[85vh] overflow-y-auto">
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
                  onClick={form.handleSubmit((v: any) => saveInvoice(v, false))}
                  className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white font-medium text-xs gap-1.5"
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Send Invoice
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* RIGHT COLUMN: LIVE PREVIEW (Desktop only) */}
          <div className="hidden lg:block lg:col-span-5 sticky top-6">
            <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl text-slate-100 shadow-2xl p-6 overflow-y-auto max-h-[calc(100vh-80px)]">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
                <h3 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-400" /> A4 Invoice Live Preview
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
            </Card>
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
    <div className="bg-white text-slate-800 p-6 rounded-lg shadow-inner font-sans border border-slate-200 text-xs space-y-6">
      {/* Top details layout */}
      <div className="flex justify-between items-start gap-4">
        <div>
          <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-600">INVOICE</span>
          <h2 className="text-base font-black text-slate-900 mt-1">{business?.name || "Acme Agency"}</h2>
          <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{business?.address || "Address Line 1"}</p>
          <p className="text-[10px] text-slate-500 leading-tight">{business?.city}, {business?.state} {business?.pincode}</p>
          {business?.gstin && <p className="text-[10px] font-semibold text-slate-650 mt-1">GSTIN: {business.gstin}</p>}
        </div>

        <div className="text-right">
          <div className="text-sm font-black text-slate-900 font-mono"># {invoiceNumber || "INV-000"}</div>
          <div className="mt-2 space-y-1 text-[10px] text-slate-500">
            <div>
              <span className="text-slate-400">Issue Date:</span> <span className="text-slate-800 font-mono font-medium">{formatDate(issueDate)}</span>
            </div>
            <div>
              <span className="text-slate-400">Due Date:</span> <span className="text-slate-800 font-mono font-medium">{formatDate(dueDate)}</span>
            </div>
          </div>
        </div>
      </div>

      <hr className="border-slate-100" />

      {/* Bill To */}
      <div>
        <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block mb-1">BILL TO:</span>
        <h3 className="text-xs font-bold text-slate-950">{selectedClient?.name || "Client Contact Name"}</h3>
        {selectedClient?.company_name && <p className="text-[10px] text-slate-600 mt-0.5">{selectedClient.company_name}</p>}
        <p className="text-[10px] text-slate-500 mt-0.5 max-w-xs leading-normal">{selectedClient?.address || "Client billing address placeholder"}</p>
        {selectedClient?.gstin && <p className="text-[9px] font-semibold text-slate-600 mt-1">GSTIN: {selectedClient.gstin}</p>}
      </div>

      {/* Items Table */}
      <div className="border border-slate-150 rounded overflow-hidden">
        <table className="w-full text-left border-collapse text-[10px]">
          <thead>
            <tr className="bg-slate-50 text-[9px] font-bold text-slate-600 border-b border-slate-150">
              <th className="px-3 py-2 w-8">#</th>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2 text-center w-12">Qty</th>
              <th className="px-3 py-2 text-right w-16">Rate</th>
              <th className="px-3 py-2 text-right w-14">GST %</th>
              <th className="px-3 py-2 text-right w-20">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {items.map((it, idx) => {
              const qty = Number(it.quantity) || 0
              const rate = Number(it.rate) || 0
              const taxRate = Number(it.tax_rate) || 0
              const amount = qty * rate
              
              if (!it.description && qty === 1 && rate === 0) return null

              return (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="px-3 py-2 font-mono text-slate-400">{idx + 1}</td>
                  <td className="px-3 py-2 font-medium text-slate-900">{it.description || "(Empty Description)"}</td>
                  <td className="px-3 py-2 text-center font-mono">{qty}</td>
                  <td className="px-3 py-2 text-right font-mono">{formatCurrency(rate)}</td>
                  <td className="px-3 py-2 text-right font-mono text-slate-500">{taxRate}%</td>
                  <td className="px-3 py-2 text-right font-mono font-medium text-slate-900">{formatCurrency(amount)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Summary calculations */}
      <div className="flex justify-end pt-2">
        <div className="w-48 space-y-2 text-[10px]">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal:</span>
            <span className="font-mono">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>GST Amount:</span>
            <span className="font-mono">{formatCurrency(taxAmount)}</span>
          </div>
          {Number(discount) > 0 && (
            <div className="flex justify-between text-rose-600 font-medium">
              <span>Discount:</span>
              <span className="font-mono">-{formatCurrency(Number(discount))}</span>
            </div>
          )}
          <div className="flex justify-between items-center text-sm font-black text-slate-900 border-t border-slate-200 pt-2 bg-indigo-50/50 p-2 rounded">
            <span>TOTAL:</span>
            <span className="font-mono text-indigo-700">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      {/* Payment details */}
      <div className="border-t border-slate-100 pt-4 space-y-2.5">
        <div className="grid grid-cols-2 gap-4 text-[9px]">
          <div>
            <span className="text-[8px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">PAYMENT DETAILS</span>
            {business?.upi_id && <div><span className="text-slate-400">UPI ID:</span> <span className="font-semibold text-slate-800">{business.upi_id}</span></div>}
            {business?.bank_name && (
              <div className="mt-0.5">
                <span className="text-slate-400">Bank:</span> <span className="text-slate-700">{business.bank_name}</span> | <span className="text-slate-400">A/C:</span> <span className="font-mono text-slate-700">{business.account_number}</span> | <span className="text-slate-400">IFSC:</span> <span className="font-mono text-slate-750">{business.ifsc_code}</span>
              </div>
            )}
          </div>
          <div>
            <span className="text-[8px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">NOTES</span>
            <p className="text-slate-500 italic leading-snug">"{notes}"</p>
          </div>
        </div>

        <div className="text-[8px] text-slate-400 border-t border-slate-100 pt-3 flex justify-between items-center">
          <p className="max-w-[80%] leading-relaxed"><strong>Terms:</strong> {terms}</p>
          <p className="text-right text-indigo-500 font-bold uppercase tracking-wider">Powered by CollectBot</p>
        </div>
      </div>
    </div>
  )
}
