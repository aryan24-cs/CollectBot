"use client"

import * as React from "react"
import Link from "next/link"
import { 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Zap, 
  MessageSquare, 
  Mail, 
  Building2,
  AlertTriangle
} from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-indigo-600 selection:text-white select-none overflow-x-hidden">
      {/* Navigation Header */}
      <header className="max-w-6xl mx-auto px-4 py-5 flex items-center justify-between border-b border-slate-900">
        <Link href="/" className="text-lg font-black tracking-tight text-white flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-indigo-650/15">C</span>
          CollectBot
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/pricing" className="text-xs font-bold text-slate-400 hover:text-white transition-colors">Pricing</Link>
          <Link href="/login" className="text-xs font-bold text-slate-400 hover:text-white transition-colors">Sign In</Link>
          <Link href="/register" className="bg-indigo-650 hover:bg-indigo-600 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition-all shadow-lg shadow-indigo-650/10">
            Get Started Free
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-4 pt-20 pb-16 text-center space-y-6">
        <div className="inline-flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold px-3.5 py-1 rounded-full uppercase tracking-wider">
          <Zap className="w-3.5 h-3.5" /> Stop Chasing Invoice Payments
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-3xl mx-auto leading-tight">
          Collect Outstanding Payments Automatically.
        </h1>
        <p className="text-slate-400 text-sm sm:text-base max-w-lg mx-auto">
          Send formatted invoices, route automated email follow-up nudges, and collect instant UPI or card payments — all in one dashboard.
        </p>

        <div className="flex items-center justify-center gap-4 pt-4">
          <Link href="/register" className="flex items-center gap-1.5 bg-indigo-650 hover:bg-indigo-600 text-white font-bold text-xs px-5 py-2.5 rounded-lg transition-all shadow-xl shadow-indigo-650/15">
            Start Collecting Free
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link href="/pricing" className="text-xs font-bold text-slate-400 hover:text-white transition-colors">
            See Pricing Plans →
          </Link>
        </div>

        {/* Dashboard Mockup Visual */}
        <div className="pt-10 max-w-4xl mx-auto">
          <div className="border border-slate-800 bg-slate-900/40 rounded-2xl p-3 shadow-2xl relative">
            <div className="bg-slate-950 rounded-xl overflow-hidden aspect-video border border-slate-900/60 p-4 space-y-4 text-left">
              {/* Fake dashboard header */}
              <div className="flex justify-between items-center border-b border-slate-900 pb-3">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">CollectBot Dashboard</span>
                  <span className="text-xs font-bold text-white">Collections Overview</span>
                </div>
                <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded">
                  System Live
                </span>
              </div>
              {/* Fake metrics row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-900/40 border border-slate-850 p-3 rounded-lg">
                  <span className="text-[9px] text-slate-500 font-semibold block uppercase">Total Invoiced</span>
                  <span className="text-sm font-extrabold block text-white font-mono mt-0.5">₹1,50,000</span>
                </div>
                <div className="bg-slate-900/40 border border-slate-850 p-3 rounded-lg">
                  <span className="text-[9px] text-slate-500 font-semibold block uppercase">Collected</span>
                  <span className="text-sm font-extrabold block text-emerald-400 font-mono mt-0.5">₹1,20,000</span>
                </div>
                <div className="bg-slate-900/40 border border-slate-850 p-3 rounded-lg">
                  <span className="text-[9px] text-slate-500 font-semibold block uppercase">Outstanding</span>
                  <span className="text-sm font-extrabold block text-rose-455 font-mono mt-0.5">₹30,000</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="max-w-5xl mx-auto px-4 py-20 border-t border-slate-900">
        <div className="text-center space-y-2 mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold">Does this sound familiar?</h2>
          <p className="text-slate-400 text-xs">Late payments drain business resources and cashflow.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border border-slate-850 bg-slate-900/20 p-5 rounded-2xl space-y-3">
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-455 rounded-lg w-fit">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold block text-white">Manual, Forgotten Follow-ups</span>
            <p className="text-[10px] text-slate-500 leading-normal">
              You design invoices in Excel or Canva, send them, and forget to nudge clients. Late payments pile up without you realizing.
            </p>
          </div>

          <div className="border border-slate-850 bg-slate-900/20 p-5 rounded-2xl space-y-3">
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-455 rounded-lg w-fit">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold block text-white">Awkward Payment Reminders</span>
            <p className="text-[10px] text-slate-500 leading-normal">
              Directly calling clients for money feels uncomfortable. You delay asking, and they continue to delay paying.
            </p>
          </div>

          <div className="border border-slate-850 bg-slate-900/20 p-5 rounded-2xl space-y-3">
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-455 rounded-lg w-fit">
              <Building2 className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold block text-white">Scattered Cash Flow Data</span>
            <p className="text-[10px] text-slate-500 leading-normal">
              No central record of who has paid, who is pending, and what payments are overdue. You are left guessing your cashflow.
            </p>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="max-w-5xl mx-auto px-4 py-20 border-t border-slate-900">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-5">
            <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider block">The CollectBot Solution</span>
            <h2 className="text-3xl font-extrabold leading-tight">We handle the awkward part for you.</h2>
            <p className="text-slate-400 text-xs leading-relaxed">
              CollectBot is built specifically to automate follow-up workflows so you never have to ask for payment manually again.
            </p>
            <ul className="space-y-3 text-xs pt-2">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <span><strong>Create invoice in 60 seconds:</strong> Clean form generates professional layouts.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <span><strong>High-deliverability Emails:</strong> Invoices are sent directly via Resend with PDF attachments.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <span><strong>Milestone Escalation:</strong> Reminders increase in urgency as due date approaches and passes.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <span><strong>Automatic Reconciliation:</strong> Integrates payment gateways, marking invoices paid instantly.</span>
              </li>
            </ul>
          </div>

          <div className="bg-slate-900/30 border border-slate-850 rounded-2xl p-5 space-y-4">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">How it works</span>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold font-mono text-xs shrink-0">1</div>
                <div>
                  <span className="text-xs font-bold block">Generate & Issue</span>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Create invoice and send payment checkouts via email.</span>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold font-mono text-xs shrink-0">2</div>
                <div>
                  <span className="text-xs font-bold block">Automate Follow-ups</span>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Reminder engine dispatches scheduled email nudges.</span>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold font-mono text-xs shrink-0">3</div>
                <div>
                  <span className="text-xs font-bold block">Get Paid Online</span>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Client completes payment. Ledger reconciles instantly.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Public Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 text-center py-12 text-slate-500 text-[10px] space-y-2">
        <p>CollectBot © 2026. Made in India 🇮🇳 for Indian business entities.</p>
        <div className="flex justify-center gap-4">
          <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          <Link href="/refund" className="hover:text-white transition-colors">Refund Policy</Link>
        </div>
      </footer>
    </div>
  )
}
