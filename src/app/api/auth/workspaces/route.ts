import { NextRequest, NextResponse } from "next/server"
import getSupabaseServerClient from "@/lib/supabase/server"
import { getUserWorkspaces, resolveActiveWorkspace } from "@/lib/auth/workspaces"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const cookieStore = await cookies()
    const activeBusinessId = cookieStore.get("cb_active_business_id")?.value || null

    const { activeWorkspace, allWorkspaces } = await resolveActiveWorkspace(
      user.id,
      user.email || undefined,
      activeBusinessId
    )

    return NextResponse.json({
      workspaces: allWorkspaces,
      activeWorkspace,
      total: allWorkspaces.length,
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
      },
    })
  } catch (err: any) {
    console.error("GET /api/auth/workspaces error:", err)
    return NextResponse.json({ error: err.message || "Failed to load workspaces" }, { status: 500 })
  }
}
