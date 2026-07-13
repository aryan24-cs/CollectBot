import { NextRequest, NextResponse } from "next/server"
import getSupabaseServerClient from "@/lib/supabase/server"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 1. Get user's business
    const { data: business } = await supabase
      .from("businesses")
      .select("id, name")
      .eq("user_id", user.id)
      .maybeSingle()

    if (!business) {
      return NextResponse.json({ error: "Business profile not found" }, { status: 404 })
    }

    const { planName } = await request.json()
    if (!planName || !["free", "solo", "business", "scale"].includes(planName)) {
      return NextResponse.json({ error: "Invalid plan name" }, { status: 400 })
    }

    const serviceClient = getSupabaseServiceRoleClient()

    // 2. Fetch the plan details
    const { data: planRecord } = await serviceClient
      .from("plans")
      .select("id, name")
      .eq("name", planName)
      .single()

    if (!planRecord) {
      return NextResponse.json({ error: "Selected plan not found" }, { status: 404 })
    }

    // 3. Upsert/Update the subscription record
    const currentPeriodEnd = new Date()
    currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 30)

    const { error: subError } = await serviceClient
      .from("subscriptions")
      .upsert({
        business_id: business.id,
        plan_id: planRecord.id,
        plan_name: planName,
        plan: planName,
        billing_cycle: "monthly",
        status: "active",
        current_period_start: new Date().toISOString(),
        current_period_end: currentPeriodEnd.toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "business_id"
      })

    if (subError) throw subError

    // 4. Log activity
    await serviceClient.from("activity_logs").insert({
      business_id: business.id,
      type: "subscription_upgraded",
      description: `Plan upgraded to "${planName.toUpperCase()}".`,
      metadata: { plan_name: planName }
    })

    return NextResponse.json({ success: true, message: `Successfully upgraded to ${planName}` })
  } catch (err: any) {
    console.error("Plan upgrade error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}