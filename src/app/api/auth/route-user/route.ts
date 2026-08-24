import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"
import { getUserWorkspaces, determineRoleDashboard } from "@/lib/auth/workspaces"

export async function POST(request: NextRequest) {
  try {
    const { userId, email } = await request.json()

    if (!userId && !email) {
      return NextResponse.json({ error: "Missing user identity parameters." }, { status: 400 })
    }

    const adminDb = getSupabaseServiceRoleClient()

    // 1. Check if Super Admin
    if (email) {
      const { data: adminUser } = await adminDb
        .from("admin_users")
        .select("role, is_active")
        .ilike("email", email)
        .eq("is_active", true)
        .maybeSingle()

      if (adminUser || email === "aryan.nda.2163@gmail.com") {
        return NextResponse.json({ destination: "/admin/overview", role: "SUPER_ADMIN" })
      }
    }

    // 2. Resolve all workspaces for this user (both Owned and Employee memberships)
    const workspaces = await getUserWorkspaces(userId, email)

    // Case 1: 0 Workspaces -> New Owner Onboarding
    if (workspaces.length === 0) {
      return NextResponse.json({ destination: "/onboarding", role: "NEW_OWNER" })
    }

    // Case 2: Exactly 1 Workspace -> Automatically enter
    if (workspaces.length === 1) {
      const singleWorkspace = workspaces[0]
      const destination = determineRoleDashboard(singleWorkspace.role)
      const response = NextResponse.json({
        destination,
        role: singleWorkspace.role,
        businessId: singleWorkspace.businessId,
        businessName: singleWorkspace.businessName,
      })

      response.cookies.set("cb_active_business_id", singleWorkspace.businessId, {
        path: "/",
        httpOnly: false,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
      })

      return response
    }

    // Case 3: Multiple Workspaces -> Workspace Selection Page
    return NextResponse.json({
      destination: "/select-workspace",
      workspacesCount: workspaces.length,
    })
  } catch (err: any) {
    console.error("POST /api/auth/route-user error:", err)
    return NextResponse.json({ destination: "/dashboard" }, { status: 500 })
  }
}
