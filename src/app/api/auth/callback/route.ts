import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse, type NextRequest } from "next/server"
import { getUserWorkspaces, determineRoleDashboard } from "@/lib/auth/workspaces"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const origin = requestUrl.origin

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=Missing+OAuth+code`)
  }

  const cookieStore = await cookies()
  const rawUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/^["']|["']$/g, "") || "https://faoetyzqzqqtwatflefk.supabase.co"
  const rawKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim().replace(/^["']|["']$/g, "") || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhb2V0eXpxenFxdHdhdGZsZWZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NjUxMTYsImV4cCI6MjA5OTE0MTExNn0.iXGvbxN7wz0UgkkBU48uPxRmskJ6QpKBjsH_7YcUA18"

  const supabase = createServerClient(
    rawUrl,
    rawKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch (_) {
            // Ignored in Route Handler context
          }
        },
      },
    }
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    console.error("OAuth exchange failed:", error)
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error?.message || "OAuth authentication failed")}`)
  }

  const user = data.user
  const adminDb = getSupabaseServiceRoleClient()

  // 1. Check if Super Admin
  const { data: adminUser } = await adminDb
    .from("admin_users")
    .select("role, is_active")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle()

  if (adminUser || user.email === "aryan.nda.2163@gmail.com") {
    return NextResponse.redirect(`${origin}/admin/overview`)
  }

  // 2. Resolve all workspaces for this user
  const workspaces = await getUserWorkspaces(user.id, user.email || undefined)

  // Case 1: 0 Workspaces (New User) -> Onboarding
  if (workspaces.length === 0) {
    return NextResponse.redirect(`${origin}/onboarding`)
  }

  // Case 2: Exactly 1 Workspace -> Direct enter with cookie set
  if (workspaces.length === 1) {
    const singleWorkspace = workspaces[0]
    const targetDashboard = determineRoleDashboard(singleWorkspace.role)
    const response = NextResponse.redirect(`${origin}${targetDashboard}`)

    response.cookies.set("cb_active_business_id", singleWorkspace.businessId, {
      path: "/",
      httpOnly: false, // Accessible to client components for workspace switcher sync
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    })

    return response
  }

  // Case 3: Multiple Workspaces -> Workspace Selection Page
  return NextResponse.redirect(`${origin}/select-workspace`)
}
