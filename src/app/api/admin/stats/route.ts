import { NextResponse } from "next/server"
import { verifyAdminAccess } from "../middleware"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"

export async function GET() {
  const { admin, error, status } = await verifyAdminAccess()
  if (error) return NextResponse.json({ error }, { status })

  try {
    const supabase = getSupabaseServiceRoleClient()

    // Parallel queries for all stats
    const [
      businessesRes,
      invoicesRes,
      paymentsRes,
      plansRes,
      recentBusinessesRes,
      recentInvoicesRes,
    ] = await Promise.all([
      supabase.from("businesses").select("id, created_at", { count: "exact" }),
      supabase.from("invoices").select("id, total, status, created_at", { count: "exact" }),
      supabase.from("payments").select("id, amount, status, created_at", { count: "exact" }),
      supabase.from("subscriptions").select("plan_name, status"),
      supabase
        .from("businesses")
        .select("id, name, email, city, created_at")
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("invoices")
        .select("id, invoice_number, total, status, created_at, client:clients(name)")
        .order("created_at", { ascending: false })
        .limit(10),
    ])

    const businesses = businessesRes.data || []
    const invoices = invoicesRes.data || []
    const payments = paymentsRes.data || []
    const subscriptions = plansRes.data || []

    // Calculate stats
    const totalBusinesses = businessesRes.count || 0
    const totalInvoices = invoicesRes.count || 0
    const totalPayments = paymentsRes.count || 0

    const totalPaymentVolume = payments
      .filter((p: any) => p.status === "captured" || p.status === "paid")
      .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0)

    // Today's stats
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayISO = today.toISOString()

    const newBusinessesToday = businesses.filter(
      (b: any) => new Date(b.created_at) >= today
    ).length
    const invoicesToday = invoices.filter(
      (i: any) => new Date(i.created_at) >= today
    ).length

    // This week stats
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const newBusinessesThisWeek = businesses.filter(
      (b: any) => new Date(b.created_at) >= weekAgo
    ).length

    // Plan distribution
    const planDistribution = {
      free: subscriptions.filter((s: any) => s.plan_name === "free" || !s.plan_name).length,
      solo: subscriptions.filter((s: any) => s.plan_name === "solo").length,
      business: subscriptions.filter((s: any) => s.plan_name === "business").length,
      scale: subscriptions.filter((s: any) => s.plan_name === "scale").length,
    }

    // Active subscriptions
    const activeSubscriptions = subscriptions.filter(
      (s: any) => s.status === "active" || s.status === "trialing"
    ).length

    // 30-day growth data
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const growthData: { date: string; count: number }[] = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split("T")[0]
      const count = businesses.filter((b: any) => {
        const bDate = new Date(b.created_at).toISOString().split("T")[0]
        return bDate === dateStr
      }).length
      growthData.push({ date: dateStr, count })
    }

    return NextResponse.json({
      totalBusinesses,
      totalInvoices,
      totalPayments,
      totalPaymentVolume,
      newBusinessesToday,
      newBusinessesThisWeek,
      invoicesToday,
      activeSubscriptions,
      planDistribution,
      growthData,
      recentBusinesses: recentBusinessesRes.data || [],
      recentInvoices: recentInvoicesRes.data || [],
    })
  } catch (err: any) {
    console.error("Admin stats error:", err)
    return NextResponse.json(
      { error: err.message || "Failed to load stats" },
      { status: 500 }
    )
  }
}
