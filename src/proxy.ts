import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseServiceRoleClient } from '@/lib/supabase/serviceRole'

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  
  // ─────────────────────────────────────────
  // PUBLIC ROUTES (no auth needed)
  // ─────────────────────────────────────────
  const publicRoutes = ['/', '/pricing', '/about', '/contact', '/privacy', '/refund', '/terms']
  const publicPrefixes = ['/pay/', '/api/webhooks/', '/api/health', '/api/auth/']
  
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
  
  // Create Supabase client in proxy context for auth token parsing
  const response = NextResponse.next()

  try {
    const rawUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/^["']|["']$/g, "") || "https://faoetyzqzqqtwatflefk.supabase.co"
    const rawKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim().replace(/^["']|["']$/g, "") || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhb2V0eXpxenFxdHdhdGZsZWZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NjUxMTYsImV4cCI6MjA5OTE0MTExNn0.iXGvbxN7wz0UgkkBU48uPxRmskJ6QpKBjsH_7YcUA18"

    const supabase = createServerClient(
      rawUrl,
      rawKey,
      {
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
      }
    )
    
    const { data: { user } } = await supabase.auth.getUser()
    
    // Not logged in
    if (!user) {
      if (isAuthRoute) return response
      if (path.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      return NextResponse.redirect(new URL('/login', request.url))
    }
    
    // ─────────────────────────────────────────
    // USER IS LOGGED IN — CHECK ROLE (Service Role to bypass RLS)
    // ─────────────────────────────────────────
    const adminDb = getSupabaseServiceRoleClient()
    
    // Check if user is admin in admin_users
    const { data: adminUser } = await adminDb
      .from('admin_users')
      .select('id, role, is_active')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()
    
    const isAdmin = !!adminUser || user.email === 'aryan.nda.2163@gmail.com'
    
    // ─────────────────────────────────────────
    // CRITICAL ROUTING LOGIC FOR ADMINS
    // ─────────────────────────────────────────
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
      
      if (isUserRoute || isAuthRoute) {
        return NextResponse.redirect(
          new URL('/admin/overview', request.url)
        )
      }
      
      if (path.startsWith('/admin') || path.startsWith('/api')) {
        return response
      }
      
      return NextResponse.redirect(
        new URL('/admin/overview', request.url)
      )
    }
    
    // ─────────────────────────────────────────
    // NON-ADMIN USER (BUSINESS OWNER OR EMPLOYEE)
    // ─────────────────────────────────────────
    
    if (path.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // 1. Check if owner
    const { data: business } = await adminDb
      .from('businesses')
      .select('id, name')
      .eq('user_id', user.id)
      .maybeSingle()

    // 2. Check if employee (Double lookup by user_id OR email)
    const { data: employee } = await adminDb
      .from('employees')
      .select('id, business_id, employee_type, designation, status, user_id, email')
      .or(`user_id.eq.${user.id},email.eq.${user.email}`)
      .maybeSingle()

    let userRole = 'UNKNOWN'
    let targetDashboard = '/onboarding'

    if (business) {
      userRole = 'OWNER'
      targetDashboard = '/dashboard'
    } else if (employee) {
      userRole = employee.employee_type || 'FINANCE'
      if (userRole === 'SALES') targetDashboard = '/dashboard/sales'
      else if (userRole === 'MARKETING') targetDashboard = '/dashboard/marketing'
      else targetDashboard = '/dashboard/finance'
    }

    // 3. Un-onboarded Owner (No business and not an employee)
    if (userRole === 'UNKNOWN') {
      if (path === '/onboarding' || path.startsWith('/api/onboarding') || path.startsWith('/api/settings')) {
        return response
      }
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }

    // 4. Employee Zero-Onboarding Enforcement
    if (userRole !== 'OWNER' && path === '/onboarding') {
      return NextResponse.redirect(new URL(targetDashboard, request.url))
    }

    // 5. Auth Route Bypass for Logged-In Users
    if (isAuthRoute) {
      return NextResponse.redirect(new URL(targetDashboard, request.url))
    }

    // 6. Department Scope Security Enforcement
    const financePaths = ['/invoices', '/expenses', '/approvals', '/reminders', '/api/invoices', '/api/payments', '/api/expenses', '/api/approvals']
    const salesPaths = ['/dashboard/sales', '/api/sales']
    const marketingPaths = ['/dashboard/marketing', '/api/marketing']

    const isFinancePath = financePaths.some(p => path.startsWith(p))
    const isSalesPath = salesPaths.some(p => path.startsWith(p))
    const isMarketingPath = marketingPaths.some(p => path.startsWith(p))

    if (isFinancePath && userRole !== 'OWNER' && userRole !== 'FINANCE') {
      return NextResponse.redirect(new URL(targetDashboard, request.url))
    }
    if (isSalesPath && userRole !== 'OWNER' && userRole !== 'SALES') {
      return NextResponse.redirect(new URL(targetDashboard, request.url))
    }
    if (isMarketingPath && userRole !== 'OWNER' && userRole !== 'MARKETING') {
      return NextResponse.redirect(new URL(targetDashboard, request.url))
    }

    return response
  } catch (err) {
    console.error("Proxy middleware error:", err)
    if (isAuthRoute) {
      return response
    }
    if (path.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return response
  }
}

export default proxy
export const middleware = proxy

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
