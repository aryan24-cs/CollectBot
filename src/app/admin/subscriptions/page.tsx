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
import { formatCurrency, formatDate, cn } from "@/lib/utils"

export default function AdminSubscriptionsPage() {
  const [data, setData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/admin/businesses?limit=100")
      if (!res.ok) throw new Error("Failed to load subscription list.")
      const json = await res.json()
      
      const list = json.businesses || []
      
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
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-ink-secondary">
        <Loader2 className="w-9 h-9 text-[#E91E63] animate-spin mb-4" />
        <p className="text-xs font-semibold">Aggregating subscription logs and plan invoices...</p>
      </div>
    )
  }

  const filteredSubs = data?.subscriptions?.filter((sub: any) => {
    const matchesSearch = sub.name.toLowerCase().includes(search.toLowerCase()) || 
                          (sub.email && sub.email.toLowerCase().includes(search.toLowerCase()))
    
    const matchesStatus = statusFilter === "all" || sub.status === statusFilter
    
    return matchesSearch && matchesStatus
  }) || []

  return (
    <div className="space-y-6 text-ink-primary max-w-6xl mx-auto pb-10">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-[#EEE9E4] pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0A0A0A] font-display flex items-center gap-2">
            Subscription Registry & MRR
          </h1>
          <p className="text-xs text-ink-secondary mt-1 font-semibold">Audit customer plan lifecycles, active trial allocations, and estimated MRR volume.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* MRR */}
        <div className="bg-white border border-[#EEE9E4] rounded-card p-6 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-secondary uppercase tracking-wider">Estimated MRR</span>
            <div className="p-2 rounded-lg bg-cream-50 text-ink-secondary border border-[#EEE9E4]/40">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-extrabold text-[#0A0A0A] tracking-tight">{formatCurrency(data?.mrr ?? 0)}</h3>
            <p className="text-[11px] text-ink-secondary mt-1 font-semibold">Aggregated from active subscriptions</p>
          </div>
        </div>

        {/* Active Premium */}
        <div className="bg-white border border-[#EEE9E4] rounded-card p-6 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-secondary uppercase tracking-wider">Active Plans</span>
            <div className="p-2 rounded-lg bg-cream-50 text-ink-secondary border border-[#EEE9E4]/40">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-extrabold text-[#0A0A0A] tracking-tight">{data?.activeCount ?? 0}</h3>
            <p className="text-[11px] text-ink-secondary mt-1 font-semibold">Paying customer accounts</p>
          </div>
        </div>

        {/* Trial accounts */}
        <div className="bg-white border border-[#EEE9E4] rounded-card p-6 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-secondary uppercase tracking-wider">Trialing Users</span>
            <div className="p-2 rounded-lg bg-cream-50 text-ink-secondary border border-[#EEE9E4]/40">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-extrabold text-[#0A0A0A] tracking-tight">{data?.trialCount ?? 0}</h3>
            <p className="text-[11px] text-ink-secondary mt-1 font-semibold">SaaS evaluation sessions</p>
          </div>
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white border border-[#EEE9E4] rounded-card p-4 shadow-card">
        {/* Search */}
        <div className="flex-1 relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by business name or email address..."
            className="w-full bg-cream-50 border border-[#EEE9E4] text-ink-primary placeholder:text-ink-secondary/70 shadow-soft rounded-pill pl-10 pr-4 py-2 text-xs font-semibold focus:outline-none"
          />
          <Search className="w-4 h-4 text-[#9B9B9B] absolute left-3.5 top-3" />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold text-ink-secondary tracking-wider">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-[#EEE9E4] text-ink-primary shadow-soft rounded-pill px-4 py-2 text-xs font-bold focus:outline-none cursor-pointer"
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
      <div className="bg-white border border-[#EEE9E4] rounded-card overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[#EEE9E4] bg-cream-50/50 text-[10px] font-bold text-ink-secondary uppercase tracking-widest">
                <th className="p-4">Business name</th>
                <th className="p-4">Assigned Tier</th>
                <th className="p-4">Billing Price</th>
                <th className="p-4">Status</th>
                <th className="p-4">Trial / Period Ends</th>
                <th className="p-4 text-center">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEE9E4]/60 text-xs font-semibold text-ink-primary">
              {filteredSubs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-20 text-ink-secondary italic">
                    No subscriptions match the applied status filters.
                  </td>
                </tr>
              ) : (
                filteredSubs.map((sub: any) => (
                  <tr key={sub.id} className="hover:bg-cream-50/30 transition-all">
                    <td className="p-4">
                      <div>
                        <p className="font-bold text-[#0A0A0A]">{sub.name}</p>
                        <span className="text-[10px] text-ink-secondary block mt-0.5">{sub.email || "No email"}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-[9px] font-bold uppercase bg-cream-100 border border-[#EEE9E4] px-2 py-0.5 rounded-pill text-ink-secondary">
                        {sub.plan}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-bold text-[#0A0A0A]">
                      {formatCurrency(sub.price)}/mo
                    </td>
                    <td className="p-4">
                      <span className={cn(
                        "px-2 py-0.5 rounded-pill text-[9px] font-bold uppercase tracking-wider border",
                        sub.status === "active" && "bg-[#E8F5E9] text-[#2E7D32] border-[#A5D6A7]/30",
                        sub.status === "trialing" && "bg-[#FFF8E1] text-[#F57F17] border-[#FFC107]/20",
                        sub.status !== "active" && sub.status !== "trialing" && "bg-[#FFEBEE] text-[#C62828] border-[#EF9A9A]/30"
                      )}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="p-4 text-ink-secondary">
                      {sub.status === "trialing" 
                        ? (sub.trial_ends ? `Trial Ends: ${formatDate(sub.trial_ends)}` : "N/A") 
                        : (sub.period_end ? `Period Ends: ${formatDate(sub.period_end)}` : "N/A")
                      }
                    </td>
                    <td className="p-4 text-center">
                      <Link
                        href={`/admin/businesses/${sub.id}`}
                        className="inline-flex items-center justify-center p-2 bg-white border border-[#EEE9E4] hover:bg-cream-50 rounded-pill text-ink-secondary hover:text-[#0A0A0A] transition-all shadow-soft cursor-pointer"
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
