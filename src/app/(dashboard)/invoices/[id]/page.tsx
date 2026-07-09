"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { 
  ArrowLeft, 
  Trash2, 
  Send, 
  CheckCircle2, 
  Eye, 
  Download, 
  Loader2, 
  Calendar,
  AlertCircle,
  FileCheck,
  Ban,
  Clock,
  Play,
  Pause,
  MessageSquare,
  Sparkles
} from "lucide-react"
import { toast } from "sonner"

import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency, formatDate, formatDateShort, getInvoiceStatusColor, cn } from "@/lib/utils"
import { Invoice, Client, Business, InvoiceItem, Payment } from "@/types"

interface InvoiceDetailsData extends Invoice {
  client: Client
  items: InvoiceItem[]
  business: Business
  payments?: Payment[]
}

export default function InvoiceDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const invoiceId = params.id as string

  const [invoice, setInvoice] = React.useState<InvoiceDetailsData | null>(null)
  const [timeline, setTimeline] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isProcessing, setIsProcessing] = React.useState(false)

  // Manual payment form states
  const [isMarkPaidOpen, setIsMarkPaidOpen] = React.useState(false)
  const [manualAmount, setManualAmount] = React.useState("")
  const [manualDate, setManualDate] = React.useState(new Date().toISOString().split("T")[0])
  const [manualMethod, setManualMethod] = React.useState("cash")
  const [manualNotes, setManualNotes] = React.useState("")

  // Manual reminder form states
  const [isRemindOpen, setIsRemindOpen] = React.useState(false)
  const [remindChannel, setRemindChannel] = React.useState("both")

  React.useEffect(() => {
    if (invoice) {
      setManualAmount(String(invoice.balance_due ?? invoice.total))
    }
  }, [invoice])

  const fetchInvoiceDetails = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`)
      if (!res.ok) {
        throw new Error("Failed to load invoice details")
      }
      const json = await res.json()
      setInvoice(json)

      // Generate a dynamic timeline of events based on invoice columns
      const events = []
      
      if (json.created_at) {
        events.push({
          title: "Invoice Created",
          date: json.created_at,
          description: `Draft serial #${json.invoice_number} generated.`,
          icon: FileCheck,
          color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20"
        })
      }

      if (json.sent_at) {
        events.push({
          title: "Invoice Sent",
          date: json.sent_at,
          description: "Invoice dispatched to client and reminders scheduled.",
          icon: Send,
          color: "text-sky-400 bg-sky-500/10 border-sky-500/20"
        })
      }

      if (json.viewed_at) {
        events.push({
          title: "Invoice Viewed",
          date: json.viewed_at,
          description: "Client opened the payment link.",
          icon: Eye,
          color: "text-purple-400 bg-purple-500/10 border-purple-500/20"
        })
      }

      if (json.paid_at) {
        events.push({
          title: "Payment Received",
          date: json.paid_at,
          description: `Manually cleared: ${formatCurrency(json.total)} received.`,
          icon: CheckCircle2,
          color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
        })
      }

      if (json.status === "cancelled") {
        events.push({
          title: "Invoice Cancelled",
          date: json.updated_at,
          description: "This invoice was voided and reminders stopped.",
          icon: Ban,
          color: "text-rose-400 bg-rose-500/10 border-rose-500/20"
        })
      }

      setTimeline(events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()))

    } catch (err: any) {
      toast.error(err.message || "Could not fetch invoice.")
    } finally {
      setIsLoading(false)
    }
  }, [invoiceId])

  React.useEffect(() => {
    fetchInvoiceDetails()
  }, [fetchInvoiceDetails])

  // Mark invoice status transitions
  const updateStatus = async (status: string) => {
    setIsProcessing(true)
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update status")
      
      toast.success(`Invoice status updated to ${status}.`)
      fetchInvoiceDetails()
    } catch (err: any) {
      toast.error(err.message || "Action failed.")
    } finally {
      setIsProcessing(false)
    }
  }

  // Toggle Reminder Pause
  const toggleReminderPause = async () => {
    if (!invoice) return
    setIsProcessing(true)
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reminder_paused: !invoice.reminder_paused }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to toggle reminders")
      
      toast.success(data.reminder_paused ? "Auto-reminders paused." : "Auto-reminders active.")
      fetchInvoiceDetails()
    } catch (err: any) {
      toast.error(err.message || "Action failed.")
    } finally {
      setIsProcessing(false)
    }
  }

  // Cancel Invoice
  const handleCancelInvoice = async () => {
    setIsProcessing(true)
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/cancel`, {
        method: "POST",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to cancel invoice")

      toast.success("Invoice cancelled successfully.")
      fetchInvoiceDetails()
    } catch (err: any) {
      toast.error(err.message || "Could not cancel invoice.")
    } finally {
      setIsProcessing(false)
    }
  }

  // Delete Invoice Draft
  const handleDeleteInvoice = async () => {
    setIsProcessing(true)
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to delete invoice")

      toast.success("Invoice deleted successfully.")
      router.push("/invoices")
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Could not delete invoice.")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleMarkPaid = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/mark-paid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(manualAmount),
          payment_method: manualMethod,
          payment_date: manualDate,
          notes: manualNotes,
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to mark paid")

      toast.success("Invoice cleared and marked as paid!")
      setIsMarkPaidOpen(false)
      setManualNotes("")
      setManualDate(new Date().toISOString().split("T")[0])
      setManualMethod("cash")
      
      fetchInvoiceDetails()
    } catch (err: any) {
      toast.error(err.message || "Clearing failed.")
    } finally {
      setIsProcessing(false)
    }
  }

  // Send Manual reminder API call
  const handleManualReminderSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)
    const toastId = toast.loading("Sending reminder...")
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/remind`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: remindChannel }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to trigger reminder")

      toast.success(`Reminder successfully sent via ${data.sentVia.join(" and ")}!`)
      setIsRemindOpen(false)
      fetchInvoiceDetails()
    } catch (err: any) {
      toast.error(err.message || "Could not dispatch reminder.")
    } finally {
      toast.dismiss(toastId)
      setIsProcessing(false)
    }
  }

  // Trigger PDF Build API call (Module 3)
  const triggerPdfGeneration = async () => {
    toast.loading("Generating print document...")
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/pdf`, { method: "POST" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Could not render PDF")
      toast.dismiss()
      toast.success("PDF generated!")
      window.open(json.url, "_blank")
    } catch (err: any) {
      toast.dismiss()
      toast.error(err.message || "PDF compilation failed.")
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-white">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
        <p className="text-slate-400">Loading invoice details...</p>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="text-center py-20 bg-slate-900 border border-slate-800 rounded-xl max-w-lg mx-auto select-none">
        <AlertCircle className="w-12 h-12 text-rose-505 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Invoice Not Found</h2>
        <p className="text-slate-400 text-sm mb-6">This invoice record may have been removed or does not exist.</p>
        <Link href="/invoices" className={buttonVariants({ variant: "default" })}>
          Back to Invoices
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 select-none max-w-5xl mx-auto">
      {/* Top Header bar with status badge */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-5">
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
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-white">{invoice.invoice_number}</h1>
            <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase", getInvoiceStatusColor(invoice.status))}>
              {invoice.status}
            </span>
          </div>
          <p className="text-slate-400 text-xs mt-1">Issued for {invoice.client?.name || "Independent client"}</p>
        </div>

        {/* Dynamic action buttons based on status */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* DRAFT BUTTONS */}
          {invoice.status === "draft" && (
            <>
              <Link
                href={`/invoices/new?editId=${invoice.id}`}
                className={cn(buttonVariants({ variant: "outline" }), "border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white text-xs")}
              >
                Edit Draft
              </Link>
              <Button
                variant="default"
                className="bg-indigo-500 hover:bg-indigo-600 text-white text-xs gap-1.5"
                onClick={() => updateStatus("sent")}
                disabled={isProcessing}
              >
                <Send className="w-3.5 h-3.5" />
                Mark Sent
              </Button>
              <Button
                variant="outline"
                className="border-red-955/30 text-red-400 hover:text-white hover:bg-red-950/10 text-xs"
                onClick={handleDeleteInvoice}
                disabled={isProcessing}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </>
          )}

          {/* SENT/VIEWED/OVERDUE BUTTONS */}
          {["sent", "viewed", "overdue", "partial"].includes(invoice.status) && (
            <>
              <Button
                variant="outline"
                className="border-slate-800 text-slate-350 hover:bg-slate-800 hover:text-white text-xs gap-1.5"
                onClick={triggerPdfGeneration}
              >
                <Download className="w-3.5 h-3.5" />
                View PDF
              </Button>
              <Button
                variant="outline"
                className="border-indigo-500/20 text-indigo-400 hover:text-white hover:bg-indigo-950/20 text-xs gap-1.5"
                onClick={() => setIsRemindOpen(true)}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Send Reminder
              </Button>
              <Button
                variant="default"
                className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs gap-1.5"
                onClick={() => setIsMarkPaidOpen(true)}
                disabled={isProcessing}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Mark Paid
              </Button>
              <Button
                variant="outline"
                className="border-red-955/30 text-red-400 hover:text-white hover:bg-red-950/10 text-xs gap-1.5"
                onClick={handleCancelInvoice}
                disabled={isProcessing}
              >
                <Ban className="w-3.5 h-3.5" />
                Cancel
              </Button>
            </>
          )}

          {/* PAID BUTTONS */}
          {invoice.status === "paid" && (
            <>
              <Button
                variant="outline"
                className="border-slate-800 text-slate-300 hover:bg-slate-805 hover:text-white text-xs gap-1.5"
                onClick={triggerPdfGeneration}
              >
                <Download className="w-3.5 h-3.5" />
                Receipt PDF
              </Button>
              <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 select-none">
                <CheckCircle2 className="w-4 h-4" /> Paid & Reconciled
              </span>
            </>
          )}

          {/* CANCELLED BUTTONS */}
          {invoice.status === "cancelled" && (
            <Button
              variant="outline"
              className="border-red-955/30 text-red-400 hover:text-white hover:bg-red-950/10 text-xs gap-1.5"
              onClick={handleDeleteInvoice}
              disabled={isProcessing}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Invoice
            </Button>
          )}
        </div>
      </div>

      {/* Main split: Left side Live Preview card, Right side details panel & timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Invoice visualizer */}
        <div className="lg:col-span-7">
          <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl text-slate-100 shadow-2xl p-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Formatted Invoice Details</h3>
            <div className="bg-white text-slate-800 p-6 rounded-lg font-sans border border-slate-200 text-xs space-y-6">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-650">INVOICE</span>
                  <h2 className="text-base font-black text-slate-900 mt-1">{invoice.business?.name || "My Business"}</h2>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{invoice.business?.address}</p>
                  {invoice.business?.gstin && <p className="text-[10px] font-semibold text-slate-600 mt-1">GSTIN: {invoice.business.gstin}</p>}
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-slate-900 font-mono"># {invoice.invoice_number}</div>
                  <div className="mt-2 space-y-0.5 text-[10px] text-slate-500">
                    <div>Issue: {formatDate(invoice.issue_date)}</div>
                    <div>Due: {formatDate(invoice.due_date)}</div>
                  </div>
                </div>
              </div>

              <hr className="border-slate-100" />

              <div>
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block mb-1">BILL TO:</span>
                <h3 className="text-xs font-bold text-slate-950">{invoice.client?.name || "Client Name"}</h3>
                {invoice.client?.company_name && <p className="text-[10px] text-slate-600 mt-0.5">{invoice.client.company_name}</p>}
                <p className="text-[10px] text-slate-500 mt-0.5 leading-normal">{invoice.client?.address}</p>
              </div>

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
                    {invoice.items && invoice.items.map((it, idx) => (
                      <tr key={it.id || idx}>
                        <td className="px-3 py-2 font-mono text-slate-400">{idx + 1}</td>
                        <td className="px-3 py-2 font-medium text-slate-900">{it.description}</td>
                        <td className="px-3 py-2 text-center font-mono">{Number(it.quantity)}</td>
                        <td className="px-3 py-2 text-right font-mono">{formatCurrency(Number(it.rate))}</td>
                        <td className="px-3 py-2 text-right font-mono text-slate-500">{Number(it.tax_rate)}%</td>
                        <td className="px-3 py-2 text-right font-mono font-medium text-slate-900">{formatCurrency(Number(it.amount))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <div className="w-44 space-y-2 text-[10px]">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal:</span>
                    <span className="font-mono">{formatCurrency(Number(invoice.subtotal))}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>GST:</span>
                    <span className="font-mono">{formatCurrency(Number(invoice.tax_amount))}</span>
                  </div>
                  {Number(invoice.discount) > 0 && (
                    <div className="flex justify-between text-rose-650">
                      <span>Discount:</span>
                      <span className="font-mono">-{formatCurrency(Number(invoice.discount))}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-sm font-black text-slate-900 border-t border-slate-200 pt-2 p-2 bg-indigo-50/50 rounded">
                    <span>TOTAL:</span>
                    <span className="font-mono text-indigo-750">{formatCurrency(Number(invoice.total))}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 text-[9px] grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[8px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">PAYMENT DETAILS</span>
                  {invoice.business?.upi_id && <div>UPI: {invoice.business.upi_id}</div>}
                  {invoice.business?.bank_name && (
                    <div className="mt-0.5 text-slate-500">
                      Bank: {invoice.business.bank_name} A/C: {invoice.business.account_number}
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-[8px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">NOTES</span>
                  <p className="text-slate-500 italic">"{invoice.notes}"</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Payment History Ledger */}
          {invoice.payments && invoice.payments.length > 0 && (
            <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl text-slate-100 shadow-xl mt-6">
              <CardHeader className="pb-3 border-b border-slate-800/60">
                <CardTitle className="text-sm font-bold">Payment History Ledger</CardTitle>
                <CardDescription className="text-[10px] text-slate-500">Record of transactions applied to this invoice.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-950/40 text-[10px] text-slate-400 font-semibold border-b border-slate-850">
                        <th className="p-3">Date</th>
                        <th className="p-3">Method</th>
                        <th className="p-3">Reference/ID</th>
                        <th className="p-3 text-right">Amount</th>
                        <th className="p-3 text-center">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 text-slate-300">
                      {invoice.payments.map((pm) => (
                        <tr key={pm.id} className="hover:bg-slate-800/10">
                          <td className="p-3 font-mono text-[11px]">{formatDateShort(pm.paid_at || pm.created_at)}</td>
                          <td className="p-3 capitalize">{pm.payment_method}</td>
                          <td className="p-3 font-mono text-[10px] text-slate-450 truncate max-w-[120px]" title={pm.razorpay_id || pm.notes || "Manual"}>
                            {pm.razorpay_id || pm.notes || "Manual"}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-emerald-400">{formatCurrency(pm.amount)}</td>
                          <td className="p-3 text-center">
                            {invoice.pdf_url ? (
                              <a
                                href={invoice.pdf_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] text-indigo-400 hover:text-white animate-fade-in"
                              >
                                <Download className="w-3 h-3" /> PDF
                              </a>
                            ) : (
                              <span className="text-slate-600 text-[10px]">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Side: Timeline & Reminder controls */}
        <div className="lg:col-span-5 space-y-6">
          {/* Payment Link Card (Phase 3 Copy/Share Option) */}
          {["sent", "viewed", "overdue", "partial"].includes(invoice.status) && invoice.payment_link && (
            <Card className="border-indigo-500/30 bg-slate-900/60 backdrop-blur-xl text-slate-100 shadow-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-indigo-450">Payment Link</CardTitle>
                <CardDescription className="text-[10px] text-slate-400 font-medium">Copy this link to manually share with your client.</CardDescription>
              </CardHeader>
              <CardContent className="pt-2 text-xs space-y-3">
                <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
                  <input
                    type="text"
                    readOnly
                    value={invoice.payment_link}
                    className="bg-transparent text-slate-350 font-mono text-[10px] flex-1 select-all outline-none border-0"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[10px] text-indigo-400 hover:text-white px-2 py-0 border-0"
                    onClick={() => {
                      navigator.clipboard.writeText(invoice.payment_link!)
                      toast.success("Payment link copied!")
                    }}
                  >
                    Copy
                  </Button>
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-500">
                  <span>Created link ID:</span>
                  <span className="font-mono text-slate-400">{invoice.payment_link_id}</span>
                </div>
              </CardContent>
            </Card>
          )}
          {/* Reminder settings and triggers */}
          {invoice.status !== "draft" && invoice.status !== "paid" && invoice.status !== "cancelled" && (
            <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl text-slate-100 shadow-xl">
              <CardHeader className="pb-3 border-b border-slate-800/60">
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  <span>WhatsApp Reminders</span>
                  <span className={cn(
                    "text-[10px] uppercase font-bold px-2 py-0.5 rounded border",
                    invoice.reminder_paused 
                      ? "bg-slate-800 text-slate-400 border-slate-700" 
                      : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                  )}>
                    {invoice.reminder_paused ? "Paused" : "Active"}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 text-xs space-y-3.5">
                <p className="text-slate-400 leading-normal">
                  Automatic collection agents are scheduled to dispatch WhatsApp alerts to {invoice.client?.name} (Net {invoice.client?.payment_terms} days terms).
                </p>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="w-full border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white text-xs gap-1.5"
                    onClick={toggleReminderPause}
                    disabled={isProcessing}
                  >
                    {invoice.reminder_paused ? <Play className="w-3.5 h-3.5 text-indigo-400" /> : <Pause className="w-3.5 h-3.5 text-amber-400" />}
                    {invoice.reminder_paused ? "Resume Reminders" : "Pause Reminders"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Audit log timeline */}
          <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl text-slate-100 shadow-xl">
            <CardHeader className="pb-3 border-b border-slate-800/60">
              <CardTitle className="text-sm font-bold">Activity Audit Log</CardTitle>
              <CardDescription className="text-[10px] text-slate-500">History of tracking states.</CardDescription>
            </CardHeader>
            <CardContent className="pt-5 pb-5">
              {timeline.length === 0 ? (
                <p className="text-slate-500 text-xs italic text-center py-6">No tracking events recorded.</p>
              ) : (
                <div className="relative pl-6 border-l border-slate-800 space-y-6">
                  {timeline.map((evt, idx) => {
                    const Icon = evt.icon
                    return (
                      <div key={idx} className="relative">
                        {/* Dot indicator */}
                        <div className={cn("absolute -left-[35px] top-0 w-[18px] h-[18px] rounded-full border flex items-center justify-center", evt.color)}>
                          <Icon className="w-2.5 h-2.5" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-white">{evt.title}</span>
                            <span className="text-[10px] text-slate-500 font-medium font-mono">{formatDateShort(evt.date)}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-normal">{evt.description}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Manual Payment marking Dialog modal */}
      <Dialog open={isMarkPaidOpen} onOpenChange={setIsMarkPaidOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-base font-bold">Mark Invoice as Paid</DialogTitle>
            <DialogDescription className="text-slate-450 text-[11px] leading-relaxed">
              Clear this invoice manually if the client paid via offline channels (Cash, Bank Transfer, Cheque, UPI, etc.).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleMarkPaid} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="amount" className="text-xs text-slate-400">Amount Received (₹)</Label>
              <Input
                id="amount"
                type="number"
                required
                className="bg-slate-950 border-slate-800 text-white font-mono text-xs"
                value={manualAmount}
                onChange={(e) => setManualAmount(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="date" className="text-xs text-slate-400">Payment Date</Label>
                <Input
                  id="date"
                  type="date"
                  required
                  className="bg-slate-950 border-slate-800 text-white text-xs h-8"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="method" className="text-xs text-slate-400">Payment Method</Label>
                <Select value={manualMethod} onValueChange={(val) => setManualMethod(val || "cash")}>
                  <SelectTrigger id="method" className="w-full bg-slate-950 border-slate-800 text-white text-xs h-8">
                    <SelectValue placeholder="Select Method" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-950 border-slate-800 text-white">
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-xs text-slate-400">Transaction Notes (Cheque/Ref Num)</Label>
              <Textarea
                id="notes"
                placeholder="e.g. Transaction ID, Cheque number or clearing details"
                className="bg-slate-950 border-slate-800 text-white text-xs min-h-[60px]"
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800/60">
              <Button
                type="button"
                variant="outline"
                className="border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white text-xs"
                onClick={() => setIsMarkPaidOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold"
                disabled={isProcessing}
              >
                Mark as Paid
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Send Reminder Dialog */}
      <Dialog open={isRemindOpen} onOpenChange={setIsRemindOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white text-base">Send Payment Reminder</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Select notification channels to nudge the client for payment.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleManualReminderSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Choose Notification Channels</Label>
              <Select value={remindChannel} onValueChange={(val) => setRemindChannel(val || "both")}>
                <SelectTrigger className="w-full bg-slate-950 border-slate-800 text-white text-xs h-8">
                  <SelectValue placeholder="Select Channels" />
                </SelectTrigger>
                <SelectContent className="bg-slate-950 border-slate-800 text-white">
                  <SelectItem value="both">WhatsApp & Email</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp Only</SelectItem>
                  <SelectItem value="email">Email Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Template Previews based on invoice due state */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3 space-y-2">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Message Preview</span>
              {new Date() > new Date(invoice?.due_date || "") ? (
                <div className="space-y-2">
                  <div className="text-[11px] text-slate-350 leading-relaxed bg-slate-900/40 p-2 rounded border border-slate-800/30">
                    <span className="text-emerald-500 font-bold block text-[9px] mb-0.5">WhatsApp Template Preview</span>
                    "Hi {invoice?.client?.name}, your payment of {invoice ? formatCurrency(Number(invoice.total)) : ""} to {invoice?.business?.name} is overdue. Please pay immediately."
                  </div>
                  <div className="text-[11px] text-slate-350 leading-relaxed bg-slate-900/40 p-2 rounded border border-slate-800/30">
                    <span className="text-sky-500 font-bold block text-[9px] mb-0.5">Email Subject Preview</span>
                    "URGENT: Invoice {invoice?.invoice_number} requires immediate payment"
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-[11px] text-slate-350 leading-relaxed bg-slate-900/40 p-2 rounded border border-slate-800/30">
                    <span className="text-emerald-500 font-bold block text-[9px] mb-0.5">WhatsApp Template Preview</span>
                    "Hi {invoice?.client?.name}, friendly reminder that your payment of {invoice ? formatCurrency(Number(invoice.total)) : ""} to {invoice?.business?.name} is due on {invoice ? formatDate(invoice.due_date) : ""}."
                  </div>
                  <div className="text-[11px] text-slate-350 leading-relaxed bg-slate-900/40 p-2 rounded border border-slate-800/30">
                    <span className="text-sky-500 font-bold block text-[9px] mb-0.5">Email Subject Preview</span>
                    "Friendly reminder: Invoice {invoice?.invoice_number} due {invoice ? formatDate(invoice.due_date) : ""}"
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800/60">
              <Button
                type="button"
                variant="outline"
                className="border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white text-xs"
                onClick={() => setIsRemindOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
                disabled={isProcessing}
              >
                {isProcessing ? "Sending..." : "Send Reminder"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
