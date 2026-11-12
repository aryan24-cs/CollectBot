import { NextResponse, type NextRequest } from "next/server"
import { consumeDesktopAuthTicket } from "@/lib/auth/desktopTickets"
import { checkRateLimit, getClientIp, buildRateLimitResponse } from "@/lib/security/rateLimit"

function getSupabaseCookieName(): string {
  const rawUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "https://faoetyzqzqqtwatflefk.supabase.co").trim()
  try {
    const hostname = new URL(rawUrl).hostname
    const projectRef = hostname.split(".")[0]
    return `sb-${projectRef}-auth-token`
  } catch {
    return "sb-faoetyzqzqqtwatflefk-auth-token"
  }
}

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request)
  const rateCheck = checkRateLimit(`desktop_exchange:${clientIp}`, { limit: 60, windowMs: 60 * 1000 })
  if (!rateCheck.allowed) {
    return buildRateLimitResponse(rateCheck.limit, rateCheck.remaining, rateCheck.retryAfterSeconds)
  }

  try {
    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Malformed or invalid JSON body." }, { status: 400 })
    }

    const { ticket } = body || {}

    if (!ticket || typeof ticket !== "string") {
      return NextResponse.json({ error: "Missing authentication ticket." }, { status: 400 })
    }

    const sessionData = await consumeDesktopAuthTicket(ticket)

    if (!sessionData) {
      return NextResponse.json(
        { error: "Invalid, expired, or previously redeemed authentication ticket." },
        { status: 401 }
      )
    }

    const { session, activeBusinessId, destination } = sessionData
    const cookieName = getSupabaseCookieName()

    // Construct Supabase SSR serialized session cookie
    const serializedAuthToken = JSON.stringify([
      session?.access_token,
      session?.refresh_token,
      null,
      null,
      null,
    ])

    const response = NextResponse.json({
      success: true,
      destination: destination || "/dashboard",
      activeBusinessId,
      session: {
        access_token: session?.access_token,
        refresh_token: session?.refresh_token,
        expires_at: session?.expires_at,
        user: session?.user,
      },
      supabaseCookie: {
        name: cookieName,
        value: serializedAuthToken,
      },
    })

    // Set Supabase SSR cookie in HTTP response
    response.cookies.set(cookieName, serializedAuthToken, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    })

    // Set active workspace cookie in HTTP response
    if (activeBusinessId) {
      response.cookies.set("cb_active_business_id", activeBusinessId, {
        path: "/",
        httpOnly: false,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 30, // 30 days
      })
    }

    return response
  } catch (err: any) {
    console.error("[DesktopAuth] Ticket exchange error:", err)
    return NextResponse.json({ error: "Failed to exchange ticket." }, { status: 500 })
  }
}
