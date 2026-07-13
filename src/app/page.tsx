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
  Building2,
  AlertTriangle,
  FileText
} from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F5F1EE] text-[#1A1A1A] font-sans selection:bg-[#E91E63] selection:text-white select-none overflow-x-hidden">
      
      {/* Navigation Header */}
      <header className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between border-b border-[#EEE9E4]">
        <Link href="/" className="text-lg font-black tracking-tight text-[#0A0A0A] flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#1A1A1A] flex items-center justify-center text-sm font-extrabold text-white shadow-soft">
            C
          </div>
          <span className="font-display font-bold">CollectBot</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/login" className="text-xs font-bold text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors">Sign In</Link>
          <Link 
            href="/signup" 
            className="bg-[#1A1A1A] hover:bg-[#0A0A0A] text-white text-xs font-bold px-4 py-2 rounded-pill transition-all shadow-soft"
          >
            Get Started Free
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-6 pt-24 pb-16 text-center space-y-6">
        <div className="inline-flex items-center gap-1.5 bg-[#FDF2F7] border border-[#F8BBD9]/30 text-[#E91E63] text-[10px] font-bold px-4 py-1.5 rounded-full uppercase tracking-wider">
          <Zap className="w-3.5 h-3.5" /> Stop Chasing Invoice Payments
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-[#0A0A0A] max-w-3xl mx-auto leading-tight font-display">
          Collect Outstanding Payments Automatically.
        </h1>
        <p className="text-[#6B6B6B] text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
          Send formatted invoices, schedule automated email follow-up nudges, and receive instant UPI or bank transfers directly — all inside one minimalist workspace.
        </p>

        <div className="flex items-center justify-center gap-4 pt-4">
          <Link 
            href="/signup" 
            className="flex items-center gap-1.5 bg-[#E91E63] hover:bg-[#D81B60] text-white font-bold text-xs px-6 py-3 rounded-pill transition-all shadow-soft"
          >
            Start Collecting Free
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link 
            href="/login" 
            className="text-xs font-bold text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors flex items-center gap-1"
          >
            Sign In to Dashboard →
          </Link>
        </div>

        {/* Premium Dashboard Mockup Visual */}
        <div className="pt-14 max-w-4xl mx-auto">
          <div className="border border-[#EEE9E4]/60 bg-white rounded-card-lg p-4 shadow-floating relative">
            <div className="bg-[#FAF8F5] rounded-card border border-[#EEE9E4]/40 overflow-hidden p-6 space-y-6 text-left">
              
              {/* Fake dashboard header */}
              <div className="flex justify-between items-center border-b border-[#EEE9E4]/50 pb-4">
                <div className="space-y-1">
                  <span className="text-[10px] text-[#9B9B9B] font-bold uppercase tracking-wider block">Workspace Overview</span>
                  <span className="text-lg font-bold text-[#0A0A0A] font-display">Collections</span>
                </div>
                <span className="text-[9px] bg-[#E8F5E9] border border-[#4CAF50]/10 text-[#2E7D32] font-extrabold px-3 py-1 rounded-pill uppercase tracking-wider">
                  Live Sync
                </span>
              </div>
              
              {/* Fake metrics row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-[#EEE9E4]/40 p-5 rounded-card shadow-soft">
                  <span className="text-[9px] text-[#9B9B9B] font-bold uppercase tracking-wider block">Total Billed</span>
                  <span className="text-xl font-bold block text-[#0A0A0A] mt-1">₹5,28,976.82</span>
                  <span className="text-[9px] text-[#4CAF50] font-bold mt-1 block">↑ 7.9% vs last month</span>
                </div>
                <div className="bg-[#1A1A1A] p-5 rounded-card shadow-soft text-white">
                  <span className="text-[9px] text-[#9B9B9B] font-bold uppercase tracking-wider block">Collected</span>
                  <span className="text-xl font-bold block text-white mt-1">₹4,23,000.00</span>
                  <span className="text-[9px] text-[#E91E63] font-bold mt-1 block">₹27,335 outstanding</span>
                </div>
                <div className="bg-white border border-[#EEE9E4]/40 p-5 rounded-card shadow-soft">
                  <span className="text-[9px] text-[#9B9B9B] font-bold uppercase tracking-wider block">VIP Clients</span>
                  <span className="text-xl font-bold block text-[#0A0A0A] mt-1">72 accounts</span>
                  <span className="text-[9px] text-[#9B9B9B] font-bold mt-1 block">Rahul Sharma, Eren Y.</span>
                </div>
              </div>

              {/* Fake list bars visual */}
              <div className="space-y-2 pt-2">
                <span className="text-[10px] text-[#9B9B9B] font-bold uppercase tracking-wider block">Top Client Ledger</span>
                <div className="flex items-center justify-between bg-white border border-[#EEE9E4]/30 px-4 py-2.5 rounded-pill shadow-soft text-xs">
                  <span className="font-bold text-[#1A1A1A]">Rahul Sharma</span>
                  <span className="font-mono text-[#6B6B6B]">₹2,09,633 (39.6%)</span>
                </div>
                <div className="flex items-center justify-between bg-white border border-[#EEE9E4]/30 px-4 py-2.5 rounded-pill shadow-soft text-xs">
                  <span className="font-bold text-[#1A1A1A]">Eren Yeager</span>
                  <span className="font-mono text-[#6B6B6B]">₹1,56,841 (29.6%)</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="max-w-5xl mx-auto px-6 py-20 border-t border-[#EEE9E4]">
        <div className="text-center space-y-2 mb-12">
          <h2 className="text-3xl font-extrabold tracking-tight text-[#0A0A0A] font-display">Does this sound familiar?</h2>
          <p className="text-[#6B6B6B] text-sm">Late payments drain business resources and trigger unnecessary anxiety.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border border-[#EEE9E4] bg-white p-6 rounded-card shadow-card space-y-4">
            <div className="p-2.5 bg-[#FFEBEE] border border-[#F44336]/10 text-[#C62828] rounded-xl w-fit">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-[#0A0A0A] text-sm">Forgotten Follow-ups</h3>
            <p className="text-[#6B6B6B] text-xs leading-relaxed">
              Designing invoices manually and forgetting to nudge clients. Late payments pile up without you noticing.
            </p>
          </div>

          <div className="border border-[#EEE9E4] bg-white p-6 rounded-card shadow-card space-y-4">
            <div className="p-2.5 bg-[#FFEBEE] border border-[#F44336]/10 text-[#C62828] rounded-xl w-fit">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-[#0A0A0A] text-sm">Awkward Reminder Chats</h3>
            <p className="text-[#6B6B6B] text-xs leading-relaxed">
              Directly calling clients for payments feels uncomfortable. You postpone asking, and they continue to delay paying.
            </p>
          </div>

          <div className="border border-[#EEE9E4] bg-white p-6 rounded-card shadow-card space-y-4">
            <div className="p-2.5 bg-[#FFEBEE] border border-[#F44336]/10 text-[#C62828] rounded-xl w-fit">
              <Building2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-[#0A0A0A] text-sm">Scattered Payment Status</h3>
            <p className="text-[#6B6B6B] text-xs leading-relaxed">
              No central record of who has paid, who is pending, and what is overdue. You are left guessing your cashflow.
            </p>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="max-w-5xl mx-auto px-6 py-20 border-t border-[#EEE9E4]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-5">
            <span className="text-[10px] uppercase font-bold text-[#E91E63] tracking-wider block">The CollectBot Solution</span>
            <h2 className="text-3xl font-extrabold leading-tight text-[#0A0A0A] font-display">We handle the awkward part for you.</h2>
            <p className="text-[#6B6B6B] text-sm leading-relaxed">
              CollectBot is specifically configured to automate follow-up workflows so you never have to ask for payment manually again.
            </p>
            <ul className="space-y-4 text-xs pt-2 text-[#1A1A1A]">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4.5 h-4.5 text-[#E91E63] shrink-0 mt-0.5" />
                <span><strong>Create invoice in 60 seconds:</strong> A clean editor that generates standard templates.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4.5 h-4.5 text-[#E91E63] shrink-0 mt-0.5" />
                <span><strong>resend Deliverability:</strong> Invoices are sent via Resend API with PDF attachments.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4.5 h-4.5 text-[#E91E63] shrink-0 mt-0.5" />
                <span><strong>Milestone Escalation:</strong> Reminders increase in urgency as the payment due date passes.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4.5 h-4.5 text-[#E91E63] shrink-0 mt-0.5" />
                <span><strong>UPI Reconciliation:</strong> Direct UPI payments auto-mark invoices paid instantly.</span>
              </li>
            </ul>
          </div>

          <div className="bg-white border border-[#EEE9E4] rounded-card p-6 space-y-5 shadow-card">
            <span className="text-[10px] font-bold text-[#9B9B9B] uppercase tracking-wider block">Workflow Steps</span>
            <div className="space-y-5">
              <div className="flex gap-4">
                <div className="w-7 h-7 rounded-full bg-[#FDF2F7] border border-[#F8BBD9]/30 text-[#E91E63] flex items-center justify-center font-bold font-mono text-xs shrink-0">1</div>
                <div>
                  <span className="text-xs font-bold block text-[#0A0A0A]">Draft & Issue</span>
                  <span className="text-[10px] text-[#6B6B6B] mt-1 block">Setup invoice drafts and email them to clients instantly.</span>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-7 h-7 rounded-full bg-[#FDF2F7] border border-[#F8BBD9]/30 text-[#E91E63] flex items-center justify-center font-bold font-mono text-xs shrink-0">2</div>
                <div>
                  <span className="text-xs font-bold block text-[#0A0A0A]">Auto Remind</span>
                  <span className="text-[10px] text-[#6B6B6B] mt-1 block">Our system dispatches gentle follow-up alerts on schedule.</span>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-7 h-7 rounded-full bg-[#FDF2F7] border border-[#F8BBD9]/30 text-[#E91E63] flex items-center justify-center font-bold font-mono text-xs shrink-0">3</div>
                <div>
                  <span className="text-xs font-bold block text-[#0A0A0A]">Receive Payment</span>
                  <span className="text-[10px] text-[#6B6B6B] mt-1 block">Client completes the transfer, and the ledger updates.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Public Footer */}
      <footer className="bg-white border-t border-[#EEE9E4] text-center py-12 text-[#9B9B9B] text-[10px] space-y-3 font-semibold uppercase tracking-wider">
        <p>CollectBot © 2026. Secure invoice collection workspace.</p>
        <div className="flex justify-center gap-6 font-bold">
          <Link href="/privacy" className="hover:text-[#0A0A0A] transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-[#0A0A0A] transition-colors">Terms of Service</Link>
          <Link href="/refund" className="hover:text-[#0A0A0A] transition-colors">Refund Policy</Link>
        </div>
      </footer>
    </div>
  )
}
