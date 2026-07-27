import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"
import { requireBusinessUser } from "@/lib/auth/checkRole"

export async function GET(request: NextRequest) {
  const { error, business } = await requireBusinessUser(request)
  if (error) return error

  try {
    const adminDb = getSupabaseServiceRoleClient()
    const { data: branding } = await adminDb
      .from("invoice_branding")
      .select("*")
      .eq("business_id", business.id)
      .maybeSingle()

    const defaultBranding = {
      primary_color: "#1A1A1A",
      accent_color: "#E91E63",
      font_family: "Inter",
      template_style: "modern",
      show_logo: true,
      show_qr_code: true,
      show_stamp: false,
      stamp_url: null,
      signature_url: null,
      custom_watermark: "",
      show_collectbot_badge: true,
      terms_text: business.default_terms || "Payment is due within 7 days.",
      notes_text: business.default_notes || "Thank you for your business!"
    }

    return NextResponse.json({ branding: branding || defaultBranding })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load branding" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const { error, business, role } = await requireBusinessUser(request)
  if (error) return error

  if (role !== "OWNER") {
    return NextResponse.json({ error: "Only business owners can update branding settings." }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { 
      primary_color, 
      accent_color, 
      font_family, 
      template_style, 
      show_logo, 
      show_qr_code, 
      show_stamp, 
      stamp_url, 
      signature_url, 
      custom_watermark, 
      show_collectbot_badge, 
      terms_text, 
      notes_text 
    } = body

    const adminDb = getSupabaseServiceRoleClient()

    const updates = {
      business_id: business.id,
      primary_color: primary_color || "#1A1A1A",
      accent_color: accent_color || "#E91E63",
      font_family: font_family || "Inter",
      template_style: template_style || "modern",
      show_logo: show_logo !== false,
      show_qr_code: show_qr_code !== false,
      show_stamp: !!show_stamp,
      stamp_url: stamp_url || null,
      signature_url: signature_url || null,
      custom_watermark: custom_watermark || null,
      show_collectbot_badge: show_collectbot_badge !== false,
      terms_text: terms_text || null,
      notes_text: notes_text || null,
      updated_at: new Date().toISOString()
    }

    const { data: branding, error: updateErr } = await adminDb
      .from("invoice_branding")
      .upsert(updates, { onConflict: "business_id" })
      .select()
      .single()

    if (updateErr) throw updateErr

    // Log activity
    await adminDb.from("activity_logs").insert({
      business_id: business.id,
      type: "branding_updated",
      description: `Updated custom invoice theme (${template_style || 'modern'}).`
    })

    return NextResponse.json({ success: true, branding })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update branding settings" }, { status: 500 })
  }
}
