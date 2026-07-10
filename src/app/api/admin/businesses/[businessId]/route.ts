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
        supabase.from("businesses").select("*").eq("id", businessId).single(),
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

    // 2. Delete the user from auth.users (requires service role)
    // Deleting the auth user automatically cascades and deletes the businesses row and all other data tables!
    if (business.user_id) {
      const { error: deleteUserError } = await supabase.auth.admin.deleteUser(business.user_id)
      if (deleteUserError) {
        console.warn("Auth user delete failed, trying to delete business directly:", deleteUserError)
        const { error: deleteBizError } = await supabase
          .from("businesses")
          .delete()
          .eq("id", businessId)
        if (deleteBizError) throw deleteBizError
      }
    } else {
      const { error: deleteBizError } = await supabase
        .from("businesses")
        .delete()
        .eq("id", businessId)
      if (deleteBizError) throw deleteBizError
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
    return NextResponse.json(
      { error: err.message || "Failed to delete business" },
      { status: 500 }
    )
  }
}
