"use client"

import * as React from "react"
import { 
  Building2, 
  FileText, 
  CreditCard, 
  TrendingUp, 
  Activity, 
  RefreshCw, 
  Loader2, 
  ArrowRight,
  ShieldCheck,
  Calendar,
  Layers,
  Sparkles,
  Clock
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { formatCurrency, formatDate, cn } from "@/lib/utils"
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"

interface StatCardProps {
  title: string
  value: string | number
  subText: string
  icon: React.ReactNode
  color: string
  bgLight: string
}

function StatCard({ title, value, subText, icon, color, bgLight }: StatCardProps) {
  return (
    <div 
      className="bg-white border border-[#EEE9E4] rounded-card p-6 shadow-card hover:shadow-floating transition-all duration-300 flex flex-col justify-between h-40 group relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-cream-100/50 to-transparent rounded-bl-full pointer-events-none" />
      
      <div className="flex items-start justify-between relative z-10">
        <span className="text-[10px] uppercase font-bold tracking-wider text-ink-secondary">{title}</span>
        <div className={cn("p-2.5 rounded-xl transition-all duration-300 shadow-sm border border-transparent group-hover:scale-110", bgLight, color)}>
          {icon}
        </div>
      </div>
      <div className="relative z-10 mt-4">
        <h3 className="text-2xl font-bold text-[#0A0A0A] tracking-tight leading-none font-display">{value}</h3>
        <p className="text-[10px] text-ink-secondary mt-2.5 font-semibold flex items-center gap-1">
          <span className={cn("w-1.5 h-1.5 rounded-full inline-block", color.split(" ")[0].replace("text-", "bg-"))} />
          {subText}
        </p>
      </div>
    </div>
  )
}

export default function AdminOverviewPage() {
  const [statsData, setStatsData] = React.useState<any>(null)
  const [logsData, setLogsData] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)

  const fetchStatsAndLogs = async (showRefreshToast = false) => {
    try {
      if (showRefreshToast) setIsRefreshing(true)
      
      const [statsRes, logsRes] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/admin/logs?limit=6")
      ])

      if (!statsRes.ok) throw new Error("Failed to load statistics.")
      const statsJson = await statsRes.ok ? await statsRes.json() : null
      const logsJson = await logsRes.ok ? await logsRes.json() : null

      setStatsData(statsJson)
      setLogsData(logsJson?.logs || [])
      
      if (showRefreshToast) toast.success("Dashboard metrics updated.")
    } catch (err: any) {
      toast.error(err.message || "An error occurred fetching dashboard metrics.")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  React.useEffect(() => {
    setMounted(true)
    fetchStatsAndLogs()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-ink-secondary animate-pulse">
        <Loader2 className="w-10 h-10 text-[#E91E63] animate-spin mb-4" />
        <p className="text-xs font-semibold">Aggregating platform audit logs and metrics...</p>
      </div>
    )
  }

  const freeCount = statsData?.planDistribution?.free || 0
  const soloCount = statsData?.planDistribution?.solo || 0
  const businessCount = statsData?.planDistribution?.business || 0
  const scaleCount = statsData?.planDistribution?.scale || 0
  const totalSubs = freeCount + soloCount + businessCount + scaleCount || 1

  // Format Recharts data dates for visual simplicity
  const chartData = statsData?.growthData?.map((item: any) => {
    const parts = item.date.split("-")
    return {
      name: parts.length === 3 ? `${parts[2]}/${parts[1]}` : item.date,
      Registrations: item.count
    }
  }) || []

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10 select-none text-ink-primary">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#EEE9E4] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-[#0A0A0A] leading-none font-display">Console Overview</h1>
            <div className="flex items-center gap-1.5 bg-[#FAF8F5] border border-[#EEE9E4] px-2.5 py-1 rounded-pill">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E91E63] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E91E63]"></span>
              </span>
              <span className="text-[9px] text-ink-secondary font-bold uppercase tracking-wider">Telemetry Sync Live</span>
            </div>
          </div>
          <p className="text-ink-secondary text-xs mt-2 font-semibold">Real-time system health metrics, plan allocations, and activity telemetry.</p>
        </div>
        
        <button
          onClick={() => fetchStatsAndLogs(true)}
          disabled={isRefreshing}
          className="self-start sm:self-center p-2.5 bg-white border border-[#EEE9E4] hover:bg-cream-50 rounded-xl text-ink-secondary hover:text-[#0A0A0A] transition-all disabled:opacity-50 cursor-pointer shadow-soft outline-none focus:ring-1 focus:ring-[#E91E63]/40 flex items-center gap-1.5 text-xs font-bold"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin text-[#E91E63]")} />
          {isRefreshing ? "Syncing..." : "Sync Metrics"}
        </button>
      </div>

      {/* Main KPI Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Businesses"
          value={statsData?.totalBusinesses ?? 0}
          subText={`+${statsData?.newBusinessesThisWeek ?? 0} registrations this week`}
          icon={<Building2 className="w-4 h-4" />}
          color="text-[#E91E63]"
          bgLight="bg-[#FDF2F7]"
        />
        <StatCard
          title="Active Subscriptions"
          value={statsData?.activeSubscriptions ?? 0}
          subText="Premium SaaS accounts enabled"
          icon={<TrendingUp className="w-4 h-4" />}
          color="text-[#2E7D32]"
          bgLight="bg-[#E8F5E9]"
        />
        <StatCard
          title="Invoices Generated"
          value={statsData?.totalInvoices ?? 0}
          subText={`${statsData?.invoicesToday ?? 0} issued today`}
          icon={<FileText className="w-4 h-4" />}
          color="text-[#1976D2]"
          bgLight="bg-[#E3F2FD]"
        />
        <StatCard
          title="CollectBot Volume"
          value={formatCurrency(statsData?.totalPaymentVolume ?? 0)}
          subText="Platform gross checkout value"
          icon={<CreditCard className="w-4 h-4" />}
          color="text-[#F57F17]"
          bgLight="bg-[#FFF8E1]"
        />
      </div>

      {/* Area Chart: Platform Growth */}
      {mounted && chartData.length > 0 && (
        <div className="bg-white border border-[#EEE9E4] rounded-card p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-[#EEE9E4]/60 pb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0A0A0A] flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#E91E63]" />
                Platform Signups Growth Trend
              </h3>
              <p className="text-[10px] text-ink-secondary mt-0.5 font-medium">Daily registration frequencies captured across the past 30 days.</p>
            </div>
            <div className="text-[10px] text-ink-secondary bg-[#FAF8F5] px-2.5 py-1 rounded-pill font-bold border border-[#EEE9E4]/50">
              30 Days Snapshot
            </div>
          </div>
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRegistrations" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E91E63" stopOpacity={0.12}/>
                    <stop offset="95%" stopColor="#E91E63" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="name" 
                  stroke="#9B9B9B" 
                  fontSize={9} 
                  tickLine={false} 
                  axisLine={{ stroke: '#EEE9E4' }} 
                  dy={10}
                />
                <YAxis 
                  stroke="#9B9B9B" 
                  fontSize={9} 
                  tickLine={false} 
                  axisLine={{ stroke: '#EEE9E4' }} 
                  allowDecimals={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#FFFFFF', 
                    border: '1px solid #EEE9E4', 
                    borderRadius: '12px', 
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
                    fontSize: '11px',
                    fontFamily: 'inherit',
                    fontWeight: 'bold',
                    color: '#1A1A1A'
                  }}
                  cursor={{ stroke: '#EEE9E4', strokeWidth: 1 }}
                />
                <Area 
                  type="monotone" 
                  dataKey="Registrations" 
                  stroke="#E91E63" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#colorRegistrations)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Content Columns split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Plan Allocation & Lists */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Subscriptions Allocations */}
          <div className="bg-white border border-[#EEE9E4] rounded-card p-6 shadow-card space-y-5">
            <div className="flex justify-between items-center border-b border-[#EEE9E4]/60 pb-3.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0A0A0A]">Subscription distribution</h3>
              <span className="text-[9px] text-ink-secondary font-bold">Total: {totalSubs}</span>
            </div>
            
            <div className="space-y-4 pt-1">
              {[
                { name: "Free Tier", count: freeCount, color: "bg-[#9CA3AF]", border: "border-[#374151]/20", pct: `${Math.round((freeCount / totalSubs) * 100)}%` },
                { name: "Solo Tier", count: soloCount, color: "bg-[#4CAF50]", border: "border-[#4CAF50]/20", pct: `${Math.round((soloCount / totalSubs) * 100)}%` },
                { name: "Business Tier", count: businessCount, color: "bg-[#FFF8E1]", pct: `${Math.round((businessCount / totalSubs) * 100)}%` },
                { name: "Scale Tier", count: scaleCount, color: "bg-[#E91E63]", pct: `${Math.round((scaleCount / totalSubs) * 100)}%` },
              ].map((plan, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-semibold text-ink-secondary">
                    <span className="flex items-center gap-1.5">
                      <span className={cn("w-2 h-2 rounded-full", plan.color)} />
                      {plan.name}
                    </span>
                    <span className="text-[#0A0A0A] font-extrabold">{plan.count} ({plan.pct})</span>
                  </div>
                  <div className="w-full bg-[#FAF8F5] h-2 rounded-full overflow-hidden border border-[#EEE9E4]/65">
                    <div className={cn("h-full rounded-full", plan.color)} style={{ width: plan.pct }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* New Registrations Quick-view */}
          <div className="bg-white border border-[#EEE9E4] rounded-card p-6 shadow-card space-y-4">
            <div className="flex justify-between items-center border-b border-[#EEE9E4]/60 pb-3.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0A0A0A]">Recent Registrations</h3>
              <Link href="/admin/businesses" className="text-[9px] text-[#E91E63] font-bold hover:underline flex items-center gap-1 uppercase tracking-wider">
                Full list <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            
            <div className="space-y-3 pt-1">
              {statsData?.recentBusinesses?.length === 0 ? (
                <p className="text-xs text-ink-secondary italic py-3 text-center">No registrations logged in this snapshot.</p>
              ) : (
                statsData?.recentBusinesses?.slice(0, 5).map((biz: any) => (
                  <div key={biz.id} className="flex justify-between items-center border-b border-[#EEE9E4]/30 pb-2 last:border-b-0">
                    <div>
                      <p className="text-xs font-bold text-[#0A0A0A] leading-normal">{biz.name}</p>
                      <span className="text-[10px] text-ink-secondary font-medium block mt-0.5">{biz.email || "No email"} • {biz.city || "Online"}</span>
                    </div>
                    <span className="text-[9px] text-ink-secondary bg-cream-100 border border-[#EEE9E4]/60 px-2 py-0.5 rounded-pill font-mono">
                      {formatDate(biz.created_at)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Platform Telemetry Activity */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-[#EEE9E4] rounded-card p-6 shadow-card space-y-4">
            <div className="flex justify-between items-center border-b border-[#EEE9E4]/60 pb-3.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0A0A0A]">Platform telemetry log</h3>
              <Activity className="w-4 h-4 text-[#E91E63]" />
            </div>

            {/* Audit log Timeline */}
            <div className="relative pl-4 border-l border-[#EEE9E4] ml-2.5 py-2 space-y-5 pt-1 max-h-[500px] overflow-y-auto pr-1">
              {logsData.length === 0 ? (
                <p className="text-xs text-ink-secondary italic py-3 text-center -ml-4 border-none">No platform activity logs captured.</p>
              ) : (
                logsData.map((log: any) => (
                  <div key={log.id} className="relative space-y-1">
                    {/* Circle timeline dot */}
                    <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-white border-2 border-[#E91E63]" />
                    
                    <div className="bg-[#FAF8F5] border border-[#EEE9E4]/40 rounded-xl p-3.5 shadow-sm space-y-2 hover:border-ink-secondary/30 transition-all duration-200">
                      <div className="flex justify-between items-start">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-[#E91E63] bg-[#FDF2F7] px-2 py-0.5 rounded-pill border border-[#F8BBD9]/20">
                          {log.action.replace(/_/g, " ")}
                        </span>
                        <span className="text-[9px] text-ink-secondary font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(log.created_at).toLocaleString("en-IN", { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      
                      <p className="text-xs font-semibold text-[#0A0A0A] leading-relaxed">{log.description}</p>
                      
                      <div className="flex items-center justify-between text-[9px] text-ink-secondary border-t border-[#EEE9E4]/40 pt-2 mt-2">
                        <span>Admin: <strong className="text-ink-primary">{log.admin_users?.name || "System"}</strong></span>
                        <span className="font-mono">IP: {log.ip_address || "Internal"}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
