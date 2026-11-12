import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse, type NextRequest } from "next/server"
import { getUserWorkspaces, determineRoleDashboard } from "@/lib/auth/workspaces"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"
import { createDesktopAuthTicket } from "@/lib/auth/desktopTickets"

function getTrustedOrigin(request: NextRequest): string {
  const canonicalOrigin = (process.env.NEXT_PUBLIC_APP_URL || "https://collectbot.vercel.app").replace(/\/$/, "")
  const requestUrl = new URL(request.url)
  const host = requestUrl.hostname
  const isDev = process.env.NODE_ENV !== "production"

  if (host === "collectbot.vercel.app") {
    return "https://collectbot.vercel.app"
  }
  if (isDev && (host === "localhost" || host === "127.0.0.1")) {
    return `${requestUrl.protocol}//${requestUrl.host}`
  }

  return canonicalOrigin
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const desktopState = requestUrl.searchParams.get("desktop_state")
  const origin = getTrustedOrigin(request)

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

  let destination = "/dashboard"
  let activeBusinessId: string | undefined = undefined

  // 1. Check if Super Admin
  const { data: adminUser } = await adminDb
    .from("admin_users")
    .select("role, is_active")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle()

  if (adminUser || user.email === "aryan.nda.2163@gmail.com") {
    destination = "/admin/overview"
  } else {
    // 2. Resolve all workspaces for this user
    const workspaces = await getUserWorkspaces(user.id, user.email || undefined)

    if (workspaces.length === 0) {
      destination = "/onboarding"
    } else if (workspaces.length === 1) {
      const singleWorkspace = workspaces[0]
      destination = determineRoleDashboard(singleWorkspace.role)
      activeBusinessId = singleWorkspace.businessId
    } else {
      destination = "/select-workspace"
      activeBusinessId = workspaces[0]?.businessId
    }
  }

  // ─────────────────────────────────────────────────────────────
  // A. Desktop App OAuth Handoff (Custom Protocol Redirect)
  // ─────────────────────────────────────────────────────────────
  if (desktopState) {
    const rawTicket = await createDesktopAuthTicket({
      userId: user.id,
      sessionData: {
        session: data.session,
        activeBusinessId,
        destination,
      },
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
    })

    const protocolRedirectUrl = `collectbot://auth/callback?ticket=${encodeURIComponent(rawTicket)}&state=${encodeURIComponent(desktopState)}`

    return new NextResponse(
      `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CollectBot Desktop Authentication</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #FAF8F5; color: #1A1A1A; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; text-align: center; }
    .card { background: white; border: 1px solid #EEE9E4; border-radius: 20px; padding: 40px; max-width: 460px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
    .btn { display: inline-block; padding: 12px 28px; border-radius: 9999px; background: #E91E63; color: white; text-decoration: none; font-weight: 700; font-size: 14px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="card">
    <h2 style="margin: 0 0 10px;">Authentication Successful</h2>
    <p style="color: #6B6B6B; font-size: 14px;">Returning to CollectBot Desktop application...</p>
    <a href="${protocolRedirectUrl}" class="btn">Open CollectBot Desktop</a>
    <p style="font-size: 12px; color: #999; margin-top: 24px;">You can safely close this browser window once the desktop app opens.</p>
  </div>
  <script>
    window.location.href = "${protocolRedirectUrl}";
  </script>
</body>
</html>`,
      {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    )
  }

  // ─────────────────────────────────────────────────────────────
  // B. Standard Web Browser Navigation
  // ─────────────────────────────────────────────────────────────
  const response = NextResponse.redirect(`${origin}${destination}`)
  if (activeBusinessId) {
    response.cookies.set("cb_active_business_id", activeBusinessId, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    })
  }

  return response
}
