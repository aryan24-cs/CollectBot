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
  DollarSign,
  Heart,
  Tag,
  Briefcase,
  Target,
  Mail
} from "lucide-react"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  AreaChart,
  Area
} from "recharts"
import { toast } from "sonner"

import getSupabaseBrowserClient from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency, cn, getDaysOverdue } from "@/lib/utils"
import StatCard from "@/components/shared/StatCard"

export default function DashboardPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [mounted, setMounted] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)
  const [activeTab, setActiveTab] = React.useState<"overview" | "finance" | "sales" | "marketing" | "analytics">("overview")

  // Real data aggregates
  const [stats, setStats] = React.useState({
    totalInvoiced: 0,
    totalCollected: 0,
    outstanding: 0,
    overdueCount: 0,
    invoicesCount: 0,
    clientsCount: 0,
  })

  // Sales CRM state
  const [salesStats, setSalesStats] = React.useState({
    totalLeads: 0,
    qualifiedLeads: 0,
    wonDeals: 0,
    lostDeals: 0,
    conversionRate: "0",
    pipelineValue: 0
  })

  // Marketing state
  const [marketingStats, setMarketingStats] = React.useState({
    totalCampaigns: 0,
    runningCampaigns: 0,
    totalCoupons: 0,
    averageRoi: "0"
  })

  // Teammates state
  const [employees, setEmployees] = React.useState<any[]>([])

  const [topClients, setTopClients] = React.useState<any[]>([])
  const [invoiceBreakdown, setInvoiceBreakdown] = React.useState<any[]>([])
  const [chartData, setChartData] = React.useState<any[]>([])
  const [recentLogs, setRecentLogs] = React.useState<any[]>([])
  const [recentLeads, setRecentLeads] = React.useState<any[]>([])
  const [recentCampaigns, setRecentCampaigns] = React.useState<any[]>([])
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

      let biz: any = null
      // Check user profile via backend API (bypasses RLS)
      const profileRes = await fetch("/api/settings/business")
      if (profileRes.ok) {
        const profileData = await profileRes.json()
        if (profileData.isOwner === false) {
          const empType = profileData.employee?.employee_type || "FINANCE"
          const target = 
            empType === "SALES" ? "/dashboard/sales" :
            empType === "MARKETING" ? "/dashboard/marketing" :
            "/dashboard/finance"
          router.push(target)
          return
        }
        biz = profileData
        setBusinessName(profileData.name || "Workspace")
      } else {
        router.push("/onboarding")
        return
      }

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

      if (cliError) throw cliError

      // 4. Fetch Logs
      const { data: logs } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("business_id", biz.id)
        .order("created_at", { ascending: false })
        .limit(5)
      setRecentLogs(logs || [])

      // 5. Fetch Leads
      const { data: leads } = await supabase
        .from("sales_leads")
        .select("*")
        .eq("business_id", biz.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
      const leadList = leads || []
      setRecentLeads(leadList.slice(0, 4))

      // Compute Sales Stats
      const totalLeads = leadList.length
      const wonDeals = leadList.filter(l => l.status === "won").length
      const lostDeals = leadList.filter(l => l.status === "lost").length
      const qualifiedLeads = leadList.filter(l => ["qualified", "proposal_sent", "negotiation"].includes(l.status)).length
      const conversionRate = totalLeads > 0 ? ((wonDeals / totalLeads) * 100).toFixed(1) : "0"
      const pipelineValue = leadList.reduce((sum, l) => sum + Number(l.value || 0), 0)
      setSalesStats({
        totalLeads,
        qualifiedLeads,
        wonDeals,
        lostDeals,
        conversionRate,
        pipelineValue
      })

      // 6. Fetch Campaigns
      const { data: campaigns } = await supabase
        .from("marketing_campaigns")
        .select("*")
        .eq("business_id", biz.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
      const campList = campaigns || []
      setRecentCampaigns(campList.slice(0, 4))

      // Fetch Coupons
      const { data: coupons } = await supabase
        .from("marketing_coupons")
        .select("id")
        .eq("business_id", biz.id)
        .is("deleted_at", null)

      setMarketingStats({
        totalCampaigns: campList.length,
        runningCampaigns: campList.filter(c => c.status === "scheduled" || c.status === "sending").length,
        totalCoupons: coupons?.length || 0,
        averageRoi: "3.5"
      })

      // 7. Fetch Teammates
      const { data: teammates } = await supabase
        .from("employees")
        .select("id, name, email, employee_type, designation, status, last_login")
        .eq("business_id", biz.id)
        .is("deleted_at", null)
      setEmployees(teammates || [])

      // Compute financial stats
      let totalInvoiced = 0
      let totalCollected = 0
      let outstanding = 0
      let overdueCount = 0
      const list = invoices || []

      list.forEach((inv) => {
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
      })

      setStats({
        totalInvoiced,
        totalCollected,
        outstanding,
        overdueCount,
        invoicesCount: list.length,
        clientsCount: clients?.length || 0,
      })

      // Recharts month aggregates
      const monthlyAggregates: Record<string, { name: string; billed: number; collected: number }> = {}
      list.forEach(inv => {
        const d = new Date(inv.issue_date)
        const monthLabel = d.toLocaleString("default", { month: "short" })
        if (!monthlyAggregates[monthLabel]) {
          monthlyAggregates[monthLabel] = { name: monthLabel, billed: 0, collected: 0 }
        }
        monthlyAggregates[monthLabel].billed += Number(inv.total || 0)
        monthlyAggregates[monthLabel].collected += Number(inv.amount_paid || 0)
      })
      setChartData(Object.values(monthlyAggregates))
      setInvoiceBreakdown(list.slice(0, 5))

      // Top clients
      const clientStats = (clients || []).slice(0, 4).map((c: any) => ({
        id: c.id,
        name: c.name,
        company: c.company_name || "Freelancer",
        amount: Number(c.total_invoiced) || 0,
        percentage: totalInvoiced > 0 ? Number(((Number(c.total_invoiced) / totalInvoiced) * 100).toFixed(1)) : 0
      }))
      setTopClients(clientStats)

    } catch (err: any) {
      toast.error(err.message || "Failed to load dashboard statistics.")
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

  // Compute dynamic business health score (scale of 0-100)
  const collectionRatio = stats.totalInvoiced > 0 ? (stats.totalCollected / stats.totalInvoiced) : 0.80
  const dealRatio = salesStats.totalLeads > 0 ? (salesStats.wonDeals / salesStats.totalLeads) : 0.30
  const healthScore = Math.min(100, Math.round((collectionRatio * 75) + (dealRatio * 25)))

  return (
    <div className="space-y-6 select-none max-w-6xl mx-auto pb-12">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-surface-border/50 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink-black leading-tight">Command Center</h1>
          <p className="text-ink-secondary text-sm mt-1">Multi-workspace directory for: <strong className="text-ink-black">{businessName}</strong></p>
        </div>
        <div className="flex gap-2">
          <Link href="/settings/employees" className="px-4 py-2.5 rounded-button text-xs font-bold text-ink-secondary bg-white hover:bg-cream-50 border border-[#EEE9E4] transition-all cursor-pointer flex items-center gap-1.5 shadow-soft">
            <Users className="w-4 h-4" />
            Manage Team
          </Link>
          <Link href="/invoices/new" className="btn-primary px-5 py-2.5 rounded-button text-xs font-bold gap-2 shadow-soft flex items-center shrink-0 cursor-pointer">
            <Plus className="w-4 h-4" />
            Create Invoice
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#EEE9E4] gap-6 overflow-x-auto pb-1">
        {["overview", "finance", "sales", "marketing", "analytics"].map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t as any)}
            className={cn(
              "pb-3 text-xs font-bold uppercase tracking-wider bg-transparent border-none cursor-pointer relative shrink-0",
              activeTab === t ? "text-brand-500 border-b-2 border-brand-500" : "text-ink-secondary"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-2 bg-white rounded-card border border-[#EEE9E4]">
          <Loader2 className="w-8 h-8 animate-spin text-[#E91E63]" />
          <p className="text-xs text-ink-secondary font-bold uppercase tracking-wider">Syncing command center logs…</p>
        </div>
      ) : (
        <>
          {/* Tab Renderers */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Primary KPI widgets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Monthly Revenue" value={formatCurrency(stats.totalCollected)} icon={<TrendingUp className="w-4 h-4 text-emerald-600" />} />
                <StatCard title="Pending Invoices" value={formatCurrency(stats.outstanding)} icon={<AlertTriangle className="w-4 h-4 text-amber-600" />} />
                <StatCard title="Qualified CRM Leads" value={salesStats.qualifiedLeads.toString()} icon={<Briefcase className="w-4 h-4 text-blue-600" />} />
                <StatCard title="Active Campaigns" value={marketingStats.runningCampaigns.toString()} icon={<Send className="w-4 h-4 text-purple-600" />} />
              </div>

              {/* CRM & Marketing quick panels */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-white border-[#EEE9E4] shadow-card">
                  <CardHeader>
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-ink-black">Recent CRM Leads</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {recentLeads.map((lead) => (
                        <div key={lead.id} className="flex justify-between items-center border-b border-cream-100 pb-2.5 last:border-0 last:pb-0">
                          <div>
                            <span className="text-[11px] font-bold text-ink-black">{lead.name}</span>
                            <span className="text-[8px] text-ink-secondary block uppercase">{lead.company || "Direct lead"}</span>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase bg-blue-50 border border-blue-200 text-blue-700">
                            {lead.status}
                          </span>
                        </div>
                      ))}
                      {recentLeads.length === 0 && (
                        <div className="text-center text-[10px] text-ink-secondary py-6 uppercase font-bold">No Leads Registered</div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-[#EEE9E4] shadow-card">
                  <CardHeader>
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-ink-black">Recent Campaigns</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {recentCampaigns.map((camp) => (
                        <div key={camp.id} className="flex justify-between items-center border-b border-cream-100 pb-2.5 last:border-0 last:pb-0">
                          <div>
                            <span className="text-[11px] font-bold text-ink-black">{camp.name}</span>
                            <span className="text-[8px] text-ink-secondary block uppercase">Method: {camp.type}</span>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase bg-purple-50 border border-purple-200 text-purple-700">
                            {camp.status}
                          </span>
                        </div>
                      ))}
                      {recentCampaigns.length === 0 && (
                        <div className="text-center text-[10px] text-ink-secondary py-6 uppercase font-bold">No Campaigns Launched</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Active Employee overview list */}
              <Card className="bg-white border-[#EEE9E4] shadow-card">
                <CardHeader>
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-ink-black">Recently Active Employees</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[#EEE9E4] pb-2 text-[10px] font-bold uppercase tracking-wider text-ink-secondary">
                          <th className="py-2.5">Teammate</th>
                          <th className="py-2.5">Designation</th>
                          <th className="py-2.5">Workspace Scope</th>
                          <th className="py-2.5">Status</th>
                          <th className="py-2.5">Last Login Log</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employees.slice(0, 5).map((emp) => (
                          <tr key={emp.id} className="border-b border-cream-100 last:border-b-0">
                            <td className="py-3 font-semibold text-ink-black">{emp.name}</td>
                            <td className="py-3 text-ink-secondary">{emp.designation || "Executive"}</td>
                            <td className="py-3 uppercase font-bold text-[9px] text-brand-500">{emp.employee_type}</td>
                            <td className="py-3">
                              <span className={cn(
                                "px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider",
                                emp.status === "active" && "bg-emerald-50 text-emerald-700 border border-emerald-200",
                                emp.status === "suspended" && "bg-red-50 text-red-700 border border-red-200"
                              )}>
                                {emp.status}
                              </span>
                            </td>
                            <td className="py-3 font-mono text-ink-secondary">
                              {emp.last_login ? new Date(emp.last_login).toLocaleString() : "Never login yet"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "finance" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                    </div>
                  </CardContent>
                </Card>
              </div>

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
                            <td className="py-3">
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
            </div>
          )}

          {activeTab === "sales" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="CRM Lead Count" value={salesStats.totalLeads.toString()} icon={<Users className="w-4 h-4 text-blue-600" />} />
                <StatCard title="Pipeline Value" value={`₹${salesStats.pipelineValue.toLocaleString()}`} icon={<DollarSign className="w-4 h-4 text-emerald-600" />} />
                <StatCard title="Sales Win Count" value={salesStats.wonDeals.toString()} icon={<CheckCircle className="w-4 h-4 text-purple-600" />} />
                <StatCard title="Conversion Rate" value={`${salesStats.conversionRate}%`} icon={<TrendingUp className="w-4 h-4 text-amber-600" />} />
              </div>

              <Card className="bg-white border-[#EEE9E4] shadow-card">
                <CardHeader>
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-ink-black">Active Deal pipeline Registry</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3.5">
                    {recentLeads.map(lead => (
                      <div key={lead.id} className="flex justify-between items-center border-b border-cream-100 pb-3 last:border-0">
                        <div>
                          <p className="text-xs font-bold text-ink-black">{lead.name}</p>
                          <span className="text-[9px] text-ink-secondary uppercase">{lead.company || "Direct lead"}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-mono font-bold text-emerald-600">₹{Number(lead.value).toLocaleString()}</p>
                          <span className="text-[8px] text-ink-secondary font-semibold uppercase">{lead.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "marketing" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="bg-white border-[#EEE9E4] shadow-card">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-ink-secondary">Total Broadcasts</span>
                      <Mail className="w-4 h-4 text-blue-600" />
                    </div>
                    <p className="text-2xl font-black text-ink-black mt-2">{marketingStats.totalCampaigns}</p>
                  </CardContent>
                </Card>
                <Card className="bg-white border-[#EEE9E4] shadow-card">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-ink-secondary">Active Promo Codes</span>
                      <Tag className="w-4 h-4 text-emerald-600" />
                    </div>
                    <p className="text-2xl font-black text-ink-black mt-2">{marketingStats.totalCoupons}</p>
                  </CardContent>
                </Card>
                <Card className="bg-white border-[#EEE9E4] shadow-card">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-ink-secondary">Average Campaign ROI</span>
                      <TrendingUp className="w-4 h-4 text-purple-600" />
                    </div>
                    <p className="text-2xl font-black text-ink-black mt-2">{marketingStats.averageRoi}x</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-white border-[#EEE9E4] shadow-card">
                <CardHeader>
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-ink-black">Active Campaign Broadcasts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3.5">
                    {recentCampaigns.map(camp => (
                      <div key={camp.id} className="flex justify-between items-center border-b border-cream-100 pb-3 last:border-0">
                        <div>
                          <p className="text-xs font-bold text-ink-black">{camp.name}</p>
                          <span className="text-[9px] text-ink-secondary uppercase">Type: {camp.type}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[8px] font-bold uppercase bg-cream-100 text-ink-secondary">
                          {camp.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "analytics" && (
            <div className="space-y-6">
              {/* Business Health Score Widget */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="bg-white border-[#EEE9E4] shadow-card flex flex-col justify-between">
                  <CardHeader>
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-ink-black flex items-center gap-1">
                      <Heart className="w-4 h-4 text-[#E91E63] fill-[#E91E63]/20" />
                      Business Health Score
                    </CardTitle>
                    <CardDescription className="text-[9px]">
                      Calculated from cash collection efficiency and deal wins.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col items-center justify-center py-6">
                    <div className="relative w-32 h-32 flex items-center justify-center rounded-full border-4 border-cream-200">
                      <div className="text-center">
                        <span className="text-3xl font-black text-brand-600">{healthScore}</span>
                        <span className="text-xs text-ink-secondary block font-bold mt-0.5">/ 100</span>
                      </div>
                    </div>
                    <div className="mt-4 text-center">
                      <span className={cn(
                        "px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider",
                        healthScore >= 80 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                      )}>
                        {healthScore >= 80 ? "Excellent Health" : "Fair Health"}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Growth trend metrics */}
                <Card className="lg:col-span-2 bg-white border-[#EEE9E4] shadow-card">
                  <CardHeader>
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-ink-black">Monthly Billed Growth Trend</CardTitle>
                  </CardHeader>
                  <CardContent className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorBilled" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#E91E63" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#E91E63" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1EDE9" />
                        <XAxis dataKey="name" stroke="#8C837B" fontSize={10} />
                        <YAxis stroke="#8C837B" fontSize={10} />
                        <Tooltip />
                        <Area type="monotone" dataKey="billed" name="Billed Growth" stroke="#E91E63" fillOpacity={1} fill="url(#colorBilled)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
