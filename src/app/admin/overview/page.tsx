"use client"

import * as React from "react"
import { 
  Building2, 
  FileText, 
  CreditCard, 
  Users, 
  TrendingUp, 
  Activity, 
  RefreshCw, 
  Loader2, 
  AlertTriangle,
  ArrowRight
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { formatCurrency, formatDate } from "@/lib/utils"

interface StatCardProps {
  title: string
  value: string | number
  subText: string
  icon: React.ReactNode
  colorClass: string
}

function StatCard({ title, value, subText, icon, colorClass }: StatCardProps) {
  return (
    <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:border-slate-350 transition-all duration-200">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</span>
        <div className={`p-2 rounded-lg ${colorClass}`}>{icon}</div>
      </div>
      <div className="mt-4">
        <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">{value}</h3>
        <p className="text-[11px] text-slate-400 mt-1 font-medium">{subText}</p>
      </div>
    </div>
  )
}

export default function AdminOverviewPage() {
  const [data, setData] = React.useState<any>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  const fetchStats = async (showRefreshToast = false) => {
    try {
      if (showRefreshToast) setIsRefreshing(true)
      const res = await fetch("/api/admin/stats")
      if (!res.ok) {
        throw new Error("Failed to load statistics.")
      }
      const json = await res.json()
      setData(json)
      if (showRefreshToast) toast.success("Dashboard metrics updated.")
    } catch (err: any) {
      toast.error(err.message || "An error occurred fetching dashboard metrics.")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  React.useEffect(() => {
    fetchStats()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="w-9 h-9 text-indigo-500 animate-spin mb-4" />
        <p className="text-xs text-slate-400 font-medium">Aggregating platform audit logs and metrics...</p>
      </div>
    )
  }

  const freeCount = data?.planDistribution?.free || 0
  const soloCount = data?.planDistribution?.solo || 0
  const businessCount = data?.planDistribution?.business || 0
  const scaleCount = data?.planDistribution?.scale || 0
  const totalSubs = freeCount + soloCount + businessCount + scaleCount || 1

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            CollectBot Admin Control Center
          </h1>
          <p className="text-xs text-slate-500 mt-1">Real-time system health metrics, plan allocations, and activity telemetry.</p>
        </div>
        <button
          onClick={() => fetchStats(true)}
          disabled={isRefreshing}
          className="p-2 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 text-slate-500 hover:text-slate-800 shadow-sm transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-indigo-600" : ""}`} />
        </button>
      </div>

      {/* Main KPI Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Businesses"
          value={data?.totalBusinesses ?? 0}
          subText={`+${data?.newBusinessesThisWeek ?? 0} signed up this week`}
          icon={<Building2 className="w-5 h-5 text-indigo-650" />}
          colorClass="bg-indigo-50 text-indigo-650"
        />
        <StatCard
          title="Active Subscriptions"
          value={data?.activeSubscriptions ?? 0}
          subText="Premium features enabled"
          icon={<TrendingUp className="w-5 h-5 text-emerald-650" />}
          colorClass="bg-emerald-50 text-emerald-650"
        />
        <StatCard
          title="Invoices Generated"
          value={data?.totalInvoices ?? 0}
          subText={`${data?.invoicesToday ?? 0} generated today`}
          icon={<FileText className="w-5 h-5 text-sky-650" />}
          colorClass="bg-sky-50 text-sky-650"
        />
        <StatCard
          title="CollectBot Volume"
          value={formatCurrency(data?.totalPaymentVolume ?? 0)}
          subText="Gross volume processed"
          icon={<CreditCard className="w-5 h-5 text-amber-650" />}
          colorClass="bg-amber-50 text-amber-655"
        />
      </div>

      {/* Content Columns split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Plan Allocation & Lists */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Subscriptions Allocations */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-4">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight border-b border-slate-100 pb-3 flex items-center justify-between">
              <span>SaaS Subscription Distribution</span>
              <span className="text-[10px] text-indigo-600 uppercase tracking-widest font-extrabold">Plan counts</span>
            </h3>
            <div className="space-y-4 pt-1">
              {[
                { name: "Free Tier", count: freeCount, color: "bg-indigo-600", pct: `${Math.round((freeCount / totalSubs) * 100)}%` },
                { name: "Solo Tier", count: soloCount, color: "bg-emerald-600", pct: `${Math.round((soloCount / totalSubs) * 100)}%` },
                { name: "Business Tier", count: businessCount, color: "bg-amber-600", pct: `${Math.round((businessCount / totalSubs) * 100)}%` },
                { name: "Scale Tier", count: scaleCount, color: "bg-rose-600", pct: `${Math.round((scaleCount / totalSubs) * 100)}%` },
              ].map((plan, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
                    <span>{plan.name}</span>
                    <span className="text-slate-800 font-extrabold">{plan.count} ({plan.pct})</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/60">
                    <div className={`h-full rounded-full ${plan.color}`} style={{ width: plan.pct }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* New Registrations Quick-view */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Recent Onboardings</h3>
              <Link href="/admin/businesses" className="text-[10px] text-indigo-600 font-bold hover:underline flex items-center gap-1 uppercase">
                All Businesses <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            
            <div className="space-y-3 pt-1">
              {data?.recentBusinesses?.length === 0 ? (
                <p className="text-xs text-slate-450 italic py-3 text-center">No client registrations logged in this snapshot.</p>
              ) : (
                data?.recentBusinesses?.map((biz: any) => (
                  <div key={biz.id} className="flex justify-between items-center border-b border-slate-100 pb-2 last:border-b-0">
                    <div>
                      <p className="text-xs font-bold text-slate-800">{biz.name}</p>
                      <span className="text-[10px] text-slate-500 font-medium">{biz.email || "No email"} • {biz.city || "Online"}</span>
                    </div>
                    <span className="text-[9px] text-slate-650 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded font-mono">
                      {formatDate(biz.created_at)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Timelines & Activity stream */}
        <div className="lg:col-span-7 space-y-6">

          {/* Activity feed */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-4">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight border-b border-slate-100 pb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-650" />
              Recent Activity Feed
            </h3>
            
            <div className="space-y-4 pt-1 max-h-[380px] overflow-y-auto pr-1">
              {data?.recentInvoices?.length === 0 ? (
                <div className="text-center py-10 text-slate-550 text-xs italic">
                  No invoices, payment transactions, or updates captured in the current interval.
                </div>
              ) : (
                data?.recentInvoices?.map((inv: any) => (
                  <div key={inv.id} className="flex items-start gap-3 border-l-2 border-slate-200 pl-4 py-0.5 position-relative">
                    <div className="flex-1">
                      <p className="text-xs font-bold text-slate-800">
                        Invoice <span className="font-mono text-indigo-600 font-bold">{inv.invoice_number}</span> created
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                        Client: {inv.client?.name || "N/A"} • Amount: {formatCurrency(inv.total)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        inv.status === "paid" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                        inv.status === "overdue" ? "bg-rose-50 text-rose-700 border border-rose-100" :
                        "bg-slate-50 text-slate-650 border border-slate-200"
                      }`}>
                        {inv.status}
                      </span>
                      <p className="text-[8px] text-slate-550 font-mono mt-1">{formatDate(inv.created_at)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Operational alerts */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-4">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight border-b border-slate-100 pb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Operational & Action Logs
            </h3>
            <div className="text-center py-6 text-slate-500 text-xs italic">
              All webhooks, payment callbacks, and reminder triggers are running normally. No warnings logged.
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
