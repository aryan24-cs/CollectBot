import * as React from "react"
import Link from "next/link"

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-slate-955 bg-slate-950 text-white font-sans p-6 sm:p-12 selection:bg-indigo-600 selection:text-white">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link href="/" className="text-xs font-bold text-indigo-400 hover:text-white transition-colors">
          ← Back to Homepage
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight border-b border-slate-900 pb-3">Terms of Service</h1>
        <p className="text-slate-400 text-xs leading-relaxed">Last Updated: July 9, 2026</p>

        <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
          <p>
            By registering for an account or using CollectBot ("Service"), you agree to be bound by the following terms and conditions.
          </p>

          <h3 className="text-sm font-bold text-white pt-2">1. Account Terms</h3>
          <p>
            You must be a human, provide a valid email address, and represent a legal business entity under Indian regulations. You are solely responsible for keeping your login credentials secure.
          </p>

          <h3 className="text-sm font-bold text-white pt-2">2. Fees & Payments</h3>
          <p>
            Pricing details are listed on the pricing comparisons boards. Premium subscriptions are charged monthly or yearly. All transactions are billed in Indian Rupees (INR) using Razorpay subscriptions.
          </p>

          <h3 className="text-sm font-bold text-white pt-2">3. Invoicing Regulations</h3>
          <p>
            You agree to design and issue invoices only for legitimate services rendered. You are responsible for configuring appropriate GSTIN details, verifying taxes, and managing customer communications.
          </p>

          <h3 className="text-sm font-bold text-white pt-2">4. Disclaimers</h3>
          <p>
            The Service is provided "as is". We are not responsible for client payment delays, gateway failures, or email/SMS latency times.
          </p>
        </div>
      </div>
    </div>
  )
}
