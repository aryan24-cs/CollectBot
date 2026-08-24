import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"
import { requireBusinessUser } from "@/lib/auth/checkRole"

export async function GET(request: NextRequest) {
  const { error: authError, business } = await requireBusinessUser(request)
  if (authError) return authError

  try {
    const adminDb = getSupabaseServiceRoleClient()

    // Fetch or initialize notification settings
    const { data: settings, error } = await adminDb
      .from("notification_settings")
      .select("*")
      .eq("business_id", business.id)
      .maybeSingle()

    if (error) throw error

    if (!settings) {
      // Self-initialize default settings row
      const { data: defaultSettings, error: initError } = await adminDb
        .from("notification_settings")
        .insert({ business_id: business.id })
        .select()
        .single()

      if (initError) throw initError
      return NextResponse.json(defaultSettings)
    }

    return NextResponse.json(settings)
  } catch (err: any) {
    console.error("GET /api/settings error:", err)
    return NextResponse.json({ error: err.message || "Failed to load settings." }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const { error: authError, business, role } = await requireBusinessUser(request)
  if (authError) return authError

  if (role !== "OWNER") {
    return NextResponse.json({ error: "Only the business owner can modify workspace notification settings" }, { status: 403 })
  }

  try {
    const adminDb = getSupabaseServiceRoleClient()
    const body = await request.json()

    // Allowed keys for update
    const allowedKeys = [
      "reminder_7_before",
      "reminder_3_before",
      "reminder_1_before",
      "reminder_due_day",
      "reminder_1_after",
      "reminder_3_after",
      "reminder_7_after",
      "reminder_14_after",
      "channel_whatsapp",
      "channel_email",
      "quiet_hours_start",
      "quiet_hours_end",
      "owner_payment_alert",
      "owner_daily_summary",
    ]

    const updates: any = {}
    for (const key of allowedKeys) {
      if (body[key] !== undefined) {
        updates[key] = body[key]
      }
    }

    const { data: updatedSettings, error: updateError } = await adminDb
      .from("notification_settings")
      .update(updates)
      .eq("business_id", business.id)
      .select()
      .single()

    if (updateError) throw updateError

    return NextResponse.json(updatedSettings)
  } catch (err: any) {
    console.error("PUT /api/settings error:", err)
    return NextResponse.json({ error: err.message || "Failed to update settings." }, { status: 500 })
  }
}
