import { NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess, logAdminAction } from "../../../middleware"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"
import { invalidateBusinessFeaturesCache } from "@/lib/features/getFeatures"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { admin, error, status } = await verifyAdminAccess()
  if (error) return NextResponse.json({ error }, { status })

  try {
    const { businessId } = await params
    const supabase = getSupabaseServiceRoleClient()

    const { data, error: queryError } = await supabase
      .from("subscriptions")
      .select("*, plans(*)")
      .eq("business_id", businessId)
      .maybeSingle()

    if (queryError) throw queryError

    return NextResponse.json({ subscription: data || null })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load subscription" },
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

    // Get old subscription for logging
    const { data: oldSub } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("business_id", businessId)
      .maybeSingle()

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    // Change plan
    if (body.plan_name) {
      const { data: plan } = await supabase
        .from("plans")
        .select("id, name")
        .eq("name", body.plan_name)
        .single()

      if (plan) {
        updateData.plan_name = plan.name
        updateData.plan_id = plan.id
        updateData.plan = plan.name
      }
    }

    // Change status
    if (body.status) updateData.status = body.status

    // Extend trial
    if (body.trial_ends_at) updateData.trial_ends_at = body.trial_ends_at

    // Extend period
    if (body.current_period_end) updateData.current_period_end = body.current_period_end

    // Cancel
    if (body.cancel) {
      updateData.status = "cancelled"
      updateData.cancelled_at = new Date().toISOString()
      if (body.cancellation_reason) updateData.cancellation_reason = body.cancellation_reason
    }

    if (oldSub) {
      const { data, error: updateError } = await supabase
        .from("subscriptions")
        .update(updateData)
        .eq("business_id", businessId)
        .select()
        .single()

      if (updateError) throw updateError

      invalidateBusinessFeaturesCache(businessId)

      await logAdminAction({
        adminId: admin!.id,
        action: "update_subscription",
        targetType: "subscription",
        targetId: businessId,
        description: `Updated subscription${body.plan_name ? ` to ${body.plan_name}` : ""}${body.cancel ? " (cancelled)" : ""}`,
        oldValue: oldSub as Record<string, unknown>,
        newValue: updateData,
      })

      return NextResponse.json(data)
    } else {
      // Create subscription if none exists
      const { data, error: insertError } = await supabase
        .from("subscriptions")
        .insert({
          business_id: businessId,
          ...updateData,
        })
        .select()
        .single()

      if (insertError) throw insertError

      invalidateBusinessFeaturesCache(businessId)
      return NextResponse.json(data)
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update subscription" },
      { status: 500 }
    )
  }
}
