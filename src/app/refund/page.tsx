import * as React from "react"
import Link from "next/link"

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans p-6 sm:p-12 selection:bg-indigo-600 selection:text-white">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link href="/" className="text-xs font-bold text-indigo-400 hover:text-white transition-colors">
          ← Back to Homepage
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight border-b border-slate-900 pb-3">Refund & Cancellation Policy</h1>
        <p className="text-slate-400 text-xs leading-relaxed">Last Updated: July 9, 2026</p>

        <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
          <p>
            Thank you for choosing CollectBot. Please read this policy carefully regarding cancellations and refund terms.
          </p>

          <h3 className="text-sm font-bold text-white pt-2">1. Subscription Cancellation</h3>
          <p>
            You can cancel your subscription at any time inside the settings billing tab. Upon cancellation, your plan access continues until the end of your current billing period. No further renewals are charged.
          </p>

          <h3 className="text-sm font-bold text-white pt-2">2. Refund Terms</h3>
          <p>
            Because we offer a fully featured Free tier to evaluate the platform, subscription fees paid for Solo, Business, or Scale plans are generally non-refundable once processed.
          </p>

          <h3 className="text-sm font-bold text-white pt-2">3. Exceptions</h3>
          <p>
            In the event of accidental double-billing or billing system failures on our part, please report details to: <strong>support@collectbot.in</strong>. Valid discrepancies will be refunded within 5-7 business days to your original payment method.
          </p>
        </div>
      </div>
    </div>
  )
}
