import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Do not run middleware logic on static files or public assets
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.includes('.') ||
    request.nextUrl.pathname === '/favicon.ico'
  ) {
    return supabaseResponse
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/signup')
  
  // Dashboard routes include subfolders under (dashboard)
  const isDashboardRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/clients') ||
    pathname.startsWith('/invoices') ||
    pathname.startsWith('/reminders') ||
    pathname.startsWith('/settings')
    
  const isOnboardingRoute = pathname.startsWith('/onboarding')

  // API protection (except webhooks)
  const isApiRoute = pathname.startsWith('/api/')
  const isWebhook = pathname.startsWith('/api/webhooks/')
  const isProtectedApi = isApiRoute && !isWebhook

  // 1. Redirect unauthenticated users trying to access protected paths
  if (!user && (isDashboardRoute || isOnboardingRoute || isProtectedApi)) {
    const url = request.nextUrl.clone()
    if (isProtectedApi) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // 2. Redirect authenticated users trying to access login/signup
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
