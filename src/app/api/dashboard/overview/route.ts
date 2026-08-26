import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"
import { requireBusinessUser } from "@/lib/auth/checkRole"

export async function GET(request: NextRequest) {
  const { error, user, business, employee } = await requireBusinessUser(request)
  if (error) return error

  try {
    const adminDb = getSupabaseServiceRoleClient()
    const bizId = business.id

    // 1. Parallel execution of core overview queries on database
    const [
      invoicesRes,
      clientsRes,
      logsRes,
      leadsRes,
      campaignsRes,
      couponsRes,
      employeesRes,
    ] = await Promise.all([
      adminDb
        .from("invoices")
        .select("id, total, amount_paid, balance_due, status, issue_date, due_date, client_id, client:clients(name, company_name)")
        .eq("business_id", bizId)
        .order("created_at", { ascending: false }),
      adminDb
        .from("clients")
        .select("id, name, total_invoiced, total_paid, company_name")
        .eq("business_id", bizId)
        .order("total_invoiced", { ascending: false })
        .limit(10),
      adminDb
        .from("activity_logs")
        .select("*")
        .eq("business_id", bizId)
        .order("created_at", { ascending: false })
        .limit(5),
      adminDb
        .from("sales_leads")
        .select("*")
        .eq("business_id", bizId)
        .order("created_at", { ascending: false }),
      adminDb
        .from("marketing_campaigns")
        .select("*")
        .eq("business_id", bizId)
        .order("created_at", { ascending: false }),
      adminDb
        .from("marketing_coupons")
        .select("id")
        .eq("business_id", bizId),
      adminDb
        .from("employees")
        .select("id, name, email, employee_type, designation, status")
        .eq("business_id", bizId)
        .eq("status", "active"),
    ])

    const invoices = invoicesRes.data || []
    const clients = clientsRes.data || []
    const logs = logsRes.data || []
    const leads = leadsRes.data || []
    const campaigns = campaignsRes.data || []
    const coupons = couponsRes.data || []
    const employees = employeesRes.data || []

    // 2. Financial Aggregations
    let totalInvoiced = 0
    let totalCollected = 0
    let outstanding = 0
    let overdueCount = 0

    // Monthly chart buckets (Last 6 months)
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const monthlyMap = new Map<string, { month: string; invoiced: number; collected: number }>()

    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`
      monthlyMap.set(key, { month: key, invoiced: 0, collected: 0 })
    }

    const todayStr = new Date().toISOString().split("T")[0]

    for (const inv of invoices) {
      const total = Number(inv.total) || 0
      const paid = Number(inv.amount_paid) || 0
      const due = Number(inv.balance_due) || 0

      if (inv.status !== "cancelled") {
        totalInvoiced += total
        totalCollected += paid

        if (["sent", "viewed", "overdue", "partial"].includes(inv.status)) {
          outstanding += due
        }

        if (inv.status === "overdue" || (["sent", "viewed", "partial"].includes(inv.status) && inv.due_date && inv.due_date < todayStr)) {
          overdueCount += 1
        }

        // Monthly bucket calculation
        if (inv.issue_date) {
          const invDate = new Date(inv.issue_date)
          const key = `${monthNames[invDate.getMonth()]} ${invDate.getFullYear().toString().slice(-2)}`
          if (monthlyMap.has(key)) {
            const bucket = monthlyMap.get(key)!
            bucket.invoiced += total
            bucket.collected += paid
          }
        }
      }
    }

    // Status breakdown counts
    const statusCounts = {
      draft: invoices.filter((i) => i.status === "draft").length,
      sent: invoices.filter((i) => i.status === "sent").length,
      paid: invoices.filter((i) => i.status === "paid").length,
      overdue: overdueCount,
    }

    // 3. Sales Aggregations
    const totalLeads = leads.length
    const wonDeals = leads.filter((l) => l.status === "won").length
    const lostDeals = leads.filter((l) => l.status === "lost").length
    const qualifiedLeads = leads.filter((l) => ["qualified", "proposal_sent", "negotiation"].includes(l.status)).length
    const conversionRate = totalLeads > 0 ? ((wonDeals / totalLeads) * 100).toFixed(1) : "0"
    const pipelineValue = leads.reduce((sum, l) => sum + Number(l.value || 0), 0)

    // 4. Marketing Aggregations
    const totalCampaigns = campaigns.length
    const runningCampaigns = campaigns.filter((c) => c.status === "running" || c.status === "active").length

    return NextResponse.json({
      business: {
        id: business.id,
        name: business.name,
        currency: business.currency || "INR",
      },
      stats: {
        totalInvoiced,
        totalCollected,
        outstanding,
        overdueCount,
        invoicesCount: invoices.length,
        clientsCount: clients.length,
      },
      salesStats: {
        totalLeads,
        qualifiedLeads,
        wonDeals,
        lostDeals,
        conversionRate,
        pipelineValue,
      },
      marketingStats: {
        totalCampaigns,
        runningCampaigns,
        totalCoupons: coupons.length,
        averageRoi: "280%",
      },
      chartData: Array.from(monthlyMap.values()),
      invoiceBreakdown: [
        { name: "Paid", count: statusCounts.paid, color: "#10B981" },
        { name: "Sent", count: statusCounts.sent, color: "#3B82F6" },
        { name: "Overdue", count: statusCounts.overdue, color: "#EF4444" },
        { name: "Draft", count: statusCounts.draft, color: "#9CA3AF" },
      ],
      topClients: clients.slice(0, 5),
      recentLogs: logs,
      recentLeads: leads.slice(0, 4),
      recentCampaigns: campaigns.slice(0, 4),
      employees,
    })
  } catch (err: any) {
    console.error("GET /api/dashboard/overview error:", err)
    return NextResponse.json({ error: err.message || "Failed to load dashboard data" }, { status: 500 })
  }
}
