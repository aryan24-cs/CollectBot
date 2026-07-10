import { NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess, logAdminAction } from "../../middleware"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"
import { invalidateAllFeaturesCache } from "@/lib/features/getFeatures"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const { admin, error, status } = await verifyAdminAccess()
  if (error) return NextResponse.json({ error }, { status })

  try {
    const { planId } = await params
    const supabase = getSupabaseServiceRoleClient()

    const { data, error: queryError } = await supabase
      .from("plans")
      .select("*")
      .eq("id", planId)
      .single()

    if (queryError) throw queryError

    // Get business count
    const { count } = await supabase
      .from("subscriptions")
      .select("id", { count: "exact" })
      .eq("plan_name", data.name)

    return NextResponse.json({ plan: data, businessCount: count || 0 })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load plan" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const { admin, error, status } = await verifyAdminAccess()
  if (error) return NextResponse.json({ error }, { status })

  try {
    const { planId } = await params
    const body = await request.json()
    const supabase = getSupabaseServiceRoleClient()

    // Get old plan for audit
    const { data: oldPlan } = await supabase
      .from("plans")
      .select("*")
      .eq("id", planId)
      .single()

    const { data, error: updateError } = await supabase
      .from("plans")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", planId)
      .select()
      .single()

    if (updateError) throw updateError

    // Invalidate all caches since plan change affects multiple businesses
    invalidateAllFeaturesCache()

    // Count affected businesses
    const { count } = await supabase
      .from("subscriptions")
      .select("id", { count: "exact" })
      .eq("plan_name", data.name)

    await logAdminAction({
      adminId: admin!.id,
      action: "update_plan",
      targetType: "plan",
      targetId: planId,
      description: `Updated plan "${data.display_name}". ${count || 0} businesses affected.`,
      oldValue: oldPlan as Record<string, unknown>,
      newValue: body,
    })

    return NextResponse.json({ plan: data, businessesAffected: count || 0 })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update plan" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const { admin, error, status } = await verifyAdminAccess()
  if (error) return NextResponse.json({ error }, { status })

  try {
    const { planId } = await params
    const supabase = getSupabaseServiceRoleClient()

    // Check if businesses are on this plan
    const { data: plan } = await supabase
      .from("plans")
      .select("name, display_name")
      .eq("id", planId)
      .single()

    if (plan) {
      const { count } = await supabase
        .from("subscriptions")
        .select("id", { count: "exact" })
        .eq("plan_name", plan.name)

      if ((count || 0) > 0) {
        return NextResponse.json(
          {
            error: `Cannot delete plan "${plan.display_name}" — ${count} businesses are using it. Move them first.`,
          },
          { status: 400 }
        )
      }
    }

    // Soft delete (deactivate) rather than hard delete
    const { error: deleteError } = await supabase
      .from("plans")
      .update({ is_active: false, is_public: false })
      .eq("id", planId)

    if (deleteError) throw deleteError

    await logAdminAction({
      adminId: admin!.id,
      action: "deactivate_plan",
      targetType: "plan",
      targetId: planId,
      description: `Deactivated plan "${plan?.display_name}"`,
    })

    return NextResponse.json({ message: "Plan deactivated" })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to delete plan" },
      { status: 500 }
    )
  }
}
