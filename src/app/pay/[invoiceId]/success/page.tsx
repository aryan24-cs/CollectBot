"use client"

import * as React from "react"
import { useSearchParams, useParams } from "next/navigation"
import { CheckCircle2, XCircle, Loader2, Download, ExternalLink, Calendar, Receipt, FileText } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatDate } from "@/lib/utils"

export default function PaymentSuccessPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const invoiceId = params.invoiceId as string

  const razorpay_payment_id = searchParams.get("razorpay_payment_id")
  const razorpay_payment_link_id = searchParams.get("razorpay_payment_link_id")
  const razorpay_payment_link_reference_id = searchParams.get("razorpay_payment_link_reference_id")
  const razorpay_payment_link_status = searchParams.get("razorpay_payment_link_status")
  const razorpay_signature = searchParams.get("razorpay_signature")

  const [status, setStatus] = React.useState<"loading" | "success" | "failed">("loading")
  const [invoice, setInvoice] = React.useState<any>(null)
  const [paymentDetails, setPaymentDetails] = React.useState<any>(null)
  const [errorMsg, setErrorMsg] = React.useState("")

  React.useEffect(() => {
    async function verify() {
      try {
        // Fetch invoice details first (public fetch)
        const invoiceRes = await fetch(`/api/invoices/${invoiceId}`)
        if (!invoiceRes.ok) {
          throw new Error("Failed to retrieve invoice details.")
        }
        const invData = await invoiceRes.json()
        setInvoice(invData)

        // If the invoice is already paid, we can skip verification
        if (invData.status === "paid") {
          setStatus("success")
          setPaymentDetails({
            status: "captured",
            amount: invData.total,
            method: "online",
            id: razorpay_payment_id || invData.payment_link_id || "Reconciled Online",
          })
          return
        }

        // Verify the payment signature and status with backend
        const verifyRes = await fetch("/api/payments/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            razorpay_payment_id,
            razorpay_payment_link_id,
            razorpay_payment_link_reference_id,
            razorpay_payment_link_status,
            razorpay_signature,
            invoice_id: invoiceId,
          }),
        })

        const verifyData = await verifyRes.json()
        if (verifyRes.ok && verifyData.verified) {
          setStatus("success")
          setPaymentDetails({
            status: verifyData.details.status,
            amount: verifyData.details.amount,
            method: verifyData.details.method,
            id: razorpay_payment_id,
          })
        } else {
          setStatus("failed")
          setErrorMsg(verifyData.error || "The payment transaction could not be verified.")
        }
      } catch (err: any) {
        setStatus("failed")
        setErrorMsg(err.message || "An error occurred during verification.")
      }
    }

    if (invoiceId) {
      verify()
    }
  }, [
    invoiceId,
    razorpay_payment_id,
    razorpay_payment_link_id,
    razorpay_payment_link_reference_id,
    razorpay_payment_link_status,
    razorpay_signature,
  ])

  // 1. LOADING SCREEN
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center py-12 px-4">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
        <p className="text-slate-400 text-sm">Verifying transaction details with Razorpay...</p>
      </div>
    )
  }

  // 2. FAILED SCREEN
  if (status === "failed") {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center py-12 px-4">
        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl text-slate-100 shadow-2xl max-w-md w-full">
          <CardHeader className="text-center">
            <XCircle className="w-12 h-12 text-rose-500 mx-auto mb-2" />
            <CardTitle className="text-xl font-bold text-white">Verification Failed</CardTitle>
            <CardDescription className="text-slate-400">
              We couldn't confirm your payment status.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-sm text-slate-350 space-y-4">
            <p>{errorMsg}</p>
            <p className="text-xs text-slate-500">
              If your account was debited, the payment will auto-reconcile shortly.
            </p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button
              className="bg-slate-800 hover:bg-slate-700 text-white w-full"
              onClick={() => window.location.href = `/pay/${invoiceId}`}
            >
              Back to Payment Page
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // 3. SUCCESS SCREEN
  const business = invoice?.business || {}
  const client = invoice?.client || {}

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center py-12 px-4 relative">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-emerald-500/5 rounded-full filter blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl text-slate-100 shadow-2xl overflow-hidden">
          {/* Header Banner */}
          <div className="h-1.5 bg-gradient-to-r from-emerald-400 to-teal-500" />
          
          <CardHeader className="text-center pb-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
            <CardTitle className="text-2xl font-black text-white">Payment Successful!</CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              Thank you, {client.name || "Customer"}!
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="text-center py-1">
              <span className="text-3xl font-extrabold text-emerald-400 font-mono">
                {formatCurrency(paymentDetails.amount)}
              </span>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">
                Paid in Full to {business.name || "Business"}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-850 space-y-2.5 text-xs text-slate-350">
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice</span>
                <span className="text-white font-semibold font-mono">{invoice.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment ID</span>
                <span className="text-white font-mono text-[11px]">{paymentDetails.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Method</span>
                <span className="text-white uppercase font-semibold">{paymentDetails.method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cleared Date</span>
                <span className="text-white font-semibold">
                  {formatDate(invoice.paid_at || new Date().toISOString())}
                </span>
              </div>
            </div>

            <div className="p-3 text-[10px] text-slate-400 bg-slate-800/20 border border-slate-850 rounded-lg text-center">
              A receipt has been issued to your email and WhatsApp contact.
            </div>

            {invoice.pdf_url && (
              <a
                href={invoice.pdf_url}
                target="_blank"
                rel="noreferrer"
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer text-sm no-underline shadow-lg shadow-emerald-500/10"
              >
                <Download className="w-4 h-4" />
                Download Receipt PDF
              </a>
            )}
          </CardContent>
          
          <CardFooter className="justify-center border-t border-slate-850/60 pt-4 pb-4">
            <span className="text-[10px] text-slate-550 flex items-center gap-1 font-medium">
              🔒 Powered by CollectBot Secured Transaction Shield
            </span>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
