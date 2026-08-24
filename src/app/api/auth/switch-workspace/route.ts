import { NextRequest, NextResponse } from "next/server"
import getSupabaseServerClient from "@/lib/supabase/server"
import { getUserWorkspaces, determineRoleDashboard } from "@/lib/auth/workspaces"

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { businessId } = body

    if (!businessId) {
      return NextResponse.json({ error: "businessId is required" }, { status: 400 })
    }

    // Verify user belongs to the requested business
    const workspaces = await getUserWorkspaces(user.id, user.email || undefined)
    const targetWorkspace = workspaces.find((w) => w.businessId === businessId)

    if (!targetWorkspace) {
      return NextResponse.json(
        { error: "Forbidden: You do not have access to this business workspace." },
        { status: 403 }
      )
    }

    const destination = determineRoleDashboard(targetWorkspace.role)
    const response = NextResponse.json({
      success: true,
      businessId: targetWorkspace.businessId,
      businessName: targetWorkspace.businessName,
      role: targetWorkspace.role,
      destination,
    })

    // Set cookie on response
    response.cookies.set("cb_active_business_id", targetWorkspace.businessId, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    })

    return response
  } catch (err: any) {
    console.error("POST /api/auth/switch-workspace error:", err)
    return NextResponse.json({ error: err.message || "Failed to switch workspace" }, { status: 500 })
  }
}
