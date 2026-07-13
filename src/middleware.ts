import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  
  // ─────────────────────────────────────────
  // PUBLIC ROUTES (no auth needed)
  // ─────────────────────────────────────────
  const publicRoutes = ['/', '/pricing', '/about', '/contact', '/privacy', '/refund', '/terms']
  const publicPrefixes = ['/pay/', '/api/webhooks/', '/api/health']
  
  const isPublic = 
    publicRoutes.includes(path) ||
    publicPrefixes.some(prefix => path.startsWith(prefix))
  
  if (isPublic) {
    return NextResponse.next()
  }
  
  // ─────────────────────────────────────────
  // AUTH ROUTES (login, signup)
  // ─────────────────────────────────────────
  const authRoutes = ['/login', '/signup', '/forgot-password']
  const isAuthRoute = authRoutes.includes(path)
  
  // Create Supabase client in middleware context
  const response = NextResponse.next()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          // Creating response object and copying cookies
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )
  
  const { data: { user } } = await supabase.auth.getUser()
  
  // Not logged in
  if (!user) {
    if (isAuthRoute) return response  // Allow access
    // Redirect to login for protected routes
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  // ─────────────────────────────────────────
  // USER IS LOGGED IN — CHECK ROLE
  // ─────────────────────────────────────────
  
  // Check if user is admin in admin_users
  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('id, role, is_active')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()
  
  const isAdmin = !!adminUser || user.email === 'aryan.nda.2163@gmail.com'
  
  // ─────────────────────────────────────────
  // CRITICAL ROUTING LOGIC
  // ─────────────────────────────────────────
  
  // Admin trying to access ANY user route → redirect to /admin/overview
  if (isAdmin) {
    const userRoutes = [
      '/dashboard',
      '/invoices',
      '/clients',
      '/reminders',
      '/settings',
      '/onboarding',
    ]
    
    const isUserRoute = userRoutes.some(route => 
      path.startsWith(route)
    )
    
    if (isUserRoute) {
      // Admin should NEVER see user dashboard
      return NextResponse.redirect(
        new URL('/admin/overview', request.url)
      )
    }
    
    // Admin on auth routes → redirect to admin
    if (isAuthRoute) {
      return NextResponse.redirect(
        new URL('/admin/overview', request.url)
      )
    }
    
    // Admin accessing /admin/* or api routes → allow
    if (path.startsWith('/admin') || path.startsWith('/api')) {
      return response
    }
    
    // Admin accessing anything else → redirect to admin
    return NextResponse.redirect(
      new URL('/admin/overview', request.url)
    )
  }
  
  // ─────────────────────────────────────────
  // NON-ADMIN USER (BUSINESS OWNER)
  // ─────────────────────────────────────────
  
  // Business user trying to access /admin/* → redirect to dashboard
  if (path.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  
  // Business user on auth routes → redirect to dashboard
  if (isAuthRoute) {
    return NextResponse.redirect(
      new URL('/dashboard', request.url)
    )
  }
  
  // Check if business setup complete
  const isDashboardRoute =
    path.startsWith('/dashboard') || 
    path.startsWith('/invoices') || 
    path.startsWith('/clients') ||
    path.startsWith('/reminders') ||
    path.startsWith('/settings')
    
  if (isDashboardRoute) {
    const { data: business } = await supabase
      .from('businesses')
      .select('id, name')
      .eq('user_id', user.id)
      .maybeSingle()
    
    if (!business) {
      // No business setup — force onboarding
      return NextResponse.redirect(
        new URL('/onboarding', request.url)
      )
    }
  }
  
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
