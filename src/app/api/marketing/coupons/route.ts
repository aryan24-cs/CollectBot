import { NextRequest, NextResponse } from "next/server"
import getSupabaseServerClient from "@/lib/supabase/server"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"
import { requireBusinessUser } from "@/lib/auth/checkRole"

export async function GET(request: NextRequest) {
  const { error, user, business, role } = await requireBusinessUser(request)
  if (error) return error

  // Security guard: Only OWNER and MARKETING can access coupons
  if (role !== "OWNER" && role !== "MARKETING") {
    return NextResponse.json({ error: "Access denied: Marketing scope only." }, { status: 403 })
  }

  try {
    const supabase = await getSupabaseServerClient()
    const { data: coupons, error: fetchError } = await supabase
      .from("marketing_coupons")
      .select("*")
      .eq("business_id", business.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })

    if (fetchError) throw fetchError

    return NextResponse.json({ coupons })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load coupons." }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { error, user, business, role } = await requireBusinessUser(request)
  if (error) return error

  // Security guard: Only OWNER and MARKETING can manage marketing coupons
  if (role !== "OWNER" && role !== "MARKETING") {
    return NextResponse.json({ error: "Access denied: Marketing scope only." }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { code, discount_type, discount_value, expires_at, max_uses } = body

    if (!code || !discount_type || !discount_value) {
      return NextResponse.json({ error: "Code, discount type, and value are required." }, { status: 400 })
    }

    const adminDb = getSupabaseServiceRoleClient()

    // Create coupon record
    const { data: coupon, error: insertError } = await adminDb
      .from("marketing_coupons")
      .insert({
        business_id: business.id,
        code: code.trim().toUpperCase(),
        discount_type,
        discount_value: parseFloat(discount_value),
        expires_at: expires_at ? new Date(expires_at).toISOString() : null,
        max_uses: max_uses ? parseInt(max_uses) : 0,
        uses_count: 0,
        created_by: user.id
      })
      .select()
      .single()

    if (insertError) throw insertError

    // Log activity
    await adminDb.from("activity_logs").insert({
      business_id: business.id,
      type: "coupon_created",
      description: `Coupon "${code}" issued with value ${discount_value} (${discount_type}).`,
      created_by: user.id
    })

    return NextResponse.json({ success: true, coupon }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create coupon." }, { status: 500 })
  }
}
