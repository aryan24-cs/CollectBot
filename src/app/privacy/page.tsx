import * as React from "react"
import Link from "next/link"

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans p-6 sm:p-12 selection:bg-indigo-600 selection:text-white">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link href="/" className="text-xs font-bold text-indigo-400 hover:text-white transition-colors">
          ← Back to Homepage
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight border-b border-slate-900 pb-3">Privacy Policy</h1>
        <p className="text-slate-400 text-xs leading-relaxed">Last Updated: July 9, 2026</p>

        <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
          <p>
            CollectBot ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how your personal information is collected, used, and disclosed by CollectBot.
          </p>

          <h3 className="text-sm font-bold text-white pt-2">1. Information We Collect</h3>
          <p>
            We collect information when you register an account, complete onboarding, input client details, or generate invoices. This includes names, emails, phone numbers, addresses, GSTIN/PAN info, and metadata about your transactions.
          </p>

          <h3 className="text-sm font-bold text-white pt-2">2. How We Use Information</h3>
          <p>
            We use the collected information to provision accounts, process invoice details, configure automatic payment triggers, deliver Resend email updates, and manage integrations.
          </p>

          <h3 className="text-sm font-bold text-white pt-2">3. Data Sharing & Security</h3>
          <p>
            We do not sell your personal or financial data. We share details only with trusted service partners (such as Supabase for database hosting, Razorpay for payment checkouts, and Resend for email dispatches).
          </p>

          <h3 className="text-sm font-bold text-white pt-2">4. Contact Us</h3>
          <p>
            If you have questions about this policy, please reach out to us at: <strong>support@collectbot.in</strong>
          </p>
        </div>
      </div>
    </div>
  )
}
