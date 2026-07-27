import getSupabaseServerClient from "@/lib/supabase/server"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"
import { NextResponse } from "next/server"

export async function requireBusinessUser(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { 
      error: NextResponse.json(
        { error: "Unauthorized" }, 
        { status: 401 }
      ),
      user: null,
      business: null
    }
  }
  
  // Reject if admin (admins shouldn't call user APIs)
  const { data: adminCheck } = await supabase
    .from("admin_users")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle()

  const isAdmin = !!adminCheck || user.email === "aryan.nda.2163@gmail.com"
  
  if (isAdmin) {
    return {
      error: NextResponse.json(
        { error: "Admins cannot access user endpoints" }, 
        { status: 403 }
      ),
      user: null,
      business: null
    }
  }

  // Use service role client for business/employee lookups to bypass
  // the recursive RLS policy on employees table
  const adminDb = getSupabaseServiceRoleClient()
  
  let business = null
  let employee = null

  // 1. Check if direct business owner
  const { data: directBusiness } = await adminDb
    .from("businesses")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle()

  if (directBusiness) {
    business = directBusiness
  } else {
    // 2. Check if employee linked to a business by user_id or email
    let { data: empRecord } = await adminDb
      .from("employees")
      .select("*, business:businesses(*)")
      .eq("user_id", user.id)
      .maybeSingle()

    if (!empRecord && user.email) {
      const { data: empByEmail } = await adminDb
        .from("employees")
        .select("*, business:businesses(*)")
        .ilike("email", user.email)
        .maybeSingle()
      empRecord = empByEmail
    }

    if (empRecord && empRecord.business) {
      if (empRecord.status === "suspended") {
        return {
          error: NextResponse.json({ error: "Employee account suspended" }, { status: 403 }),
          user: null,
          business: null,
          employee: null,
          role: null
        }
      }

      // Auto link user_id and activate status if missing
      if (!empRecord.user_id || empRecord.status !== "active") {
        await adminDb
          .from("employees")
          .update({ user_id: user.id, status: "active" })
          .eq("id", empRecord.id)
      }

      business = empRecord.business
      employee = empRecord
    }
  }
  
  if (!business) {
    return {
      error: NextResponse.json(
        { error: "Business not found or access denied" }, 
        { status: 404 }
      ),
      user: null,
      business: null,
      employee: null,
      role: null
    }
  }
  
  const role = directBusiness ? 'OWNER' : (employee?.employee_type || 'FINANCE')
  
  return { error: null, user, business, employee, role }
}

export async function requireAdmin(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { 
      error: NextResponse.json(
        { error: "Unauthorized" }, 
        { status: 401 }
      ),
      admin: null
    }
  }
  
  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle()
  
  let adminUserToReturn = adminUser
  if (!adminUserToReturn && user.email === "aryan.nda.2163@gmail.com") {
    adminUserToReturn = {
      id: "admin-fallback",
      user_id: user.id,
      role: "super_admin",
      is_active: true
    } as any
  }
  
  if (!adminUserToReturn) {
    return {
      error: NextResponse.json(
        { error: "Admin access required" }, 
        { status: 403 }
      ),
      admin: null
    }
  }
  
  return { error: null, admin: adminUserToReturn }
}
