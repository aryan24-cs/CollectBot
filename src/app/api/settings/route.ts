import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"
import { requireBusinessUser } from "@/lib/auth/checkRole"

export async function GET(request: NextRequest) {
  const { error: authError, business } = await requireBusinessUser(request)
  if (authError) return authError

  try {
    const adminDb = getSupabaseServiceRoleClient()

    // Fetch or initialize reminder settings
    const { data: settings, error } = await adminDb
      .from("reminder_settings")
      .select("*")
      .eq("business_id", business.id)
      .maybeSingle()

    if (error) throw error

    if (!settings) {
      // Self-initialize default reminder settings row
      const { data: defaultSettings, error: initError } = await adminDb
        .from("reminder_settings")
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

    // Map allowed keys for reminder_settings
    const updates: any = {
      updated_at: new Date().toISOString(),
    }

    if (body.whatsapp_enabled !== undefined) updates.whatsapp_enabled = body.whatsapp_enabled
    if (body.channel_whatsapp !== undefined) updates.whatsapp_enabled = body.channel_whatsapp
    if (body.email_enabled !== undefined) updates.email_enabled = body.email_enabled
    if (body.channel_email !== undefined) updates.email_enabled = body.channel_email
    if (body.sms_enabled !== undefined) updates.sms_enabled = body.sms_enabled
    if (body.auto_remind_on_due_date !== undefined) updates.auto_remind_on_due_date = body.auto_remind_on_due_date
    if (body.auto_remind_overdue !== undefined) updates.auto_remind_overdue = body.auto_remind_overdue
    if (body.overdue_frequency_days !== undefined) updates.overdue_frequency_days = Number(body.overdue_frequency_days)
    if (body.max_reminders !== undefined) updates.max_reminders = Number(body.max_reminders)
    if (body.send_time !== undefined) updates.send_time = body.send_time
    if (body.custom_message_template !== undefined) updates.custom_message_template = body.custom_message_template

    const { data: updatedSettings, error: updateError } = await adminDb
      .from("reminder_settings")
      .upsert({
        business_id: business.id,
        ...updates,
      }, { onConflict: "business_id" })
      .select()
      .single()

    if (updateError) throw updateError

    return NextResponse.json(updatedSettings)
  } catch (err: any) {
    console.error("PUT /api/settings error:", err)
    return NextResponse.json({ error: err.message || "Failed to update settings." }, { status: 500 })
  }
}
