import { NextRequest, NextResponse } from "next/server"
import getSupabaseServerClient from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 1. Get business of this user
    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()

    if (!business) {
      return NextResponse.json({ error: "Business profile not found." }, { status: 400 })
    }

    // 2. Fetch or initialize notification settings
    const { data: settings, error } = await supabase
      .from("notification_settings")
      .select("*")
      .eq("business_id", business.id)
      .maybeSingle()

    if (error) throw error

    if (!settings) {
      // Self-initialize default settings row
      const { data: defaultSettings, error: initError } = await supabase
        .from("notification_settings")
        .insert({ business_id: business.id })
        .select()
        .single()

      if (initError) throw initError
      return NextResponse.json(defaultSettings)
    }

    return NextResponse.json(settings)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load settings." }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 1. Get business of this user
    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()

    if (!business) {
      return NextResponse.json({ error: "Business profile not found." }, { status: 400 })
    }

    const body = await request.json()

    // 2. Filter allowed keys for update
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

    // 3. Upsert update settings
    const { data: updatedSettings, error: updateError } = await supabase
      .from("notification_settings")
      .update(updates)
      .eq("business_id", business.id)
      .select()
      .single()

    if (updateError) throw updateError

    return NextResponse.json(updatedSettings)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update settings." }, { status: 500 })
  }
}
