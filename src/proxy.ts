import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"
import { getUserWorkspaces, determineRoleDashboard } from "@/lib/auth/workspaces"

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  const isApiRoute = path.startsWith("/api/")

  // ─────────────────────────────────────────
  // 1. PUBLIC ROUTES (No Auth Required)
  // ─────────────────────────────────────────
  const publicRoutes = ["/", "/pricing", "/about", "/contact", "/privacy", "/refund", "/terms"]
  const publicPrefixes = ["/pay/", "/api/webhooks/", "/api/health/", "/api/auth/callback", "/api/auth/route-user"]

  const isPublic =
    publicRoutes.includes(path) ||
    publicPrefixes.some((prefix) => path.startsWith(prefix))

  if (isPublic) {
    return NextResponse.next()
  }

  // ─────────────────────────────────────────
  // 2. AUTH ROUTES
  // ─────────────────────────────────────────
  const authRoutes = ["/login", "/signup", "/forgot-password"]
  const isAuthRoute = authRoutes.includes(path)
  const isSelectWorkspaceRoute = path === "/select-workspace"

  const response = NextResponse.next()

  try {
    const rawUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/^["']|["']$/g, "") || "https://faoetyzqzqqtwatflefk.supabase.co"
    const rawKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim().replace(/^["']|["']$/g, "") || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhb2V0eXpxenFxdHdhdGZsZWZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NjUxMTYsImV4cCI6MjA5OTE0MTExNn0.iXGvbxN7wz0UgkkBU48uPxRmskJ6QpKBjsH_7YcUA18"

    const supabase = createServerClient(rawUrl, rawKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    })

    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Unauthenticated State
    if (!user) {
      if (isAuthRoute) return response
      if (isApiRoute) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      return NextResponse.redirect(new URL("/login", request.url))
    }

    // ─────────────────────────────────────────
    // 3. SUPER ADMIN CHECK
    // ─────────────────────────────────────────
    const adminDb = getSupabaseServiceRoleClient()
    const { data: adminUser } = await adminDb
      .from("admin_users")
      .select("id, role, is_active")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle()

    const isSuperAdmin = !!adminUser || user.email === "aryan.nda.2163@gmail.com"

    if (isSuperAdmin && (path.startsWith("/admin") || isApiRoute)) {
      return response
    }

    // ─────────────────────────────────────────
    // 4. RESOLVE USER WORKSPACES
    // ─────────────────────────────────────────
    const workspaces = await getUserWorkspaces(user.id, user.email || undefined)

    // User has 0 workspaces -> Force Onboarding for pages, let APIs pass through
    if (workspaces.length === 0) {
      if (isSuperAdmin) {
        return NextResponse.redirect(new URL("/admin/overview", request.url))
      }
      if (isApiRoute) {
        return response
      }
      if (path === "/onboarding") {
        return response
      }
      return NextResponse.redirect(new URL("/onboarding", request.url))
    }

    // Authenticated user hitting Auth Routes (login/signup)
    if (isAuthRoute) {
      if (isSuperAdmin) {
        return NextResponse.redirect(new URL("/admin/overview", request.url))
      }
      if (workspaces.length === 1) {
        const dest = determineRoleDashboard(workspaces[0].role)
        return NextResponse.redirect(new URL(dest, request.url))
      }
      return NextResponse.redirect(new URL("/select-workspace", request.url))
    }

    // If user is accessing /select-workspace, allow it
    if (isSelectWorkspaceRoute) {
      return response
    }

    // ─────────────────────────────────────────
    // 5. ACTIVE WORKSPACE DETERMINATION & ROUTE ACCESS
    // ─────────────────────────────────────────
    const activeBusinessIdCookie = request.cookies.get("cb_active_business_id")?.value
    let activeWorkspace = workspaces.find((w) => w.businessId === activeBusinessIdCookie)

    if (!activeWorkspace) {
      // Default to first owned business, or first available membership
      activeWorkspace = workspaces.find((w) => w.isOwner) || workspaces[0]
      response.cookies.set("cb_active_business_id", activeWorkspace.businessId, {
        path: "/",
        httpOnly: false,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
      })
    }

    const userRole = activeWorkspace.role
    const targetDashboard = determineRoleDashboard(userRole)

    // Prevent non-owners from entering onboarding page
    if (!activeWorkspace.isOwner && path === "/onboarding") {
      return NextResponse.redirect(new URL(targetDashboard, request.url))
    }

    // ─────────────────────────────────────────
    // 6. DEPARTMENT SCOPE SECURITY ENFORCEMENT
    // ─────────────────────────────────────────
    const financePaths = ["/invoices", "/expenses", "/approvals", "/reminders", "/settings/gateways", "/settings/exports"]
    const salesPaths = ["/dashboard/sales"]
    const marketingPaths = ["/dashboard/marketing"]

    const isFinancePath = financePaths.some((p) => path.startsWith(p))
    const isSalesPath = salesPaths.some((p) => path.startsWith(p))
    const isMarketingPath = marketingPaths.some((p) => path.startsWith(p))

    if (isFinancePath && userRole !== "OWNER" && userRole !== "FINANCE") {
      if (isApiRoute) {
        return NextResponse.json({ error: "Forbidden: Finance role required" }, { status: 403 })
      }
      return NextResponse.redirect(new URL(targetDashboard, request.url))
    }
    if (isSalesPath && userRole !== "OWNER" && userRole !== "SALES") {
      if (isApiRoute) {
        return NextResponse.json({ error: "Forbidden: Sales role required" }, { status: 403 })
      }
      return NextResponse.redirect(new URL(targetDashboard, request.url))
    }
    if (isMarketingPath && userRole !== "OWNER" && userRole !== "MARKETING") {
      if (isApiRoute) {
        return NextResponse.json({ error: "Forbidden: Marketing role required" }, { status: 403 })
      }
      return NextResponse.redirect(new URL(targetDashboard, request.url))
    }

    return response
  } catch (err) {
    console.error("Proxy middleware error:", err)
    if (isAuthRoute) return response
    if (isApiRoute) {
      return NextResponse.json({ error: "Internal middleware error" }, { status: 500 })
    }
    return response
  }
}

export default proxy
export const middleware = proxy

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
