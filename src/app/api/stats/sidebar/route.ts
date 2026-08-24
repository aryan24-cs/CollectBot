import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"
import { requireBusinessUser } from "@/lib/auth/checkRole"

export async function GET(request: NextRequest) {
  const { error, business } = await requireBusinessUser(request)
  if (error) return error

  try {
    const adminDb = getSupabaseServiceRoleClient()

    // Execute parallel lightweight aggregate counts on the database
    const [
      { count: allInvoices },
      { count: draftInvoices },
      { count: sentInvoices },
      { count: overdueInvoices },
      { count: allClients },
      { count: slowPayers },
    ] = await Promise.all([
      adminDb.from("invoices").select("*", { count: "exact", head: true }).eq("business_id", business.id),
      adminDb.from("invoices").select("*", { count: "exact", head: true }).eq("business_id", business.id).eq("status", "draft"),
      adminDb.from("invoices").select("*", { count: "exact", head: true }).eq("business_id", business.id).eq("status", "sent"),
      adminDb
        .from("invoices")
        .select("*", { count: "exact", head: true })
        .eq("business_id", business.id)
        .or(`status.eq.overdue,and(status.in.(sent,viewed,partial),due_date.lt.${new Date().toISOString().split("T")[0]})`),
      adminDb.from("clients").select("*", { count: "exact", head: true }).eq("business_id", business.id),
      adminDb.from("clients").select("*", { count: "exact", head: true }).eq("business_id", business.id).gt("total_invoiced", 0),
    ])

    return NextResponse.json({
      allInvoices: allInvoices || 0,
      draftInvoices: draftInvoices || 0,
      sentInvoices: sentInvoices || 0,
      overdueInvoices: overdueInvoices || 0,
      allClients: allClients || 0,
      vipClients: 0,
      slowPayers: slowPayers || 0,
    })
  } catch (err: any) {
    console.error("GET /api/stats/sidebar error:", err)
    return NextResponse.json(
      { allInvoices: 0, draftInvoices: 0, sentInvoices: 0, overdueInvoices: 0, allClients: 0, vipClients: 0, slowPayers: 0 },
      { status: 200 }
    )
  }
}
