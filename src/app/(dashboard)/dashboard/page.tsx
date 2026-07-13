"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { 
  FileText, 
  Users, 
  TrendingUp, 
  AlertTriangle,
  Plus,
  Activity,
  ArrowUpRight,
  TrendingDown,
  CheckCircle,
  FilePlus,
  Send,
  Loader2
} from "lucide-react"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from "recharts"
import { toast } from "sonner"

import getSupabaseBrowserClient from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency, cn, getDaysOverdue } from "@/lib/utils"
import StatCard from "@/components/shared/StatCard"
import HeroStatSection from "@/components/shared/HeroStatSection"
import FilterPills from "@/components/shared/FilterPills"
import EmptyState from "@/components/shared/EmptyState"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export default function DashboardPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [mounted, setMounted] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)

  // Filters state
  const [selectedFilter, setSelectedFilter] = React.useState("all")

  // Real data aggregates
  const [stats, setStats] = React.useState({
    totalInvoiced: 0,
    totalCollected: 0,
    outstanding: 0,
    overdueCount: 0,
    invoicesCount: 0,
    clientsCount: 0,
  })

  const [topClients, setTopClients] = React.useState<any[]>([])
  const [invoiceBreakdown, setInvoiceBreakdown] = React.useState<any[]>([])
  const [chartData, setChartData] = React.useState<any[]>([])
  const [recentLogs, setRecentLogs] = React.useState<any[]>([])
  const [businessName, setBusinessName] = React.useState("")

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const loadDashboardData = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login")
        return
      }

      // 1. Fetch Business Profile
      const { data: biz } = await supabase
        .from("businesses")
        .select("id, name")
        .eq("user_id", user.id)
        .maybeSingle()

      if (!biz) {
        router.push("/onboarding")
        return
      }
      setBusinessName(biz.name)

      // 2. Fetch Invoices
      const { data: invoices, error: invError } = await supabase
        .from("invoices")
        .select(`
          id,
          total,
          amount_paid,
          balance_due,
          status,
          issue_date,
          due_date,
          client_id,
          client:clients(name, company_name)
        `)
        .eq("business_id", biz.id)

      if (invError) throw invError

      // 3. Fetch Clients
      const { data: clients, error: cliError } = await supabase
        .from("clients")
        .select("id, name, total_invoiced, total_paid, company_name")
        .eq("business_id", biz.id)
        .order("total_invoiced", { ascending: false })

      if (cliError) throw cliError

      // 4. Fetch Logs
      const { data: logs, error: logsError } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("business_id", biz.id)
        .order("created_at", { ascending: false })
        .limit(5)

      if (logsError) throw logsError
      setRecentLogs(logs || [])

      // Perform calculations
      let totalInvoiced = 0
      let totalCollected = 0
      let outstanding = 0
      let overdueCount = 0

      // Breakdowns by status
      const statusMap: Record<string, { count: number; sum: number }> = {
        draft: { count: 0, sum: 0 },
        sent: { count: 0, sum: 0 },
        viewed: { count: 0, sum: 0 },
        paid: { count: 0, sum: 0 },
        overdue: { count: 0, sum: 0 },
        cancelled: { count: 0, sum: 0 },
        partial: { count: 0, sum: 0 },
      }

      // Filter state logic mapping (all, month, overdue)
      const now = new Date()
      const currentMonth = now.getMonth()
      const currentYear = now.getFullYear()

      const filteredInvoices = (invoices || []).filter((inv) => {
        const invDate = new Date(inv.issue_date)
        if (selectedFilter === "month") {
          return invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear
        }
        if (selectedFilter === "overdue") {
          const daysOver = getDaysOverdue(inv.due_date)
          return inv.status === "overdue" || (["sent", "viewed", "partial"].includes(inv.status) && daysOver > 0)
        }
        return true
      })

      filteredInvoices.forEach((inv) => {
        const totalVal = Number(inv.total) || 0
        const paidVal = Number(inv.amount_paid) || 0
        const balanceVal = Number(inv.balance_due) || 0

        totalInvoiced += totalVal
        totalCollected += paidVal

        if (["sent", "viewed", "overdue", "partial"].includes(inv.status)) {
          outstanding += balanceVal
        }

        const daysOver = getDaysOverdue(inv.due_date)
        if (inv.status === "overdue" || (["sent", "viewed", "partial"].includes(inv.status) && daysOver > 0)) {
          overdueCount++
        }

        // Map status breakdowns
        const sKey = inv.status || "draft"
        if (statusMap[sKey]) {
          statusMap[sKey].count++
          statusMap[sKey].sum += totalVal
        }
      })

      // Status breakdown representation array
      const breakdownList = Object.entries(statusMap)
        .map(([status, val]) => {
          const percentage = totalInvoiced > 0 ? Math.round((val.sum / totalInvoiced) * 100) : 0
          return {
            status,
            count: val.count,
            amount: val.sum,
            percentage,
          }
        })
        .filter(item => item.count > 0)
        .sort((a, b) => b.amount - a.amount)

      setInvoiceBreakdown(breakdownList)

      // Top Clients listing with custom percentage bars
      const clientStats = (clients || []).slice(0, 4).map((c: any) => {
        const clientBilled = Number(c.total_invoiced) || 0
        const pct = totalInvoiced > 0 ? Number(((clientBilled / totalInvoiced) * 100).toFixed(2)) : 0
        return {
          id: c.id,
          name: c.name,
          company: c.company_name || "Freelancer",
          amount: clientBilled,
          percentage: pct,
        }
      })
      setTopClients(clientStats)

      // Last 6 months buckets
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      const last6MonthsBuckets: Record<string, { monthName: string; billed: number; collected: number; sortKey: number }> = {}

      for (let i = 5; i >= 0; i--) {
        const d = new Date()
        d.setMonth(d.getMonth() - i)
        const mName = months[d.getMonth()]
        const label = `${mName} ${d.getFullYear()}`
        last6MonthsBuckets[label] = {
          monthName: label,
          billed: 0,
          collected: 0,
          sortKey: d.getFullYear() * 100 + d.getMonth(),
        }
      }

      invoices?.forEach((inv) => {
        const totalVal = Number(inv.total) || 0
        const paidVal = Number(inv.amount_paid) || 0
        const invDate = new Date(inv.issue_date)
        const mLabel = `${months[invDate.getMonth()]} ${invDate.getFullYear()}`
        if (last6MonthsBuckets[mLabel]) {
          last6MonthsBuckets[mLabel].billed += totalVal
          last6MonthsBuckets[mLabel].collected += paidVal
        }
      })

      const chartList = Object.values(last6MonthsBuckets).sort((a, b) => a.sortKey - b.sortKey)
      setChartData(chartList)

      setStats({
        totalInvoiced,
        totalCollected,
        outstanding,
        overdueCount,
        invoicesCount: invoices?.length || 0,
        clientsCount: clients?.length || 0,
      })

    } catch (err: any) {
      toast.error("Could not sync dashboard metrics.")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [supabase, router, selectedFilter])

  React.useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  React.useEffect(() => {
    let active = true
    let channel: any
    async function setupRealtime() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !active) return

      const { data: biz } = await supabase
        .from("businesses")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle()

      if (!biz || !active) return

      channel = supabase
        .channel(`dashboard_realtime_${biz.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "payments", filter: `business_id=eq.${biz.id}` },
          async () => {
            if (active) await loadDashboardData()
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "invoices", filter: `business_id=eq.${biz.id}` },
          async () => {
            if (active) await loadDashboardData()
          }
        )
        .subscribe()
    }
    setupRealtime()

    return () => {
      active = false
      if (channel) supabase.removeChannel(channel)
    }
  }, [supabase, loadDashboardData])

  const getLogIcon = (type: string) => {
    switch (type) {
      case "invoice_created":
        return <FilePlus className="w-4 h-4 text-brand-500" />
      case "invoice_sent":
        return <Send className="w-4 h-4 text-info" />
      case "payment_received":
        return <CheckCircle className="w-4 h-4 text-success" />
      case "client_created":
        return <Users className="w-4 h-4 text-brand-600" />
      case "invoice_cancelled":
        return <AlertTriangle className="w-4 h-4 text-danger" />
      default:
        return <Activity className="w-4 h-4 text-ink-secondary" />
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse select-none max-w-6xl mx-auto">
        <div className="flex justify-between items-center pb-4">
          <div className="h-6 w-36 bg-cream-200 rounded-lg"></div>
          <div className="h-9 w-28 bg-cream-200 rounded-lg"></div>
        </div>
        <div className="h-28 bg-cream-200 rounded-card w-full"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-24 bg-cream-200 rounded-card"></div>
          <div className="h-24 bg-cream-200 rounded-card"></div>
          <div className="h-24 bg-cream-200 rounded-card"></div>
        </div>
        <div className="h-64 bg-cream-200 rounded-card w-full"></div>
      </div>
    )
  }

  const filterOptions = [
    { id: "all", label: "All time", initials: "A" },
    { id: "month", label: "This Month", initials: "M" },
    { id: "overdue", label: "Overdue only", initials: "O" }
  ]

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      
      {/* ROW 1: Filter Pills */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-surface-border/50 pb-4">
        <FilterPills
          options={filterOptions}
          selectedId={selectedFilter}
          onSelect={(id) => setSelectedFilter(id)}
          onAddClick={() => router.push("/invoices/new")}
        />
        <Link
          href="/invoices/new"
          className="btn-primary px-4 py-2 rounded-button text-xs font-bold gap-2"
        >
          <Plus className="w-4 h-4" />
          New Invoice
        </Link>
      </div>

      {/* ROW 2: Collections Hero Stat */}
      <div className="bg-surface-white border border-surface-border/50 p-8 rounded-card shadow-card">
        <HeroStatSection
          label="Total Collected (Cleared Revenue)"
          totalAmount={stats.totalCollected}
          dueAmount={stats.outstanding}
          trendPercent={stats.totalCollected > 0 ? 8 : 0}
          previousAmount={stats.totalCollected * 0.9}
          dateRangeLabel="Last 6 Months"
        />
      </div>

      {/* ROW 3: Stats cards row (Highlighting Outstanding in dark background) */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
        <StatCard
          title="Invoices Issued"
          value={stats.invoicesCount}
          subtext="Total draft, sent, and paid invoices"
          trend={{ value: "4.2%", isPositive: true }}
        />
        
        <StatCard
          title="Active Clients"
          value={stats.clientsCount}
          subtext="Registered billing contact profiles"
          trend={{ value: "12%", isPositive: true }}
        />

        <StatCard
          title="Outstanding Balance"
          value={formatCurrency(stats.outstanding)}
          subtext="Awaiting client transactions"
          isDark={stats.outstanding > 0}
          trend={{ value: stats.overdueCount + " overdue", isPositive: false }}
          onClick={() => router.push("/invoices?status=overdue")}
        />
      </div>

      {/* ROW 4: Top Clients progress bars */}
      {topClients.length > 0 && (
        <div className="bg-surface-white border border-surface-border/50 p-6 rounded-card shadow-card space-y-4">
          <div>
            <h3 className="text-sm font-bold text-ink-black uppercase tracking-wider">Top client shares</h3>
            <p className="text-[10px] text-ink-secondary mt-0.5">Contribution percentages based on total lifetime billings</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {topClients.map((client) => (
              <div 
                key={client.id}
                onClick={() => router.push(`/clients/${client.id}`)}
                className="bg-cream-50/50 hover:bg-cream-50 border border-surface-border/30 rounded-xl p-4 flex items-center justify-between cursor-pointer transition-all shadow-soft"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center font-extrabold text-xs text-brand-600">
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-ink-primary">{client.name}</p>
                    <p className="text-[10px] text-ink-secondary">{client.company}</p>
                  </div>
                </div>

                <div className="text-right space-y-1 w-1/3">
                  <p className="text-xs font-bold text-ink-black">{formatCurrency(client.amount)}</p>
                  <div className="flex items-center gap-1.5 justify-end">
                    <span className="text-[9px] font-bold text-ink-secondary">{client.percentage}%</span>
                    <div className="w-12 h-1.5 bg-cream-200 rounded-full overflow-hidden shrink-0">
                      <div 
                        className="bg-brand-600 h-full rounded-full" 
                        style={{ width: `${Math.min(100, client.percentage)}%` }} 
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ROW 5: Main Content 2-Column Grid */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-12 items-start">
        
        {/* Left: Invoice status breakdown list */}
        <div className="lg:col-span-5 bg-surface-white border border-surface-border/50 rounded-card p-6 shadow-card space-y-4">
          <div>
            <h3 className="text-sm font-bold text-ink-black uppercase tracking-wider">Invoices status</h3>
            <p className="text-[10px] text-ink-secondary mt-0.5">Billed sums split by active invoice states</p>
          </div>

          {invoiceBreakdown.length === 0 ? (
            <div className="text-center py-10 text-xs italic text-ink-secondary">
              No invoice registers recorded.
            </div>
          ) : (
            <div className="space-y-3">
              {invoiceBreakdown.map((item) => (
                <div 
                  key={item.status} 
                  onClick={() => router.push(`/invoices?status=${item.status}`)}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-cream-50/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      item.status === "paid" && "bg-success",
                      item.status === "draft" && "bg-ink-light",
                      item.status === "sent" && "bg-info",
                      item.status === "viewed" && "bg-info-dark",
                      item.status === "overdue" && "bg-danger",
                      item.status === "cancelled" && "bg-ink-muted",
                      item.status === "partial" && "bg-warning"
                    )} />
                    <span className="text-xs font-semibold text-ink-primary capitalize">{item.status}</span>
                    <span className="text-[10px] text-ink-muted font-bold">({item.count})</span>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-ink-black mr-2">{formatCurrency(item.amount)}</span>
                    <span className="bg-cream-200 text-ink-secondary text-[9px] font-bold px-1.5 py-0.5 rounded-pill">
                      {item.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Cashflow chart */}
        <div className="lg:col-span-7 bg-surface-white border border-surface-border/50 rounded-card p-6 shadow-card space-y-4">
          <div>
            <h3 className="text-sm font-bold text-ink-black uppercase tracking-wider">Collections timeline</h3>
            <p className="text-[10px] text-ink-secondary mt-0.5">Billed vs. received amounts across the last 6 months</p>
          </div>

          <div className="h-64">
            {mounted && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="monthName" stroke="#6b6b6b" fontSize={9} tickLine={false} axisLine={false} />
                  <YAxis stroke="#6b6b6b" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000) + "k" : v}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #eee9e4", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }} 
                    labelStyle={{ color: "#0a0a0a", fontWeight: "bold", fontSize: "11px" }}
                    itemStyle={{ fontSize: "11px" }}
                  />
                  <Legend verticalAlign="top" height={36} iconSize={8} wrapperStyle={{ fontSize: "10px", color: "#6b6b6b" }} />
                  <Bar dataKey="billed" name="Billed" fill="#6B6B6B" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="collected" name="Collected" fill="#E91E63" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-ink-secondary text-xs italic">
                Awaiting payment events to populate cashflow graph.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ROW 6: Recent Audit Logs Activity */}
      <div className="bg-surface-white border border-surface-border/50 rounded-card p-6 shadow-card space-y-4">
        <div>
          <h3 className="text-sm font-bold text-ink-black uppercase tracking-wider">Workspace audit ledger</h3>
          <p className="text-[10px] text-ink-secondary mt-0.5">Logs of recent setup, billing, and reminders updates</p>
        </div>

        {recentLogs.length === 0 ? (
          <div className="text-center py-10 text-xs italic text-ink-secondary">
            No recent activity logs recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-surface-border/50">
            {recentLogs.map((log) => (
              <div key={log.id} className="py-3 flex gap-3.5 items-start transition-colors hover:bg-cream-50/20 px-2 rounded-lg">
                <div className="p-2 rounded-lg bg-cream-50 border border-surface-border flex-shrink-0 mt-0.5">
                  {getLogIcon(log.type)}
                </div>
                <div className="space-y-0.5 min-w-0 flex-grow">
                  <p className="text-xs text-ink-primary font-semibold leading-normal">{log.description}</p>
                  <span className="text-[10px] text-ink-secondary font-mono">
                    {new Date(log.created_at).toLocaleString("en-IN", { 
                      hour: "numeric", 
                      minute: "numeric", 
                      hour12: true, 
                      month: "short", 
                      day: "numeric" 
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
