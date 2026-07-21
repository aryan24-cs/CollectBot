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
  FileText,
  Sparkles,
  TrendingUp,
  CreditCard,
  Users,
  Check,
  ChevronRight,
  Shield,
  Layers,
  BarChart3,
  Bell,
  CheckSquare,
  Globe,
  Star,
  Lock,
  ArrowUpRight,
  Briefcase,
  Megaphone,
  Ticket
} from "lucide-react"

export default function LandingPage() {
  const [activeTab, setActiveTab] = React.useState<"owner" | "finance" | "sales" | "marketing">("owner")

  return (
    <div className="min-h-screen bg-[#F5F1EE] text-[#1A1A1A] font-sans selection:bg-[#E91E63] selection:text-white select-none overflow-x-hidden">
      
      {/* Background Soft Mesh Glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-gradient-to-tr from-[#E91E63]/10 via-[#9C27B0]/5 to-transparent blur-[120px] rounded-full opacity-70" />
        <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-blue-500/5 blur-[150px] rounded-full opacity-50" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000005_1px,transparent_1px),linear-gradient(to_bottom,#00000005_1px,transparent_1px)] bg-[size:3rem_3rem]" />
      </div>

      {/* Navigation Header */}
      <header className="relative z-10 max-w-7xl mx-auto px-6 py-5 flex items-center justify-between border-b border-[#EEE9E4] backdrop-blur-md bg-[#F5F1EE]/80 sticky top-0">
        <Link href="/" className="text-lg font-black tracking-tight text-[#0A0A0A] flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-full bg-[#1A1A1A] flex items-center justify-center text-sm font-extrabold text-white shadow-md group-hover:scale-105 transition-transform">
            C
          </div>
          <span className="font-extrabold tracking-tight text-[#0A0A0A]">
            CollectBot
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-xs font-bold text-[#6B6B6B]">
          <a href="#features" className="hover:text-[#0A0A0A] transition-colors">Features</a>
          <a href="#preview" className="hover:text-[#0A0A0A] transition-colors">Workspaces</a>
          <a href="#comparison" className="hover:text-[#0A0A0A] transition-colors">Why CollectBot</a>
          <a href="#pricing" className="hover:text-[#0A0A0A] transition-colors">Pricing</a>
        </nav>

        <div className="flex items-center gap-4">
          <Link href="/login" className="text-xs font-bold text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors px-3 py-2">
            Sign In
          </Link>
          <Link 
            href="/signup" 
            className="bg-[#1A1A1A] hover:bg-[#0A0A0A] text-white text-xs font-bold px-5 py-2.5 rounded-full transition-all shadow-md flex items-center gap-2 hover:scale-105"
          >
            <span>Get Started Free</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pt-20 pb-16 text-center space-y-7">
        
        {/* Pill Badge */}
        <div className="inline-flex items-center gap-2 bg-[#FDF2F7] border border-[#F8BBD9]/40 text-[#E91E63] text-[11px] font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-sm">
          <Zap className="w-3.5 h-3.5 fill-[#E91E63]" />
          <span>Stop Chasing Payment Late Fees</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-[#0A0A0A] max-w-4xl mx-auto leading-[1.15]">
          Collect Outstanding Payments <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-[#E91E63] via-[#D81B60] to-[#9C27B0] bg-clip-text text-transparent">
            Without Asking Twice.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-[#6B6B6B] text-sm sm:text-base max-w-2xl mx-auto leading-relaxed font-medium">
          Automated multi-channel invoice follow-ups, direct UPI payment links, and dedicated role-based portals for Finance, Sales, Marketing, and Business Owners.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-3">
          <Link 
            href="/signup" 
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#E91E63] hover:bg-[#D81B60] text-white font-bold text-xs px-8 py-3.5 rounded-full transition-all shadow-md hover:scale-105"
          >
            <Zap className="w-4 h-4 fill-white" />
            Start Collecting Free
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link 
            href="/login" 
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white hover:bg-white/80 border border-[#EEE9E4] text-[#1A1A1A] font-bold text-xs px-7 py-3.5 rounded-full transition-all shadow-sm"
          >
            <span>Live Workspace Demo</span>
            <ArrowUpRight className="w-4 h-4 text-[#6B6B6B]" />
          </Link>
        </div>

        {/* Feature Badges */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-[#6B6B6B] pt-2 font-semibold">
          <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#E91E63]" /> No Credit Card Required</span>
          <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#E91E63]" /> Setup in 60 Seconds</span>
          <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#E91E63]" /> Instant UPI & Bank Settlement</span>
        </div>

        {/* Hero Interactive Workspace Mockup Preview */}
        <div className="pt-10 relative max-w-5xl mx-auto">
          <div className="border border-[#EEE9E4] bg-white rounded-2xl p-4 sm:p-6 shadow-xl relative text-left">
            
            {/* Top Mockup Header Bar */}
            <div className="flex items-center justify-between border-b border-[#EEE9E4] pb-4 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <span className="text-xs text-[#9B9B9B] font-mono ml-2">app.collectbot.in/dashboard</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-[#E8F5E9] border border-[#4CAF50]/20 text-[#2E7D32] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4CAF50] animate-ping" />
                  Live Sync Engine Active
                </span>
              </div>
            </div>

            {/* Dashboard Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              
              <div className="bg-[#FAF8F5] border border-[#EEE9E4] rounded-xl p-4">
                <p className="text-[10px] uppercase font-bold text-[#9B9B9B] tracking-wider">Total Invoiced</p>
                <h3 className="text-xl font-extrabold text-[#0A0A0A] mt-1 font-mono">₹8,45,290</h3>
                <span className="text-[10px] text-[#2E7D32] font-bold mt-1 inline-block">↑ +14.2% vs last month</span>
              </div>

              <div className="bg-[#FDF2F7] border border-[#F8BBD9]/40 rounded-xl p-4">
                <p className="text-[10px] uppercase font-bold text-[#E91E63] tracking-wider">Collected This Month</p>
                <h3 className="text-xl font-extrabold text-[#0A0A0A] mt-1 font-mono">₹6,92,400</h3>
                <span className="text-[10px] text-[#E91E63] font-bold mt-1 inline-block">82% collection efficiency</span>
              </div>

              <div className="bg-[#FAF8F5] border border-[#EEE9E4] rounded-xl p-4">
                <p className="text-[10px] uppercase font-bold text-[#9B9B9B] tracking-wider">Automated Nudges</p>
                <h3 className="text-xl font-extrabold text-[#0A0A0A] mt-1 font-mono">1,428 Sent</h3>
                <span className="text-[10px] text-[#1976D2] font-bold mt-1 inline-block">99.4% delivery rate</span>
              </div>

              <div className="bg-[#FAF8F5] border border-[#EEE9E4] rounded-xl p-4">
                <p className="text-[10px] uppercase font-bold text-[#9B9B9B] tracking-wider">Overdue Recovered</p>
                <h3 className="text-xl font-extrabold text-[#0A0A0A] mt-1 font-mono">₹1,52,890</h3>
                <span className="text-[10px] text-[#F57C00] font-bold mt-1 inline-block">⚡ 4.1 days avg turnaround</span>
              </div>

            </div>

            {/* Mockup Table */}
            <div className="mt-6 border border-[#EEE9E4] rounded-xl overflow-hidden bg-[#FAF8F5]">
              <div className="px-4 py-3 border-b border-[#EEE9E4] flex items-center justify-between text-xs font-bold text-[#1A1A1A]">
                <span>Recent Automated Follow-up Log</span>
                <span className="text-[10px] text-[#E91E63] font-bold uppercase">Realtime Updates</span>
              </div>
              <div className="divide-y divide-[#EEE9E4] text-xs">
                <div className="px-4 py-3 flex items-center justify-between hover:bg-white transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#4CAF50]" />
                    <div>
                      <p className="font-bold text-[#0A0A0A]">Acme Corp India</p>
                      <p className="text-[10px] text-[#6B6B6B]">INV-2026-089 • WhatsApp + Email Reminder</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-[#0A0A0A]">₹1,20,000</span>
                    <span className="block text-[9px] text-[#2E7D32] font-bold uppercase">Paid via UPI</span>
                  </div>
                </div>

                <div className="px-4 py-3 flex items-center justify-between hover:bg-white transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                    <div>
                      <p className="font-bold text-[#0A0A0A]">Apex Digital Agency</p>
                      <p className="text-[10px] text-[#6B6B6B]">INV-2026-092 • 3 Days Before Due Date</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-[#0A0A0A]">₹45,500</span>
                    <span className="block text-[9px] text-amber-700 font-bold uppercase">Scheduled Today 5:00 PM</span>
                  </div>
                </div>

                <div className="px-4 py-3 flex items-center justify-between hover:bg-white transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <div>
                      <p className="font-bold text-[#0A0A0A]">Starlight Innovations</p>
                      <p className="text-[10px] text-[#6B6B6B]">INV-2026-094 • Invoice Sent & PDF Delivered</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-[#0A0A0A]">₹88,000</span>
                    <span className="block text-[9px] text-blue-700 font-bold uppercase">Link Opened</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

      </section>

      {/* Statistics Bar */}
      <section className="relative z-10 border-y border-[#EEE9E4] bg-white py-14">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-[#0A0A0A] font-mono">₹12.4Cr+</h2>
            <p className="text-xs font-bold text-[#6B6B6B] uppercase tracking-wider">Payments Collected</p>
          </div>
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-[#E91E63] font-mono">99.2%</h2>
            <p className="text-xs font-bold text-[#6B6B6B] uppercase tracking-wider">On-Time Recovery</p>
          </div>
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-[#0A0A0A] font-mono">4.1 Days</h2>
            <p className="text-xs font-bold text-[#6B6B6B] uppercase tracking-wider">Avg Turnaround Speed</p>
          </div>
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-[#E91E63] font-mono">850+</h2>
            <p className="text-xs font-bold text-[#6B6B6B] uppercase tracking-wider">Active Workspaces</p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="relative z-10 max-w-6xl mx-auto px-6 py-24 space-y-16">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#E91E63] bg-[#FDF2F7] border border-[#F8BBD9]/40 px-4 py-1.5 rounded-full inline-block">
            Engineered For Zero Friction
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-[#0A0A0A] tracking-tight leading-tight">
            Everything Needed to Automate Company Collections.
          </h2>
          <p className="text-[#6B6B6B] text-sm leading-relaxed">
            Eliminate manual follow-ups, fragmented spreadsheets, and uncollected client balances with powerful automated tools.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Feature 1 */}
          <div className="group border border-[#EEE9E4] bg-white p-8 rounded-2xl hover:shadow-lg transition-all duration-300 relative overflow-hidden">
            <div className="w-12 h-12 rounded-xl bg-[#FDF2F7] border border-[#F8BBD9]/40 flex items-center justify-center text-[#E91E63] mb-6 group-hover:scale-110 transition-transform">
              <Bell className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#0A0A0A]">Automated Nudges</h3>
            <p className="text-[#6B6B6B] text-xs mt-2.5 leading-relaxed">
              Schedule multi-channel notifications across WhatsApp and Email. Nudges escalate automatically as due dates approach.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="group border border-[#EEE9E4] bg-white p-8 rounded-2xl hover:shadow-lg transition-all duration-300 relative overflow-hidden">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform">
              <CreditCard className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#0A0A0A]">Instant UPI Checkouts</h3>
            <p className="text-[#6B6B6B] text-xs mt-2.5 leading-relaxed">
              Clients pay instantly using dynamic QR codes, UPI links, or Razorpay checkouts directly from their invoice page.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="group border border-[#EEE9E4] bg-white p-8 rounded-2xl hover:shadow-lg transition-all duration-300 relative overflow-hidden">
            <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 mb-6 group-hover:scale-110 transition-transform">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#0A0A0A]">Multi-Role Workspaces</h3>
            <p className="text-[#6B6B6B] text-xs mt-2.5 leading-relaxed">
              Tailored views for Business Owners, Finance teams, Sales reps, and Marketing leads with strict RBAC permission controls.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="group border border-[#EEE9E4] bg-white p-8 rounded-2xl hover:shadow-lg transition-all duration-300 relative overflow-hidden">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-6 group-hover:scale-110 transition-transform">
              <CheckSquare className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#0A0A0A]">Approval Workflows</h3>
            <p className="text-[#6B6B6B] text-xs mt-2.5 leading-relaxed">
              Teammate expense logging and discount requests undergo multi-step owner approval before balance ledger updates.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="group border border-[#EEE9E4] bg-white p-8 rounded-2xl hover:shadow-lg transition-all duration-300 relative overflow-hidden">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-6 group-hover:scale-110 transition-transform">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#0A0A0A]">Realtime Ledger Insights</h3>
            <p className="text-[#6B6B6B] text-xs mt-2.5 leading-relaxed">
              Track outstanding revenue, slow payers, draft balances, and cashflow projections with automatic visual charts.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="group border border-[#EEE9E4] bg-white p-8 rounded-2xl hover:shadow-lg transition-all duration-300 relative overflow-hidden">
            <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-6 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#0A0A0A]">Bank-Grade Audit Logs</h3>
            <p className="text-[#6B6B6B] text-xs mt-2.5 leading-relaxed">
              Every invoice send, payment collection, employee action, and reminder dispatch is logged with full immutable audit history.
            </p>
          </div>

        </div>
      </section>

      {/* Role Workspaces Section */}
      <section id="preview" className="relative z-10 max-w-6xl mx-auto px-6 py-20 space-y-12">
        <div className="text-center space-y-3">
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#E91E63]">
            Dedicated Portals
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-[#0A0A0A]">Designed For Every Team Role.</h2>
        </div>

        {/* Tab Selection */}
        <div className="flex flex-wrap justify-center gap-3">
          {[
            { id: "owner", label: "Business Owner", icon: Building2 },
            { id: "finance", label: "Finance Workspace", icon: CreditCard },
            { id: "sales", label: "Sales & CRM", icon: Briefcase },
            { id: "marketing", label: "Marketing Campaigns", icon: Megaphone }
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-3 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                  isActive 
                    ? "bg-[#1A1A1A] text-white border-transparent shadow-md" 
                    : "bg-white border-[#EEE9E4] text-[#6B6B6B] hover:text-[#0A0A0A]"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab Content Box */}
        <div className="border border-[#EEE9E4] bg-white rounded-2xl p-8 shadow-md text-left max-w-4xl mx-auto">
          {activeTab === "owner" && (
            <div className="space-y-4">
              <h3 className="text-xl font-extrabold text-[#0A0A0A]">Full Executive Overview</h3>
              <p className="text-[#6B6B6B] text-xs leading-relaxed">
                Control team permissions, audit logs, invoice sequences, banking settings, and global financial metrics from one minimal command center.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs">
                <div className="bg-[#FAF8F5] p-4 rounded-xl border border-[#EEE9E4]">
                  <span className="font-bold text-[#0A0A0A] block">RBAC Access Control</span>
                  <span className="text-[#6B6B6B] text-[10px]">Invite teammates with granular module permissions.</span>
                </div>
                <div className="bg-[#FAF8F5] p-4 rounded-xl border border-[#EEE9E4]">
                  <span className="font-bold text-[#0A0A0A] block">UPI & Bank Auto Sync</span>
                  <span className="text-[#6B6B6B] text-[10px]">Direct settlement into your business bank account.</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "finance" && (
            <div className="space-y-4">
              <h3 className="text-xl font-extrabold text-[#0A0A0A]">Invoice & Expense Ledger</h3>
              <p className="text-[#6B6B6B] text-xs leading-relaxed">
                Draft invoices, track overdue payments, verify employee expense submissions, and manage automated WhatsApp reminder rules.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs">
                <div className="bg-[#FAF8F5] p-4 rounded-xl border border-[#EEE9E4]">
                  <span className="font-bold text-[#0A0A0A] block">Resend PDF Invoicing</span>
                  <span className="text-[#6B6B6B] text-[10px]">Clean invoices with dynamic tax and discount calculations.</span>
                </div>
                <div className="bg-[#FAF8F5] p-4 rounded-xl border border-[#EEE9E4]">
                  <span className="font-bold text-[#0A0A0A] block">Automated Reminders</span>
                  <span className="text-[#6B6B6B] text-[10px]">Nudge schedules run on background cron triggers.</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "sales" && (
            <div className="space-y-4">
              <h3 className="text-xl font-extrabold text-[#0A0A0A]">Sales Pipeline & Lead Management</h3>
              <p className="text-[#6B6B6B] text-xs leading-relaxed">
                Track client leads, assign deals to sales reps, log follow-ups, and convert won proposals directly into billable invoices.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs">
                <div className="bg-[#FAF8F5] p-4 rounded-xl border border-[#EEE9E4]">
                  <span className="font-bold text-[#0A0A0A] block">Lead Kanban Stages</span>
                  <span className="text-[#6B6B6B] text-[10px]">New → Proposal → Negotiation → Won.</span>
                </div>
                <div className="bg-[#FAF8F5] p-4 rounded-xl border border-[#EEE9E4]">
                  <span className="font-bold text-[#0A0A0A] block">Rep Sales Targets</span>
                  <span className="text-[#6B6B6B] text-[10px]">Set and monitor sales target quotas in real time.</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "marketing" && (
            <div className="space-y-4">
              <h3 className="text-xl font-extrabold text-[#0A0A0A]">Campaign & Lead Generation</h3>
              <p className="text-[#6B6B6B] text-xs leading-relaxed">
                Launch email and WhatsApp marketing broadcasts, manage customer segments, issue discount coupons, and track campaign ROI.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs">
                <div className="bg-[#FAF8F5] p-4 rounded-xl border border-[#EEE9E4]">
                  <span className="font-bold text-[#0A0A0A] block">Broadcast Engine</span>
                  <span className="text-[#6B6B6B] text-[10px]">Deliver promotional alerts to target audience segments.</span>
                </div>
                <div className="bg-[#FAF8F5] p-4 rounded-xl border border-[#EEE9E4]">
                  <span className="font-bold text-[#0A0A0A] block">Coupons & Discounts</span>
                  <span className="text-[#6B6B6B] text-[10px]">Create custom promotional codes with max use limits.</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Comparison Section (Before vs After) */}
      <section id="comparison" className="relative z-10 max-w-6xl mx-auto px-6 py-20 space-y-12">
        <div className="text-center space-y-3">
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#E91E63]">
            The Difference
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-[#0A0A0A]">Before & After CollectBot</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Before */}
          <div className="border border-red-200 bg-[#FFF5F5] p-8 rounded-2xl space-y-6">
            <h3 className="text-base font-bold text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Before CollectBot
            </h3>
            <ul className="space-y-4 text-xs text-[#1A1A1A]">
              <li className="flex items-start gap-3">
                <span className="text-red-600 font-bold">✕</span>
                <span>Hours wasted manually sending invoice PDFs & reminder messages</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-red-600 font-bold">✕</span>
                <span>Awkward, uncomfortable payment follow-up chats with clients</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-red-600 font-bold">✕</span>
                <span>No single source of truth for overdue payments and cashflow</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-red-600 font-bold">✕</span>
                <span>High rate of late payments and bad debt write-offs</span>
              </li>
            </ul>
          </div>

          {/* After */}
          <div className="border border-emerald-200 bg-[#F0FDF4] p-8 rounded-2xl space-y-6">
            <h3 className="text-base font-bold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              With CollectBot V2
            </h3>
            <ul className="space-y-4 text-xs text-[#1A1A1A]">
              <li className="flex items-start gap-3">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Automated multi-channel nudges deliver reminders on schedule</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Instant UPI & credit card payment checkouts built directly into invoices</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Role-based team portals keep Finance, Sales, and Owners synced</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Average collection time reduced to 4.1 days with zero manual work</span>
              </li>
            </ul>
          </div>

        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative z-10 max-w-6xl mx-auto px-6 py-24 space-y-16">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#E91E63]">
            Simple & Transparent
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-[#0A0A0A]">Pricing Built For Scale.</h2>
          <p className="text-[#6B6B6B] text-sm">Choose the plan that matches your monthly billing volume.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          
          {/* Solo Plan */}
          <div className="border border-[#EEE9E4] bg-white p-8 rounded-2xl flex flex-col justify-between shadow-sm">
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-[#0A0A0A]">Solo Tier</h3>
                <p className="text-xs text-[#6B6B6B] mt-1">For freelancers & independent providers.</p>
              </div>
              <div className="flex items-baseline">
                <span className="text-4xl font-black font-mono text-[#0A0A0A]">₹799</span>
                <span className="text-xs text-[#6B6B6B] ml-1">/ month</span>
              </div>
              <ul className="space-y-3 text-xs text-[#1A1A1A]">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#E91E63]" /> Up to 30 Invoices / Month</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#E91E63]" /> Automated WhatsApp Nudges</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#E91E63]" /> UPI & Bank Direct Settlement</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#E91E63]" /> PDF Invoice Generation</li>
              </ul>
            </div>
            <Link 
              href="/signup" 
              className="mt-8 w-full py-3 bg-[#FAF8F5] hover:bg-cream-200 border border-[#EEE9E4] text-[#0A0A0A] text-xs font-bold rounded-full text-center block transition-all"
            >
              Get Started
            </Link>
          </div>

          {/* Business Plan (Recommended) */}
          <div className="border-2 border-[#E91E63] bg-white p-8 rounded-2xl flex flex-col justify-between relative shadow-lg">
            <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#E91E63] text-white text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-full shadow-md">
              Most Popular
            </span>
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-[#0A0A0A]">Business Tier</h3>
                <p className="text-xs text-[#6B6B6B] mt-1">For growing agencies & service teams.</p>
              </div>
              <div className="flex items-baseline">
                <span className="text-4xl font-black font-mono text-[#0A0A0A]">₹2,499</span>
                <span className="text-xs text-[#6B6B6B] ml-1">/ month</span>
              </div>
              <ul className="space-y-3 text-xs text-[#1A1A1A]">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#E91E63]" /> Unlimited Monthly Invoices</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#E91E63]" /> Multi-Channel Alerts (WA + Email)</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#E91E63]" /> Up to 3 Teammate Workspaces</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#E91E63]" /> Expense & Discount Approvals</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#E91E63]" /> Priority Support</li>
              </ul>
            </div>
            <Link 
              href="/signup" 
              className="mt-8 w-full py-3 bg-[#E91E63] hover:bg-[#D81B60] text-white text-xs font-bold rounded-full text-center block transition-all shadow-md"
            >
              Start 14-Day Free Trial
            </Link>
          </div>

          {/* Scale Plan */}
          <div className="border border-[#EEE9E4] bg-white p-8 rounded-2xl flex flex-col justify-between shadow-sm">
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-[#0A0A0A]">Scale Tier</h3>
                <p className="text-xs text-[#6B6B6B] mt-1">For corporate teams needing custom RBAC.</p>
              </div>
              <div className="flex items-baseline">
                <span className="text-4xl font-black font-mono text-[#0A0A0A]">₹3,999</span>
                <span className="text-xs text-[#6B6B6B] ml-1">/ month</span>
              </div>
              <ul className="space-y-3 text-xs text-[#1A1A1A]">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#E91E63]" /> All Business Tier Features</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#E91E63]" /> Up to 5 Teammate Workspaces</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#E91E63]" /> Custom Domain & Whitelabeling</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#E91E63]" /> CSV & Tally Ledger Exports</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#E91E63]" /> Dedicated Account Manager</li>
              </ul>
            </div>
            <Link 
              href="/signup" 
              className="mt-8 w-full py-3 bg-[#FAF8F5] hover:bg-cream-200 border border-[#EEE9E4] text-[#0A0A0A] text-xs font-bold rounded-full text-center block transition-all"
            >
              Contact Sales
            </Link>
          </div>

        </div>
      </section>

      {/* CTA Bottom Banner */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-16">
        <div className="bg-[#1A1A1A] rounded-3xl p-10 sm:p-14 text-center space-y-6 shadow-xl relative overflow-hidden text-white">
          <div className="relative z-10 space-y-4 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
              Ready to Recover Your Outstanding Cashflow?
            </h2>
            <p className="text-white/70 text-sm">
              Join 850+ businesses collecting payments on time with CollectBot V2.
            </p>
            <div className="pt-4">
              <Link 
                href="/signup" 
                className="inline-flex items-center gap-2 bg-[#E91E63] hover:bg-[#D81B60] text-white font-bold text-xs px-8 py-3.5 rounded-full transition-all shadow-md hover:scale-105"
              >
                <span>Get Started Now</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Public Footer */}
      <footer className="relative z-10 border-t border-[#EEE9E4] bg-white text-[#6B6B6B] text-xs py-14">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-10">
          
          <div className="space-y-3">
            <Link href="/" className="text-lg font-black text-[#0A0A0A] flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#1A1A1A] flex items-center justify-center text-xs font-bold text-white">
                C
              </div>
              <span>CollectBot</span>
            </Link>
            <p className="text-[#6B6B6B] text-xs leading-relaxed">
              Automated invoice payment collection workspace for modern service businesses and agencies in India.
            </p>
          </div>

          <div className="space-y-3">
            <p className="font-bold text-[#0A0A0A] text-xs uppercase tracking-wider">Product</p>
            <ul className="space-y-2 text-xs">
              <li><a href="#features" className="hover:text-[#0A0A0A] transition-colors">Automated Nudges</a></li>
              <li><a href="#preview" className="hover:text-[#0A0A0A] transition-colors">Role Workspaces</a></li>
              <li><a href="#pricing" className="hover:text-[#0A0A0A] transition-colors">Pricing Plans</a></li>
              <li><Link href="/login" className="hover:text-[#0A0A0A] transition-colors">Sign In</Link></li>
            </ul>
          </div>

          <div className="space-y-3">
            <p className="font-bold text-[#0A0A0A] text-xs uppercase tracking-wider">Resources</p>
            <ul className="space-y-2 text-xs">
              <li><Link href="/privacy" className="hover:text-[#0A0A0A] transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-[#0A0A0A] transition-colors">Terms of Service</Link></li>
              <li><Link href="/refund" className="hover:text-[#0A0A0A] transition-colors">Refund Policy</Link></li>
            </ul>
          </div>

          <div className="space-y-3">
            <p className="font-bold text-[#0A0A0A] text-xs uppercase tracking-wider">Company</p>
            <p className="text-[#6B6B6B] text-xs leading-relaxed">
              CollectBot © 2026. All rights reserved. <br />
              Secure billing automation platform.
            </p>
          </div>

        </div>
      </footer>

    </div>
  )
}
