"use client"

import * as React from "react"
import { 
  CreditCard, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Loader2, 
  Search,
  ExternalLink,
  Info
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { formatCurrency, formatDate } from "@/lib/utils"

export default function AdminSubscriptionsPage() {
  const [data, setData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")

  const loadData = async () => {
    try {
      setLoading(true)
      // Since subscriptions detail is part of businesses API or stats API, 
      // we query /api/admin/businesses to aggregate subscription items
      const res = await fetch("/api/admin/businesses?limit=100")
      if (!res.ok) throw new Error("Failed to load subscription list.")
      const json = await res.json()
      
      const list = json.businesses || []
      
      // Aggregate stats manually for UI representation
      let active = 0
      let trialing = 0
      let totalMRR = 0
      
      const subs = list.map((b: any) => {
        const sub = b.subscription || { plan_name: "free", status: "active" }
        
        let planPrice = 0
        if (sub.plan_name === "solo") planPrice = 799
        else if (sub.plan_name === "business") planPrice = 2499
        else if (sub.plan_name === "scale") planPrice = 3999

        if (sub.status === "active") {
          active++
          totalMRR += planPrice
        } else if (sub.status === "trialing") {
          trialing++
        }

        return {
          id: b.id,
          name: b.name,
          email: b.email,
          plan: sub.plan_name || "free",
          status: sub.status || "active",
          trial_ends: sub.trial_ends_at || null,
          period_end: sub.current_period_end || null,
          price: planPrice
        }
      })

      setData({
        activeCount: active,
        trialCount: trialing,
        mrr: totalMRR,
        subscriptions: subs
      })
    } catch (err: any) {
      toast.error(err.message || "An error occurred fetching subscriptions.")
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="w-9 h-9 text-indigo-500 animate-spin mb-4" />
        <p className="text-xs text-slate-400 font-medium">Aggregating subscription logs and plan invoices...</p>
      </div>
    )
  }

  // Filter subscriptions list
  const filteredSubs = data?.subscriptions?.filter((sub: any) => {
    const matchesSearch = sub.name.toLowerCase().includes(search.toLowerCase()) || 
                          (sub.email && sub.email.toLowerCase().includes(search.toLowerCase()))
    
    const matchesStatus = statusFilter === "all" || sub.status === statusFilter
    
    return matchesSearch && matchesStatus
  }) || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Subscription Registry & MRR
          </h1>
          <p className="text-xs text-slate-400 mt-1">Audit customer plan lifecycles, active trial allocations, and estimated MRR volume.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* MRR */}
        <div className="bg-[#1E293B]/40 border border-slate-800/80 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Estimated MRR</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-extrabold text-white tracking-tight">{formatCurrency(data?.mrr ?? 0)}</h3>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">Aggregated from active subscriptions</p>
          </div>
        </div>

        {/* Active Premium */}
        <div className="bg-[#1E293B]/40 border border-slate-800/80 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Plans</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-extrabold text-white tracking-tight">{data?.activeCount ?? 0}</h3>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">Paying customer accounts</p>
          </div>
        </div>

        {/* Trial accounts */}
        <div className="bg-[#1E293B]/40 border border-slate-800/80 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Trialing Users</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-extrabold text-white tracking-tight">{data?.trialCount ?? 0}</h3>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">SaaS evaluation sessions</p>
          </div>
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-4 bg-[#1E293B]/30 border border-slate-800/80 rounded-xl p-4 shadow-sm">
        {/* Search */}
        <div className="flex-1 relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by business name or email address..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 pl-9 pr-4 text-xs font-medium text-slate-300 placeholder-slate-500 focus:outline-none focus:border-slate-700 transition-all"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-medium text-slate-300 focus:outline-none"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="trialing">Trialing</option>
            <option value="paused">Paused</option>
            <option value="cancelled">Cancelled</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Table grid */}
      <div className="bg-[#1E293B]/30 border border-slate-800/80 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-900/40 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <th className="p-4">Business name</th>
                <th className="p-4">Assigned Tier</th>
                <th className="p-4">Billing Price</th>
                <th className="p-4">Status</th>
                <th className="p-4">Trial / Period Ends</th>
                <th className="p-4 text-center">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-xs font-medium text-slate-300">
              {filteredSubs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-20 text-slate-500 italic">
                    No subscriptions match the applied status filters.
                  </td>
                </tr>
              ) : (
                filteredSubs.map((sub: any) => (
                  <tr key={sub.id} className="hover:bg-slate-800/20 transition-all">
                    <td className="p-4">
                      <div>
                        <p className="font-semibold text-white">{sub.name}</p>
                        <span className="text-[10px] text-slate-500 block mt-0.5">{sub.email || "No email"}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-[9px] font-bold uppercase bg-slate-800/55 border border-slate-700/50 px-2 py-0.5 rounded text-slate-300">
                        {sub.plan}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-semibold text-white">
                      {formatCurrency(sub.price)}/mo
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide border ${
                        sub.status === "active" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                        sub.status === "trialing" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                        "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      }`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400">
                      {sub.status === "trialing" 
                        ? (sub.trial_ends ? `Trial Ends: ${formatDate(sub.trial_ends)}` : "N/A") 
                        : (sub.period_end ? `Period Ends: ${formatDate(sub.period_end)}` : "N/A")
                      }
                    </td>
                    <td className="p-4 text-center">
                      <Link
                        href={`/admin/businesses/${sub.id}`}
                        className="inline-flex items-center justify-center p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700/60 rounded-lg text-xs font-semibold text-white transition-all shadow-sm"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
