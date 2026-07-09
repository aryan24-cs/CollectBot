"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { 
  IndianRupee, 
  FileText, 
  Users, 
  TrendingUp, 
  AlertTriangle,
  ArrowUpRight,
  Plus,
  Send,
  CheckCircle,
  FilePlus,
  Activity,
  Calendar,
  MessageSquare
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
import { Button, buttonVariants } from "@/components/ui/button"
import { formatCurrency, cn, getDaysOverdue } from "@/lib/utils"

export default function DashboardPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [mounted, setMounted] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)

  // Aggregated data states
  const [stats, setStats] = React.useState({
    totalInvoiced: 0,
    totalCollected: 0,
    outstanding: 0,
    overdueCount: 0,
  })

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

      // 2. Fetch Invoices for aggregation
      const { data: invoices, error: invError } = await supabase
        .from("invoices")
        .select(`
          id,
          total,
          amount_paid,
          balance_due,
          status,
          issue_date,
          due_date
        `)
        .eq("business_id", biz.id)

      if (invError) throw invError

      // 3. Fetch Recent Activity Logs
      const { data: logs, error: logsError } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("business_id", biz.id)
        .order("created_at", { ascending: false })
        .limit(6)

      if (logsError) throw logsError
      setRecentLogs(logs || [])

      // Perform calculation metrics
      let totalInvoiced = 0
      let totalCollected = 0
      let outstanding = 0
      let overdueCount = 0

      const currentMonth = new Date().getMonth()
      const currentYear = new Date().getFullYear()

      // Month buckets for the last 6 months chart
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      const last6MonthsBuckets: Record<string, { monthName: string; billed: number; collected: number; sortKey: number }> = {}

      // Initialize last 6 months
      for (let i = 5; i >= 0; i--) {
        const d = new Date()
        d.setMonth(d.getMonth() - i)
        const mName = months[d.getMonth()]
        const yearShort = d.getFullYear()
        const label = `${mName} ${yearShort}`
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
        const balanceVal = Number(inv.balance_due) || 0
        const invDate = new Date(inv.issue_date)

        // Summary calculations (lifetime totals & active outstanding balance)
        totalInvoiced += totalVal
        totalCollected += paidVal

        if (["sent", "viewed", "overdue", "partial"].includes(inv.status)) {
          outstanding += balanceVal
        }

        const daysOver = getDaysOverdue(inv.due_date)
        if (inv.status === "overdue" || (["sent", "viewed"].includes(inv.status) && daysOver > 0)) {
          overdueCount++
        }

        // Populate chart buckets if issue date matches one of our labels
        const mLabel = `${months[invDate.getMonth()]} ${invDate.getFullYear()}`
        if (last6MonthsBuckets[mLabel]) {
          last6MonthsBuckets[mLabel].billed += totalVal
          last6MonthsBuckets[mLabel].collected += paidVal
        }
      })

      setStats({
        totalInvoiced,
        totalCollected,
        outstanding,
        overdueCount,
      })

      // Sort chart labels chronologically
      const chartList = Object.values(last6MonthsBuckets).sort((a, b) => a.sortKey - b.sortKey)
      setChartData(chartList)

    } catch (err: any) {
      toast.error("Could not sync dashboard data.")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [supabase, router])

  React.useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  React.useEffect(() => {
    let channel: any
    async function setupRealtime() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: biz } = await supabase
        .from("businesses")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle()

      if (!biz) return

      const channelId = Math.random().toString(36).substring(7)
      channel = supabase
        .channel(`dashboard_realtime_${channelId}`)
        .on(
          "postgres_changes",
          { 
            event: "INSERT", 
            schema: "public", 
            table: "payments", 
            filter: `business_id=eq.${biz.id}` 
          },
          async (payload) => {
            await loadDashboardData()
            toast.success(`Payment received! ₹${Number(payload.new.amount).toLocaleString("en-IN")} via ${payload.new.payment_method}`)
          }
        )
        .on(
          "postgres_changes",
          { 
            event: "*", 
            schema: "public", 
            table: "invoices", 
            filter: `business_id=eq.${biz.id}` 
          },
          async () => {
            await loadDashboardData()
          }
        )
        .subscribe()
    }

    setupRealtime()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [supabase, loadDashboardData])

  // Get icons matching recent log types
  const getLogIcon = (type: string) => {
    switch (type) {
      case "invoice_created":
        return <FilePlus className="w-4.5 h-4.5 text-indigo-400" />
      case "invoice_sent":
        return <Send className="w-4.5 h-4.5 text-sky-400" />
      case "payment_received":
        return <CheckCircle className="w-4.5 h-4.5 text-emerald-400" />
      case "client_created":
        return <Users className="w-4.5 h-4.5 text-pink-400" />
      case "invoice_cancelled":
        return <AlertTriangle className="w-4.5 h-4.5 text-rose-400" />
      default:
        return <Activity className="w-4.5 h-4.5 text-slate-400" />
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse select-none">
        {/* Header skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-slate-900 rounded-lg"></div>
            <div className="h-4 w-64 bg-slate-900/60 rounded-lg"></div>
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-24 bg-slate-900 rounded-lg"></div>
            <div className="h-9 w-24 bg-slate-900 rounded-lg"></div>
          </div>
        </div>

        {/* Stats Grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="border border-slate-900 bg-slate-900/60 p-4 rounded-xl shadow-xl h-24 space-y-3">
              <div className="flex justify-between items-center">
                <div className="h-4 w-20 bg-slate-950 rounded"></div>
                <div className="h-7 w-7 bg-slate-950 rounded-lg"></div>
              </div>
              <div className="h-6 w-28 bg-slate-950 rounded"></div>
            </div>
          ))}
        </div>

        {/* Chart & Activity Grid skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 border border-slate-900 bg-slate-900/60 rounded-xl p-5 shadow-xl h-80 space-y-4">
            <div className="h-5 w-40 bg-slate-950 rounded"></div>
            <div className="h-56 bg-slate-950 rounded-lg"></div>
          </div>
          <div className="lg:col-span-4 border border-slate-900 bg-slate-900/60 rounded-xl p-5 shadow-xl h-80 space-y-4">
            <div className="h-5 w-40 bg-slate-950 rounded"></div>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex gap-3 items-center">
                  <div className="w-8 h-8 rounded-lg bg-slate-950 shrink-0"></div>
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3 w-32 bg-slate-950 rounded"></div>
                    <div className="h-2 w-20 bg-slate-950 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 select-none">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Dashboard</h1>
          <p className="text-slate-400 text-sm">
            Welcome back to <span className="text-indigo-400 font-semibold">{businessName}</span>. Workspace overview.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/invoices/new"
            className={cn(
              buttonVariants({ variant: "default" }),
              "bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white gap-2 shadow-lg shadow-indigo-500/10 text-xs"
            )}
          >
            <Plus className="w-4 h-4" />
            New Invoice
          </Link>
        </div>
      </div>

      {/* Stats Summary Cards Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-slate-900 border-slate-800 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-slate-400">Total Billed</CardTitle>
            <FileText className="w-4 h-4 text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{formatCurrency(stats.totalInvoiced)}</div>
            <p className="text-[10px] text-slate-500 mt-1">Lifetime invoicing volume</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-slate-400">Total Collected</CardTitle>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-emerald-400">{formatCurrency(stats.totalCollected)}</div>
            <p className="text-[10px] text-slate-500 mt-1">Cleared revenue</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-slate-400">Outstanding Balance</CardTitle>
            <IndianRupee className="w-4 h-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold font-mono", stats.outstanding > 0 ? "text-amber-400" : "text-slate-400")}>
              {formatCurrency(stats.outstanding)}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Awaiting client payment</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-slate-400">Overdue Invoices</CardTitle>
            <AlertTriangle className="w-4 h-4 text-rose-450" />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold font-mono", stats.overdueCount > 0 ? "text-rose-400 animate-pulse" : "text-slate-400")}>
              {stats.overdueCount}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Alert cycles active</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly chart visualizer & activity timelines */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Recharts chart block */}
        <Card className="col-span-4 bg-slate-900 border-slate-800 text-white shadow-xl">
          <CardHeader>
            <CardTitle className="text-base font-bold">Monthly Collection Overview</CardTitle>
            <CardDescription className="text-slate-400 text-xs">Comparison between billed amounts and received payments (Last 6 Months).</CardDescription>
          </CardHeader>
          <CardContent className="h-72 mt-2">
            {mounted && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="monthName" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000) + "k" : v}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px" }} 
                    labelStyle={{ color: "#ffffff", fontWeight: "bold", fontSize: "11px" }}
                    itemStyle={{ fontSize: "11px" }}
                  />
                  <Legend verticalAlign="top" height={36} iconSize={10} wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }} />
                  <Bar dataKey="billed" name="Billed Amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="collected" name="Collected" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-xs italic">
                Awaiting transaction events to populate overview graph.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent logs timelines */}
        <Card className="col-span-3 bg-slate-900 border-slate-800 text-white shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">Recent Activities</CardTitle>
              <CardDescription className="text-slate-400 text-xs">Audit logs of actions, payments, and clients.</CardDescription>
            </div>
            <Activity className="w-4 h-4 text-indigo-400" />
          </CardHeader>
          <CardContent className="p-0">
            {recentLogs.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-slate-500 text-xs italic">
                No recent activity logs recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60 overflow-y-auto max-h-[300px]">
                {recentLogs.map((log) => (
                  <div key={log.id} className="p-3.5 hover:bg-slate-800/10 transition-colors flex gap-3.5 items-start">
                    <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex-shrink-0 mt-0.5">
                      {getLogIcon(log.type)}
                    </div>
                    <div className="space-y-0.5 min-w-0 flex-grow">
                      <p className="text-xs text-slate-200 leading-snug">{log.description}</p>
                      <span className="text-[10px] text-slate-500 block font-mono">{new Date(log.created_at).toLocaleString("en-IN", { hour: "numeric", minute: "numeric", hour12: true, month: "short", day: "numeric" })}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Loader2(props: React.ComponentProps<"svg">) {
  return (
    <svg
      className={props.className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}
