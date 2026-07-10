import { NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess, logAdminAction } from "../../../middleware"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"
import {
  getBusinessFeatures,
  invalidateBusinessFeaturesCache,
} from "@/lib/features/getFeatures"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { admin, error, status } = await verifyAdminAccess()
  if (error) return NextResponse.json({ error }, { status })

  try {
    const { businessId } = await params
    const supabase = getSupabaseServiceRoleClient()

    // Get effective features (plan + overrides merged)
    const features = await getBusinessFeatures(businessId)

    // Get raw overrides
    const { data: overrides } = await supabase
      .from("business_feature_overrides")
      .select("*")
      .eq("business_id", businessId)
      .maybeSingle()

    // Get the plan details
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("plan_name")
      .eq("business_id", businessId)
      .maybeSingle()

    const planName = subscription?.plan_name || "free"
    const { data: plan } = await supabase
      .from("plans")
      .select("*")
      .eq("name", planName)
      .single()

    return NextResponse.json({
      effective: features,
      overrides: overrides || null,
      plan: plan || null,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load features" },
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

    // Get old overrides for audit log
    const { data: oldOverrides } = await supabase
      .from("business_feature_overrides")
      .select("*")
      .eq("business_id", businessId)
      .maybeSingle()

    // Build upsert payload
    const upsertData: Record<string, unknown> = {
      business_id: businessId,
      overridden_by: admin!.id,
      overridden_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Map overrides from body
    if (body.overrides) {
      Object.entries(body.overrides).forEach(([key, value]) => {
        if (key.startsWith("override_")) {
          upsertData[key] = value
        }
      })
    }

    // Special flags
    if (body.is_full_access !== undefined) upsertData.is_full_access = body.is_full_access
    if (body.is_blocked !== undefined) upsertData.is_blocked = body.is_blocked
    if (body.is_beta_tester !== undefined) upsertData.is_beta_tester = body.is_beta_tester
    if (body.admin_notes !== undefined) upsertData.admin_notes = body.admin_notes

    const { data, error: upsertError } = await supabase
      .from("business_feature_overrides")
      .upsert(upsertData, { onConflict: "business_id" })
      .select()
      .single()

    if (upsertError) throw upsertError

    // Invalidate cache
    invalidateBusinessFeaturesCache(businessId)

    // Log action
    await logAdminAction({
      adminId: admin!.id,
      action: "update_feature_overrides",
      targetType: "business",
      targetId: businessId,
      description: `Updated feature overrides`,
      oldValue: oldOverrides as Record<string, unknown> | undefined,
      newValue: upsertData as Record<string, unknown>,
    })

    // Return new effective features
    const features = await getBusinessFeatures(businessId)
    return NextResponse.json({ overrides: data, effective: features })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update features" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { admin, error, status } = await verifyAdminAccess()
  if (error) return NextResponse.json({ error }, { status })

  try {
    const { businessId } = await params
    const body = await request.json()
    const supabase = getSupabaseServiceRoleClient()
    const action = body.action as string

    if (action === "reset") {
      // Delete all overrides
      await supabase
        .from("business_feature_overrides")
        .delete()
        .eq("business_id", businessId)

      invalidateBusinessFeaturesCache(businessId)

      await logAdminAction({
        adminId: admin!.id,
        action: "reset_overrides",
        targetType: "business",
        targetId: businessId,
        description: "Reset all feature overrides to plan defaults",
      })

      const features = await getBusinessFeatures(businessId)
      return NextResponse.json({ effective: features, overrides: null })
    }

    if (action === "full_access") {
      const grant = body.grant as boolean

      await supabase.from("business_feature_overrides").upsert(
        {
          business_id: businessId,
          is_full_access: grant,
          overridden_by: admin!.id,
          overridden_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "business_id" }
      )

      invalidateBusinessFeaturesCache(businessId)

      await logAdminAction({
        adminId: admin!.id,
        action: grant ? "grant_full_access" : "revoke_full_access",
        targetType: "business",
        targetId: businessId,
        description: grant
          ? "Granted full access to all features"
          : "Revoked full access — now using plan defaults",
      })

      const features = await getBusinessFeatures(businessId)
      return NextResponse.json({ effective: features })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process action" },
      { status: 500 }
    )
  }
}
