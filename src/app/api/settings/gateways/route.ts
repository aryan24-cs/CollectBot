import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"
import { requireBusinessUser } from "@/lib/auth/checkRole"

export async function GET(request: NextRequest) {
  const { error, business } = await requireBusinessUser(request)
  if (error) return error

  try {
    const adminDb = getSupabaseServiceRoleClient()
    const { data: gateways, error: fetchError } = await adminDb
      .from("payment_gateways")
      .select("id, provider, key_id, is_enabled, is_test_mode, created_at, updated_at")
      .eq("business_id", business.id)

    if (fetchError) throw fetchError

    return NextResponse.json({ gateways: gateways || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load payment gateways" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { error, business, role } = await requireBusinessUser(request)
  if (error) return error

  if (role !== "OWNER") {
    return NextResponse.json({ error: "Only the business owner can configure payment gateways." }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { provider, key_id, key_secret, webhook_secret, is_enabled, is_test_mode } = body

    if (!provider || !key_id || !key_secret) {
      return NextResponse.json({ error: "Provider, Key ID, and Key Secret are required." }, { status: 400 })
    }

    const adminDb = getSupabaseServiceRoleClient()

    // Upsert payment gateway credentials
    const { data: gateway, error: upsertError } = await adminDb
      .from("payment_gateways")
      .upsert({
        business_id: business.id,
        provider,
        key_id: key_id.trim(),
        key_secret: key_secret.trim(),
        webhook_secret: webhook_secret ? webhook_secret.trim() : null,
        is_enabled: is_enabled !== false,
        is_test_mode: !!is_test_mode,
        updated_at: new Date().toISOString()
      }, { onConflict: "business_id,provider" })
      .select("id, provider, key_id, is_enabled, is_test_mode")
      .single()

    if (upsertError) throw upsertError

    // Log activity
    await adminDb.from("activity_logs").insert({
      business_id: business.id,
      type: "gateway_configured",
      description: `Configured payment gateway (${provider.toUpperCase()}).`,
      metadata: { provider }
    })

    return NextResponse.json({ success: true, gateway }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to save payment gateway credentials." }, { status: 500 })
  }
}
