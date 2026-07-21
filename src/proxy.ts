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
  
  let userRole = 'OWNER'
  let isEmployee = false

  if (!business) {
    // 2. Check if employee by user_id or email
    let { data: employee } = await adminDb
      .from('employees')
      .select('id, user_id, status, employee_type')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!employee && user.email) {
      const { data: empByEmail } = await adminDb
        .from('employees')
        .select('id, user_id, status, employee_type')
        .ilike('email', user.email)
        .maybeSingle()
      employee = empByEmail
    }

    if (!employee) {
      // No business or employee match — force onboarding
      if (path !== '/onboarding') {
        return NextResponse.redirect(
          new URL('/onboarding', request.url)
        )
      }
      return response
    }

    if (employee.status === 'suspended') {
      return NextResponse.redirect(
        new URL('/login?error=suspended', request.url)
      )
    }

    // Auto link user_id if needed
    if (!employee.user_id || employee.status !== 'active') {
      await adminDb
        .from('employees')
        .update({ user_id: user.id, status: 'active' })
        .eq('id', employee.id)
    }

    isEmployee = true
    userRole = (employee.employee_type || 'FINANCE').toUpperCase()
  }

  // Determine correct landing dashboard target for this role
  const targetDashboard = 
    userRole === 'SALES' ? '/dashboard/sales' :
    userRole === 'MARKETING' ? '/dashboard/marketing' :
    userRole === 'FINANCE' ? '/dashboard/finance' :
    '/dashboard'

  // If logged-in user hits auth routes (/login, /signup), redirect STRAIGHT to targetDashboard!
  if (isAuthRoute) {
    return NextResponse.redirect(new URL(targetDashboard, request.url))
  }

  // If employee hits generic /dashboard or /onboarding, redirect STRAIGHT to department dashboard!
  if (isEmployee && (path === '/dashboard' || path === '/onboarding')) {
    return NextResponse.redirect(new URL(targetDashboard, request.url))
  }

  // Role-based route protection
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
}

export default proxy
export const middleware = proxy

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
