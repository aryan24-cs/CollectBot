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

          <h3 className="text-sm font-bold text-white pt-2">1. Usage Policy</h3>
          <p>
            CollectBot is currently available for usage with no restrictions. No subscription fees are processed at this stage.
          </p>

          <h3 className="text-sm font-bold text-white pt-2">2. Future Billing Updates</h3>
          <p>
            Should premium tiers or standard subscription services be introduced, cancellation methods and refund options will be updated here.
          </p>

          <h3 className="text-sm font-bold text-white pt-2">3. Exceptions & Support</h3>
          <p>
            For any queries or assistance, please reach out to us at: <strong>support@collectbot.in</strong>.
          </p>
        </div>
      </div>
    </div>
  )
}
