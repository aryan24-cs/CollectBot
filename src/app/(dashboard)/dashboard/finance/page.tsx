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
  Loader2,
  DollarSign
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

export default function FinanceDashboardPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [mounted, setMounted] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)
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

      // Check if employee
      const { data: empRecord } = await supabase
        .from("employees")
        .select("id, business_id, business:businesses(id, name)")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle()

      if (!empRecord || !empRecord.business) {
        router.push("/onboarding")
        return
      }

      const business = empRecord.business as any
      setBusinessName(business.name)

      // Fetch Invoices
      const { data: invoices, error: invError } = await supabase
        .from("invoices")
        .select(`
          id,
          total,
          amount_paid,
          balance_due,
          status,
          due_date,
          created_at,
          client:clients(id, name, email)
        `)
        .eq("business_id", business.id)

      if (invError) throw invError

      // Fetch Clients
      const { data: clients } = await supabase
        .from("clients")
        .select("id")
        .eq("business_id", business.id)

      const clientCount = clients?.length || 0

      // Compute stats
      let totalInvoiced = 0
      let totalCollected = 0
      let outstanding = 0
      let overdueCount = 0
      const list = invoices || []

      list.forEach((inv) => {
        totalInvoiced += Number(inv.total || 0)
        totalCollected += Number(inv.amount_paid || 0)
        outstanding += Number(inv.balance_due || 0)

        // Check if overdue
        if (["sent", "viewed", "partial"].includes(inv.status)) {
          const days = getDaysOverdue(inv.due_date)
          if (days > 0) {
            overdueCount++
          }
        } else if (inv.status === "overdue") {
          overdueCount++
        }
      })

      setStats({
        totalInvoiced,
        totalCollected,
        outstanding,
        overdueCount,
        invoicesCount: list.length,
        clientsCount: clientCount,
      })

      // Recent activity
      const { data: logs } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("business_id", business.id)
        .order("created_at", { ascending: false })
        .limit(5)

      setRecentLogs(logs || [])

      // Recharts month calculation
      const monthlyAggregates: Record<string, { name: string; billed: number; collected: number }> = {}
      list.forEach(inv => {
        const d = new Date(inv.created_at)
        const monthLabel = d.toLocaleString("default", { month: "short" })
        if (!monthlyAggregates[monthLabel]) {
          monthlyAggregates[monthLabel] = { name: monthLabel, billed: 0, collected: 0 }
        }
        monthlyAggregates[monthLabel].billed += Number(inv.total || 0)
        monthlyAggregates[monthLabel].collected += Number(inv.amount_paid || 0)
      })

      setChartData(Object.values(monthlyAggregates))
      setInvoiceBreakdown(list.slice(0, 5))
    } catch (err: any) {
      toast.error(err.message || "Failed to load dashboard data.")
    } finally {
      setIsLoading(false)
    }
  }, [supabase, router])

  React.useEffect(() => {
    if (mounted) {
      loadDashboardData()
    }
  }, [mounted, loadDashboardData])

  if (!mounted) return null

  return (
    <div className="space-y-6 select-none max-w-6xl mx-auto pb-12">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-surface-border/50 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink-black leading-tight">Finance Portal</h1>
          <p className="text-ink-secondary text-sm mt-1">Workspace for: <strong className="text-ink-black">{businessName}</strong></p>
        </div>
        <div className="flex gap-2">
          <Link href="/invoices/new" className="btn-primary px-5 py-2.5 rounded-button text-xs font-bold gap-2 shadow-soft flex items-center shrink-0 cursor-pointer">
            <Plus className="w-4 h-4" />
            Create Invoice
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-2 bg-white rounded-card border border-[#EEE9E4]">
          <Loader2 className="w-8 h-8 animate-spin text-[#E91E63]" />
          <p className="text-xs text-ink-secondary font-bold uppercase tracking-wider">Syncing finance records…</p>
        </div>
      ) : (
        <>
          {/* Main Hero stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Billed" value={formatCurrency(stats.totalInvoiced)} icon={<FileText className="w-4 h-4 text-blue-600" />} />
            <StatCard title="Collected Amount" value={formatCurrency(stats.totalCollected)} icon={<CheckCircle className="w-4 h-4 text-emerald-600" />} />
            <StatCard title="Outstanding Balance" value={formatCurrency(stats.outstanding)} icon={<TrendingUp className="w-4 h-4 text-amber-600" />} />
            <StatCard title="Overdue Invoices" value={stats.overdueCount.toString()} icon={<AlertTriangle className="w-4 h-4 text-red-600" />} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart */}
            <Card className="lg:col-span-2 bg-white border-[#EEE9E4] shadow-card">
              <CardHeader>
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-ink-black">Billed vs Collected Analysis</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1EDE9" />
                    <XAxis dataKey="name" stroke="#8C837B" fontSize={10} />
                    <YAxis stroke="#8C837B" fontSize={10} />
                    <Tooltip cursor={{ fill: "#FAF8F5" }} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="billed" name="Total Billed (₹)" fill="#E91E63" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="collected" name="Collected (₹)" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="bg-white border-[#EEE9E4] shadow-card">
              <CardHeader>
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-ink-black">Activity Logs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 border-b border-cream-100 pb-3 last:border-b-0 last:pb-0">
                      <div className="w-6 h-6 rounded-full bg-cream-100 flex items-center justify-center shrink-0">
                        <Activity className="w-3.5 h-3.5 text-ink-secondary" />
                      </div>
                      <div>
                        <p className="text-[10px] text-ink-black font-semibold">{log.description}</p>
                        <span className="text-[8px] text-ink-secondary font-mono">{new Date(log.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                  {recentLogs.length === 0 && (
                    <EmptyState 
                      title="No activity logged" 
                      description="Activity events will populate here once updates occur." 
                      icon={Activity}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Transactions details */}
          <Card className="bg-white border-[#EEE9E4] shadow-card">
            <CardHeader>
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-ink-black">Recent Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#EEE9E4] pb-2 text-[10px] font-bold uppercase tracking-wider text-ink-secondary">
                      <th className="py-2.5">Client Name</th>
                      <th className="py-2.5">Total Amount</th>
                      <th className="py-2.5">Amount Paid</th>
                      <th className="py-2.5">Status</th>
                      <th className="py-2.5">Due Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceBreakdown.map((inv) => (
                      <tr key={inv.id} className="border-b border-cream-100 last:border-b-0 hover:bg-cream-50/20 transition-colors">
                        <td className="py-3 font-semibold text-ink-black">{inv.client?.name || "Deleted Client"}</td>
                        <td className="py-3 font-mono font-bold text-ink-primary">₹{Number(inv.total).toLocaleString()}</td>
                        <td className="py-3 font-mono text-emerald-600">₹{Number(inv.amount_paid).toLocaleString()}</td>
                        <td className="py-3 capitalize">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider",
                            inv.status === "paid" && "bg-emerald-50 border border-emerald-200 text-emerald-700",
                            inv.status === "draft" && "bg-cream-100 border border-cream-200 text-ink-secondary",
                            ["sent", "viewed"].includes(inv.status) && "bg-blue-50 border border-blue-200 text-blue-700",
                            inv.status === "overdue" && "bg-red-50 border border-red-200 text-red-700"
                          )}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3 font-mono text-ink-secondary">{new Date(inv.due_date).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
