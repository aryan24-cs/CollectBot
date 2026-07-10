import { NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "../middleware"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"

export async function GET(request: NextRequest) {
  const { admin, error, status } = await verifyAdminAccess()
  if (error) return NextResponse.json({ error }, { status })

  try {
    const supabase = getSupabaseServiceRoleClient()
    const { searchParams } = new URL(request.url)

    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = (page - 1) * limit
    const action = searchParams.get("action") || ""
    const targetType = searchParams.get("target_type") || ""

    let query = supabase
      .from("admin_activity_logs")
      .select("*, admin_users(name, email)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (action) query = query.eq("action", action)
    if (targetType) query = query.eq("target_type", targetType)

    const { data, error: queryError, count } = await query

    if (queryError) throw queryError

    return NextResponse.json({
      logs: data || [],
      total: count || 0,
      page,
      limit,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load logs" },
      { status: 500 }
    )
  }
}
