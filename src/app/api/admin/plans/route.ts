import { NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess, logAdminAction } from "../middleware"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"
import { invalidateAllFeaturesCache } from "@/lib/features/getFeatures"

export async function GET() {
  const { admin, error, status } = await verifyAdminAccess()
  if (error) return NextResponse.json({ error }, { status })

  try {
    const supabase = getSupabaseServiceRoleClient()

    const { data, error: queryError } = await supabase
      .from("plans")
      .select("*")
      .order("sort_order", { ascending: true })

    if (queryError) throw queryError

    // Enrich with business count per plan
    const enriched = await Promise.all(
      (data || []).map(async (plan: any) => {
        const { count } = await supabase
          .from("subscriptions")
          .select("id", { count: "exact" })
          .eq("plan_name", plan.name)

        return { ...plan, businessCount: count || 0 }
      })
    )

    return NextResponse.json({ plans: enriched })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load plans" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const { admin, error, status } = await verifyAdminAccess()
  if (error) return NextResponse.json({ error }, { status })

  try {
    const body = await request.json()
    const supabase = getSupabaseServiceRoleClient()

    const { data, error: insertError } = await supabase
      .from("plans")
      .insert(body)
      .select()
      .single()

    if (insertError) throw insertError

    await logAdminAction({
      adminId: admin!.id,
      action: "create_plan",
      targetType: "plan",
      targetId: data.id,
      description: `Created new plan: ${data.display_name}`,
      newValue: body,
    })

    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to create plan" },
      { status: 500 }
    )
  }
}
