import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"

export async function POST(request: NextRequest) {
  try {
    const { userId, email } = await request.json()

    if (!userId && !email) {
      return NextResponse.json({ error: "Missing user identity parameters." }, { status: 400 })
    }

    const adminDb = getSupabaseServiceRoleClient()

    // 1. Check if admin user
    if (email) {
      const { data: adminUser } = await adminDb
        .from("admin_users")
        .select("role, is_active")
        .ilike("email", email)
        .eq("is_active", true)
        .maybeSingle()

      if (adminUser || email === "aryan.nda.2163@gmail.com") {
        return NextResponse.json({ destination: "/admin/overview" })
      }
    }

    // 2. Check if employee (by user_id OR email)
    let employee: any = null
    if (userId) {
      const { data: empById } = await adminDb
        .from("employees")
        .select("id, user_id, status, employee_type")
        .eq("user_id", userId)
        .maybeSingle()
      employee = empById
    }

    if (!employee && email) {
      const { data: empByEmail } = await adminDb
        .from("employees")
        .select("id, user_id, status, employee_type")
        .ilike("email", email)
        .maybeSingle()
      employee = empByEmail
    }

    if (employee) {
      if (employee.status === "suspended") {
        return NextResponse.json({ error: "Account suspended. Please contact administrator.", destination: "/login?error=suspended" }, { status: 403 })
      }

      // Auto-link user_id & activate status if missing
      if ((!employee.user_id && userId) || employee.status !== "active") {
        await adminDb
          .from("employees")
          .update({ user_id: userId, status: "active" })
          .eq("id", employee.id)
      }

      const empType = (employee.employee_type || "FINANCE").toUpperCase()
      const destination = 
        empType === "SALES" ? "/dashboard/sales" :
        empType === "MARKETING" ? "/dashboard/marketing" :
        "/dashboard/finance"

      return NextResponse.json({ destination, role: empType })
    }

    // 3. Check if business owner
    if (userId) {
      const { data: business } = await adminDb
        .from("businesses")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle()

      if (business) {
        return NextResponse.json({ destination: "/dashboard", role: "OWNER" })
      }
    }

    // 4. Default for new business owner (no business setup yet)
    return NextResponse.json({ destination: "/onboarding", role: "OWNER_NEW" })
  } catch (err: any) {
    console.error("POST /api/auth/route-user error:", err)
    return NextResponse.json({ destination: "/dashboard" }, { status: 500 })
  }
}
