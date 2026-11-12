import { NextResponse, type NextRequest } from "next/server"
import getSupabaseBrowserClient from "@/lib/supabase/client"
import { checkRateLimit, getClientIp, buildRateLimitResponse } from "@/lib/security/rateLimit"

function getTrustedOrigin(request: NextRequest): string {
  const canonicalOrigin = (process.env.NEXT_PUBLIC_APP_URL || "https://collectbot.vercel.app").replace(/\/$/, "")
  const requestUrl = new URL(request.url)
  const host = requestUrl.hostname
  const isDev = process.env.NODE_ENV !== "production"

  // Only permit canonical production host, or localhost/127.0.0.1 in development
  if (host === "collectbot.vercel.app") {
    return "https://collectbot.vercel.app"
  }
  if (isDev && (host === "localhost" || host === "127.0.0.1")) {
    return `${requestUrl.protocol}//${requestUrl.host}`
  }

  return canonicalOrigin
}

export async function GET(request: NextRequest) {
  const clientIp = getClientIp(request)
  const rateCheck = checkRateLimit(`desktop_login:${clientIp}`, { limit: 30, windowMs: 60 * 1000 })
  if (!rateCheck.allowed) {
    return buildRateLimitResponse(rateCheck.limit, rateCheck.remaining, rateCheck.retryAfterSeconds)
  }

  const requestUrl = new URL(request.url)
  const state = requestUrl.searchParams.get("state")
  const origin = getTrustedOrigin(request)

  if (!state || typeof state !== "string" || state.length < 16) {
    return NextResponse.json({ error: "Invalid or missing OAuth state parameter." }, { status: 400 })
  }

  try {
    const supabase = getSupabaseBrowserClient()

    // Initiate Google OAuth with desktop state passed through to callback
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/api/auth/callback?desktop_state=${encodeURIComponent(state)}`,
        queryParams: {
          access_type: "offline",
          prompt: "select_account",
        },
        skipBrowserRedirect: true,
      },
    })

    if (error || !data?.url) {
      console.error("[DesktopAuth] Google OAuth initialization failed:", error)
      return NextResponse.json({ error: error?.message || "Failed to initialize Google authentication." }, { status: 500 })
    }

    // Redirect system browser to Google Accounts login
    return NextResponse.redirect(data.url)
  } catch (err: any) {
    console.error("[DesktopAuth] Unexpected login error:", err)
    return NextResponse.json({ error: "Internal server error during OAuth initialization." }, { status: 500 })
  }
}

