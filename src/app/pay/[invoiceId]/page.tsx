import * as React from "react"
import { 
  IndianRupee, 
  ShieldCheck, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Calendar,
  Phone,
  Mail,
  Download
} from "lucide-react"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"
import { formatCurrency, formatDate, getDaysOverdue, cn } from "@/lib/utils"

export default async function PublicPaymentPage({ 
  params 
}: { 
  params: Promise<{ invoiceId: string }> 
}) {
  const { invoiceId } = await params
  const supabase = getSupabaseServiceRoleClient()

  // Fetch invoice details using service role client to bypass RLS for public access
  const { data: invoice, error: fetchError } = await supabase
    .from("invoices")
    .select(`
      *,
      client:clients(*),
      items:invoice_items(*),
      business:businesses(*)
    `)
    .eq("id", invoiceId)
    .maybeSingle()

  if (fetchError || !invoice) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center py-12 px-4">
        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl text-slate-100 shadow-2xl max-w-md w-full">
          <CardHeader className="text-center">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-2" />
            <CardTitle className="text-xl font-bold text-white">Invoice Not Found</CardTitle>
            <CardDescription className="text-slate-400">
              The payment request URL appears to be invalid or has expired.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const { business, client, items } = invoice

  // Track viewed state: if client opens the invoice, mark viewed_at and set status
  const nowStr = new Date().toISOString()
  let needsUpdate = false
  const updatePayload: Record<string, any> = {}

  if (!invoice.viewed_at) {
    updatePayload.viewed_at = nowStr
    needsUpdate = true
  }

  if (invoice.status === "sent") {
    updatePayload.status = "viewed"
    needsUpdate = true
  }

  if (needsUpdate) {
    await supabase
      .from("invoices")
      .update(updatePayload)
      .eq("id", invoiceId)
    
    // Update local state copy to avoid stale state in checks below
    if (updatePayload.viewed_at) invoice.viewed_at = updatePayload.viewed_at
    if (updatePayload.status) invoice.status = updatePayload.status

    // Log the viewed event in activity_logs
    await supabase.from("activity_logs").insert({
      business_id: business.id,
      type: "invoice_viewed",
      description: `Invoice "${invoice.invoice_number}" was opened and viewed by client.`,
      metadata: { invoice_id: invoiceId },
    })
  }

  // Render helper for contact options
  const renderContactInfo = () => (
    <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-slate-400 space-y-2 w-full text-center">
      <span className="font-semibold block text-slate-350">Questions? Contact the business:</span>
      <div className="flex justify-center gap-4">
        {business.phone && (
          <span className="flex items-center gap-1.5 justify-center">
            <Phone className="w-3.5 h-3.5 text-indigo-400" />
            {business.phone}
          </span>
        )}
        {business.email && (
          <span className="flex items-center gap-1.5 justify-center">
            <Mail className="w-3.5 h-3.5 text-indigo-400" />
            {business.email}
          </span>
        )}
      </div>
    </div>
  )

  // Status Handlers:
  // 1. CANCELLED SCREEN
  if (invoice.status === "cancelled") {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center py-12 px-4">
        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl text-slate-100 shadow-2xl max-w-md w-full">
          <CardHeader className="text-center">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-2" />
            <CardTitle className="text-xl font-bold text-white">Invoice Cancelled</CardTitle>
            <CardDescription className="text-slate-400">
              This invoice request has been cancelled by the business owner.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-sm text-slate-300">
            Payment is no longer required. Please contact the business if you believe this is an error.
          </CardContent>
          <CardFooter className="flex flex-col">
            {renderContactInfo()}
          </CardFooter>
        </Card>
      </div>
    )
  }

  // 2. PAID SCREEN
  if (invoice.status === "paid") {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center py-12 px-4">
        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl text-slate-100 shadow-2xl max-w-md w-full">
          <CardHeader className="text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
            <CardTitle className="text-xl font-bold text-white">Already Paid</CardTitle>
            <CardDescription className="text-slate-400">
              Thank you! This invoice has been fully paid.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Invoice Number</span>
                <span className="text-white font-semibold font-mono">{invoice.invoice_number}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Total Paid</span>
                <span className="text-emerald-400 font-bold font-mono">{formatCurrency(invoice.total)}</span>
              </div>
              {invoice.paid_at && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Payment Date</span>
                  <span className="text-slate-200 font-semibold">{formatDate(invoice.paid_at)}</span>
                </div>
              )}
            </div>
            {invoice.pdf_url && (
              <a
                href={invoice.pdf_url}
                target="_blank"
                rel="noreferrer"
                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-750 text-sm no-underline"
              >
                <Download className="w-4 h-4" />
                Download Payment Receipt
              </a>
            )}
          </CardContent>
          <CardFooter className="flex flex-col">
            {renderContactInfo()}
          </CardFooter>
        </Card>
      </div>
    )
  }

  // 3. PAYMENT LINK NOT READY
  if (!invoice.payment_link) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center py-12 px-4">
        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl text-slate-100 shadow-2xl max-w-md w-full">
          <CardHeader className="text-center">
            <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-2" />
            <CardTitle className="text-xl font-bold text-white">Payment Link Not Ready</CardTitle>
            <CardDescription className="text-slate-400">
              The online payment portal is not activated for this invoice yet.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-sm text-slate-350">
            Please ask the business to register/send the invoice payment link.
          </CardContent>
          <CardFooter className="flex flex-col">
            {renderContactInfo()}
          </CardFooter>
        </Card>
      </div>
    )
  }

  // 4. ACTIVE UNPAID SCREEN
  const daysOverdue = getDaysOverdue(invoice.due_date)
  const isOverdue = daysOverdue > 0

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 relative">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-indigo-500/10 rounded-full filter blur-[100px] pointer-events-none" />

      <div className="w-full max-w-lg space-y-6 relative z-10">
        {/* Top Header Logo/Business Branding */}
        <div className="flex flex-col items-center text-center space-y-2 mb-2">
          {business.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img 
              src={business.logo_url} 
              alt={business.name} 
              className="w-16 h-16 object-contain rounded-lg bg-slate-900 border border-slate-800 p-2 shadow-lg"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-xl">{business.name[0]}</span>
            </div>
          )}
          <h2 className="text-lg font-extrabold text-white">{business.name}</h2>
        </div>

        {/* Main Invoice Payment Card */}
        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl text-slate-100 shadow-2xl">
          <CardHeader className="pb-3">
            <CardDescription className="text-xs text-indigo-400 font-semibold tracking-wider uppercase text-center">
              Payment Request
            </CardDescription>
            <CardTitle className="text-xl font-bold tracking-tight text-white text-center">
              Invoice Due from {client.name}
            </CardTitle>
            <div className="flex justify-center items-center gap-2 mt-1">
              <span className="text-slate-400 text-xs font-mono">#{invoice.invoice_number}</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400 text-xs">Due: {formatDate(invoice.due_date)}</span>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-5">
            {/* Invoice items breakdown */}
            <div className="rounded-lg bg-slate-950 border border-slate-850 p-4 space-y-3.5">
              <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block border-b border-slate-900 pb-1.5">
                Invoice breakdown
              </span>
              
              <div className="max-h-44 overflow-y-auto space-y-2.5 pr-1 divide-y divide-slate-900/60">
                {items && items.map((it: any, index: number) => (
                  <div key={it.id || index} className={cn("flex justify-between items-start text-xs", index > 0 && "pt-2.5")}>
                    <div className="max-w-[70%]">
                      <p className="text-slate-200 font-medium leading-tight">{it.description}</p>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {Number(it.quantity)} qty × {formatCurrency(Number(it.rate))}
                      </span>
                    </div>
                    <span className="font-mono text-slate-250 font-medium">{formatCurrency(Number(it.amount))}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-900 pt-3 space-y-2 text-xs">
                <div className="flex justify-between text-slate-450">
                  <span>Subtotal</span>
                  <span className="font-mono">{formatCurrency(Number(invoice.subtotal))}</span>
                </div>
                {Number(invoice.tax_amount) > 0 && (
                  <div className="flex justify-between text-slate-450">
                    <span>GST (Estimated)</span>
                    <span className="font-mono">{formatCurrency(Number(invoice.tax_amount))}</span>
                  </div>
                )}
                {Number(invoice.discount) > 0 && (
                  <div className="flex justify-between text-rose-400">
                    <span>Discount</span>
                    <span className="font-mono">-{formatCurrency(Number(invoice.discount))}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm font-black text-white pt-2.5 border-t border-slate-900">
                  <span>TOTAL DUE</span>
                  <span className="font-mono text-indigo-400 text-base">{formatCurrency(Number(invoice.total))}</span>
                </div>
              </div>
            </div>

            {/* Overdue alerts */}
            {isOverdue && (
              <div className="p-3 text-xs text-rose-455 bg-rose-950/20 border border-rose-900/40 rounded-lg flex gap-2.5 items-center justify-center font-semibold">
                <AlertCircle className="w-4.5 h-4.5 text-rose-400 flex-shrink-0 animate-pulse" />
                <span>Invoice is {daysOverdue} {daysOverdue === 1 ? "day" : "days"} overdue</span>
              </div>
            )}

            {/* Security Notice */}
            <div className="p-3 text-[10px] text-slate-400 bg-slate-800/20 border border-slate-850 rounded-lg flex gap-2.5 items-start">
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>
                Secured payment processing. You will be redirected to Razorpay's secure checkout page to complete payment using UPI, Cards, Netbanking, or Wallet.
              </span>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            {/* Pay Now Button */}
            <a
              href={invoice.payment_link}
              className="w-full bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white font-semibold shadow-lg shadow-indigo-500/20 py-3 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer border-0 text-sm no-underline"
            >
              <CreditCard className="w-4.5 h-4.5" />
              Pay {formatCurrency(Number(invoice.total))} Now
            </a>
            
            <span className="text-[10px] text-slate-500 text-center w-full flex items-center justify-center gap-1">
              🔒 Secured by Razorpay
            </span>

            {/* Business Contact details */}
            {renderContactInfo()}
          </CardFooter>
        </Card>
        
        <div className="text-center text-[10px] text-slate-600">
          Powered by <span className="text-slate-400 font-semibold">CollectBot</span>
        </div>
      </div>
    </div>
  )
}
