import * as React from "react"
import { 
  ShieldCheck, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Calendar,
  Phone,
  Mail,
  Download,
  Share2,
  Printer,
  MessageSquare,
  Sparkles,
  QrCode,
  Clock,
  Send,
  Building2,
  Check
} from "lucide-react"

import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"
import { formatCurrency, formatDate, getDaysOverdue, cn } from "@/lib/utils"

export default async function PublicPaymentPage({ 
  params 
}: { 
  params: Promise<{ invoiceId: string }> 
}) {
  const { invoiceId } = await params
  const supabase = getSupabaseServiceRoleClient()

  // Fetch invoice details using service role client
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
      <div className="min-h-screen bg-[#F5F1EE] text-[#1A1A1A] flex flex-col justify-center items-center py-12 px-4 selection:bg-[#E91E63] selection:text-white">
        <div className="bg-white border border-[#EEE9E4] rounded-2xl p-8 shadow-xl max-w-md w-full text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-[#0A0A0A]">Invoice Not Found</h2>
          <p className="text-xs text-[#6B6B6B]">The invoice URL appears to be invalid or has expired.</p>
        </div>
      </div>
    )
  }

  const { business, client, items } = invoice

  // Fetch custom branding if available
  const { data: branding } = await supabase
    .from("invoice_branding")
    .select("*")
    .eq("business_id", business.id)
    .maybeSingle()

  const primaryColor = branding?.primary_color || "#1A1A1A"
  const accentColor = branding?.accent_color || "#E91E63"
  const showBadge = branding?.show_collectbot_badge !== false

  // Track viewed event
  const nowStr = new Date().toISOString()
  if (!invoice.viewed_at || invoice.status === "sent") {
    await supabase
      .from("invoices")
      .update({ viewed_at: invoice.viewed_at || nowStr, status: invoice.status === "sent" ? "viewed" : invoice.status })
      .eq("id", invoiceId)

    await supabase.from("client_portal_events").insert({
      business_id: business.id,
      invoice_id: invoiceId,
      event_type: "viewed"
    })
  }

  const daysOverdue = getDaysOverdue(invoice.due_date)
  const isOverdue = daysOverdue > 0 && invoice.status !== "paid"
  const isPaid = invoice.status === "paid"

  return (
    <div className="min-h-screen bg-[#F5F1EE] text-[#1A1A1A] font-sans selection:bg-[#E91E63] selection:text-white py-10 px-4 sm:px-6">
      
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Top Header Branding */}
        <div className="bg-white border border-[#EEE9E4] rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 text-center sm:text-left">
            {business.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={business.logo_url} alt={business.name} className="w-12 h-12 rounded-xl object-contain border border-[#EEE9E4] p-1 bg-[#FAF8F5]" />
            ) : (
              <div style={{ backgroundColor: `${accentColor}15`, color: accentColor }} className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl border border-[#EEE9E4]">
                {business.name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-lg font-black text-[#0A0A0A]">{business.name}</h1>
              <p className="text-xs text-[#6B6B6B]">Client Billing & Invoice Portal</p>
            </div>
          </div>

          <div className="text-center sm:text-right">
            <span className={`text-[10px] font-extrabold uppercase px-3 py-1 rounded-full tracking-wider inline-block ${
              isPaid ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
              isOverdue ? "bg-rose-50 text-rose-700 border border-rose-200" :
              "bg-amber-50 text-amber-700 border border-amber-200"
            }`}>
              {isPaid ? "Paid in Full" : isOverdue ? `${daysOverdue} Days Overdue` : "Payment Due"}
            </span>
            <p className="text-xs font-mono font-bold text-[#0A0A0A] mt-1">#{invoice.invoice_number}</p>
          </div>
        </div>

        {/* Invoice Summary Banner */}
        <div className="bg-white border border-[#EEE9E4] rounded-2xl p-6 sm:p-8 shadow-card space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#EEE9E4] pb-6 gap-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-[#6B6B6B] tracking-wider block">Billed To</span>
              <h2 className="text-base font-extrabold text-[#0A0A0A] mt-0.5">{client?.name || "Valued Client"}</h2>
              <p className="text-xs text-[#6B6B6B]">{client?.email || ""}</p>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-[10px] uppercase font-bold text-[#6B6B6B] tracking-wider block">Total Outstanding Balance</span>
              <h2 style={{ color: isPaid ? "#2E7D32" : accentColor }} className="text-3xl font-black font-mono mt-0.5">
                {formatCurrency(Number(invoice.balance_due))}
              </h2>
              <p className="text-xs text-[#6B6B6B] mt-0.5">Due Date: {formatDate(invoice.due_date)}</p>
            </div>
          </div>

          {/* Invoice Items List */}
          <div className="space-y-3">
            <span className="text-[10px] uppercase font-extrabold text-[#6B6B6B] tracking-wider block">
              Itemized Breakdown
            </span>
            <div className="border border-[#EEE9E4] rounded-xl overflow-hidden text-xs divide-y divide-[#EEE9E4] bg-[#FAF8F5]">
              {items && items.map((it: any, idx: number) => (
                <div key={it.id || idx} className="p-3.5 flex items-center justify-between hover:bg-white transition-colors">
                  <div>
                    <p className="font-bold text-[#0A0A0A]">{it.description}</p>
                    <span className="text-[10px] text-[#6B6B6B]">
                      {Number(it.quantity)} qty × {formatCurrency(Number(it.rate))}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-[#0A0A0A]">{formatCurrency(Number(it.amount))}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Totals */}
          <div className="border-t border-[#EEE9E4] pt-4 space-y-2 text-xs">
            <div className="flex justify-between text-[#6B6B6B]">
              <span>Subtotal</span>
              <span className="font-mono font-semibold">{formatCurrency(Number(invoice.subtotal))}</span>
            </div>
            {Number(invoice.tax_amount) > 0 && (
              <div className="flex justify-between text-[#6B6B6B]">
                <span>GST Tax</span>
                <span className="font-mono font-semibold">{formatCurrency(Number(invoice.tax_amount))}</span>
              </div>
            )}
            {Number(invoice.discount) > 0 && (
              <div className="flex justify-between text-rose-600 font-semibold">
                <span>Discount Applied</span>
                <span className="font-mono">-{formatCurrency(Number(invoice.discount))}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-sm font-black text-[#0A0A0A] pt-3 border-t border-[#EEE9E4]">
              <span>TOTAL AMOUNT</span>
              <span style={{ color: accentColor }} className="font-mono text-xl">{formatCurrency(Number(invoice.total))}</span>
            </div>
          </div>

          {/* Interactive Checkout Area */}
          {!isPaid && (
            <div className="pt-2 space-y-4">
              <div className="bg-[#FAF8F5] border border-[#EEE9E4] p-5 rounded-2xl space-y-3 text-center">
                <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#0A0A0A]">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Instant Razorpay & UPI Payment Gateway</span>
                </div>
                
                <a
                  href={invoice.payment_link || "#"}
                  className="w-full py-3.5 px-6 rounded-full font-bold text-xs text-white shadow-md flex items-center justify-center gap-2 hover:scale-[1.02] transition-all cursor-pointer no-underline block"
                  style={{ backgroundColor: accentColor }}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Pay {formatCurrency(Number(invoice.balance_due))} Now via UPI / Cards</span>
                </a>

                <div className="flex items-center justify-center gap-6 text-[10px] font-semibold text-[#6B6B6B] pt-1">
                  <span className="flex items-center gap-1"><Check className="w-3 h-3 text-emerald-600" /> Google Pay / PhonePe / Paytm</span>
                  <span className="flex items-center gap-1"><Check className="w-3 h-3 text-emerald-600" /> Instant Receipt Generation</span>
                </div>
              </div>
            </div>
          )}

          {/* Timeline Audit Log */}
          <div className="border-t border-[#EEE9E4] pt-6 space-y-3">
            <span className="text-[10px] uppercase font-extrabold text-[#6B6B6B] tracking-wider block">
              Invoice Status Timeline
            </span>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-[#6B6B6B]">
                <span className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-blue-500" /> Invoice Issued</span>
                <span className="font-mono text-[10px]">{formatDate(invoice.issue_date)}</span>
              </div>
              {invoice.viewed_at && (
                <div className="flex items-center justify-between text-[#6B6B6B]">
                  <span className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-purple-500" /> Invoice Opened by Client</span>
                  <span className="font-mono text-[10px]">{formatDate(invoice.viewed_at)}</span>
                </div>
              )}
              {isPaid && (
                <div className="flex items-center justify-between font-bold text-emerald-700">
                  <span className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Payment Settled & Closed</span>
                  <span className="font-mono text-[10px]">{invoice.paid_at ? formatDate(invoice.paid_at) : "Completed"}</span>
                </div>
              )}
            </div>
          </div>

          {/* Contact Business Info */}
          <div className="border-t border-[#EEE9E4] pt-4 text-xs text-[#6B6B6B] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              {business.phone && (
                <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-[#E91E63]" /> {business.phone}</span>
              )}
              {business.email && (
                <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-[#E91E63]" /> {business.email}</span>
              )}
            </div>
            
            {showBadge && (
              <span className="text-[10px] text-[#9B9B9B] font-medium">Powered by CollectBot OS</span>
            )}
          </div>

        </div>

      </div>
    </div>
  )
}
