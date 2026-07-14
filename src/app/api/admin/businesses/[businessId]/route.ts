import { NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess, logAdminAction } from "../../middleware"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { admin, error, status } = await verifyAdminAccess()
  if (error) return NextResponse.json({ error }, { status })

  try {
    const { businessId } = await params
    const supabase = getSupabaseServiceRoleClient()

    // Fetch business with related data
    const [businessRes, invoiceRes, paymentRes, clientRes, subscriptionRes, overrideRes] =
      await Promise.all([
        supabase
          .from("businesses")
          .select("id, name, logo_url, created_at, updated_at, invoice_prefix, invoice_counter")
          .eq("id", businessId)
          .single(),
        supabase
          .from("invoices")
          .select("id, total, status, created_at", { count: "exact" })
          .eq("business_id", businessId),
        supabase
          .from("payments")
          .select("id, amount, status, created_at")
          .eq("business_id", businessId),
        supabase
          .from("clients")
          .select("id", { count: "exact" })
          .eq("business_id", businessId),
        supabase
          .from("subscriptions")
          .select("*")
          .eq("business_id", businessId)
          .maybeSingle(),
        supabase
          .from("business_feature_overrides")
          .select("*")
          .eq("business_id", businessId)
          .maybeSingle(),
      ])

    if (businessRes.error) throw businessRes.error

    const payments = paymentRes.data || []
    const totalRevenue = payments
      .filter((p: any) => p.status === "captured" || p.status === "paid")
      .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0)

    return NextResponse.json({
      business: businessRes.data,
      stats: {
        totalInvoices: invoiceRes.count || 0,
        totalClients: clientRes.count || 0,
        totalRevenue,
        totalPayments: payments.length,
      },
      subscription: subscriptionRes.data || null,
      overrides: overrideRes.data || null,
    })
  } catch (err: any) {
    console.error("Admin business detail error:", err)
    return NextResponse.json(
      { error: err.message || "Failed to load business" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { admin, error, status } = await verifyAdminAccess()
  if (error) return NextResponse.json({ error }, { status })

  try {
    const { businessId } = await params
    const body = await request.json()
    const supabase = getSupabaseServiceRoleClient()

    const { data, error: updateError } = await supabase
      .from("businesses")
      .update(body)
      .eq("id", businessId)
      .select()
      .single()

    if (updateError) throw updateError

    await logAdminAction({
      adminId: admin!.id,
      action: "update_business",
      targetType: "business",
      targetId: businessId,
      description: `Updated business profile for ${data.name}`,
      newValue: body,
    })

    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update business" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { admin, error, status } = await verifyAdminAccess()
  if (error) return NextResponse.json({ error }, { status })

  try {
    const { businessId } = await params
    const supabase = getSupabaseServiceRoleClient()

    // 1. Fetch business to get the associated user_id
    const { data: business, error: findError } = await supabase
      .from("businesses")
      .select("user_id, name")
      .eq("id", businessId)
      .single()

    if (findError || !business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 })
    }

    // 2. Fetch invoice IDs of this business to delete associated reminder logs
    const { data: invoices } = await supabase
      .from("invoices")
      .select("id")
      .eq("business_id", businessId)

    const invoiceIds = (invoices || []).map(inv => inv.id)

    // 3. Delete reminder logs referencing invoices
    if (invoiceIds.length > 0) {
      const { error: deleteRemLogsErr } = await supabase
        .from("reminder_logs")
        .delete()
        .in("invoice_id", invoiceIds)
      if (deleteRemLogsErr) {
        throw new Error(`Failed to delete reminder logs: ${deleteRemLogsErr.message}`)
      }
    }

    // 4. Delete all other dependent entities sequentially with explicit error checking
    const tablesToDelete = [
      "reminder_logs",
      "activity_logs",
      "notification_settings",
      "team_members",
      "business_feature_overrides",
      "payments",
      "subscriptions",
      "recurring_schedules"
    ]

    for (const table of tablesToDelete) {
      // Check if table exists by doing a select first to avoid failures if optional features tables aren't present
      const { error: checkErr } = await supabase.from(table).select("id").limit(1)
      if (checkErr && checkErr.code === "42P01") {
        // Table does not exist (relation does not exist) - skip it safely
        continue
      }

      const { error: deleteErr } = await supabase
        .from(table)
        .delete()
        .eq("business_id", businessId)
      if (deleteErr) {
        throw new Error(`Failed to delete records from ${table}: ${deleteErr.message}`)
      }
    }

    // 5. Delete invoices and clients
    const { error: deleteInvsErr } = await supabase
      .from("invoices")
      .delete()
      .eq("business_id", businessId)
    if (deleteInvsErr) {
      throw new Error(`Failed to delete invoices: ${deleteInvsErr.message}`)
    }

    const { error: deleteClisErr } = await supabase
      .from("clients")
      .delete()
      .eq("business_id", businessId)
    if (deleteClisErr) {
      throw new Error(`Failed to delete clients: ${deleteClisErr.message}`)
    }

    // 6. Delete the business record directly
    const { error: deleteBizError } = await supabase
      .from("businesses")
      .delete()
      .eq("id", businessId)
    if (deleteBizError) {
      throw new Error(`Failed to delete business: ${deleteBizError.message}`)
    }

    // 7. Delete the auth user
    if (business.user_id) {
      const { error: deleteUserError } = await supabase.auth.admin.deleteUser(business.user_id)
      if (deleteUserError) {
        console.warn("Auth user delete failed:", deleteUserError)
      }
    }

    await logAdminAction({
      adminId: admin!.id,
      action: "delete_business",
      targetType: "business",
      targetId: businessId,
      description: `Permanently deleted business "${business.name}" and owner account "${business.user_id}"`,
    })

    return NextResponse.json({ success: true, message: "Business deleted successfully" })
  } catch (err: any) {
    console.error("Delete business error:", err)
    return NextResponse.json(
      { error: err.message || "Failed to delete business" },
      { status: 500 }
    )
  }
}
