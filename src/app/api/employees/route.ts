import { NextRequest, NextResponse } from "next/server"
import getSupabaseServerClient from "@/lib/supabase/server"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"
import { requireBusinessUser } from "@/lib/auth/checkRole"

export async function GET(request: NextRequest) {
  const { error, business } = await requireBusinessUser(request)
  if (error) return error

  try {
    const supabase = getSupabaseServiceRoleClient()
    const { data: employees, error: empError } = await supabase
      .from("employees")
      .select("*, department:departments(id, name), custom_role:custom_roles(id, name), branch:branches(id, name)")
      .eq("business_id", business.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })

    if (empError) throw empError

    const { data: departments } = await supabase
      .from("departments")
      .select("*")
      .eq("business_id", business.id)

    const { data: customRoles } = await supabase
      .from("custom_roles")
      .select("*")
      .eq("business_id", business.id)

    const { data: branches } = await supabase
      .from("branches")
      .select("*")
      .eq("business_id", business.id)

    return NextResponse.json({ employees: employees || [], departments: departments || [], customRoles: customRoles || [], branches: branches || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load employees" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { error, user, business, role } = await requireBusinessUser(request)
  if (error) return error

  // Only the business owner can invite or create employees
  if (role !== "OWNER") {
    return NextResponse.json({ error: "Only the business owner can invite or create employees" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { 
      email, 
      name, 
      phone, 
      password, 
      designation, 
      employee_type, 
      status, 
      profile_picture_url, 
      notes,
      department_id,
      custom_role_id,
      branch_id,
      employee_id_code,
      permissions
    } = body

    if (!email || !name) {
      return NextResponse.json({ error: "Email and Name are required fields" }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const adminDb = getSupabaseServiceRoleClient()

    // 1. Check if employee already exists in THIS business
    const { data: existingInThisBiz } = await adminDb
      .from("employees")
      .select("id, status")
      .eq("business_id", business.id)
      .ilike("email", normalizedEmail)
      .is("deleted_at", null)
      .maybeSingle()

    if (existingInThisBiz) {
      return NextResponse.json(
        { error: "An employee with this email already belongs to this business workspace." },
        { status: 400 }
      )
    }

    let authUserId: string | null = null

    // 2. Check if auth user already exists in global identity
    const { data: userList } = await adminDb.auth.admin.listUsers()
    const existingAuthUser = userList?.users?.find(
      (u) => u.email?.toLowerCase() === normalizedEmail
    )

    if (existingAuthUser) {
      authUserId = existingAuthUser.id
    } else if (password && password.trim().length >= 6) {
      // Create new auth user if they don't exist
      const { data: createdAuth, error: authError } = await adminDb.auth.admin.createUser({
        email: normalizedEmail,
        password: password.trim(),
        email_confirm: true,
        user_metadata: { full_name: name },
      })

      if (authError) {
        return NextResponse.json({ error: authError.message }, { status: 400 })
      }

      authUserId = createdAuth.user.id
    }

    // 3. Insert employee record linked to current business
    const { data: employee, error: insertError } = await adminDb
      .from("employees")
      .insert({
        business_id: business.id,
        user_id: authUserId,
        email: normalizedEmail,
        name: name.trim(),
        phone: phone || null,
        designation: designation || null,
        employee_type: employee_type || "FINANCE",
        status: status || "active",
        profile_picture_url: profile_picture_url || null,
        notes: notes || null,
        department_id: department_id || null,
        custom_role_id: custom_role_id || null,
        branch_id: branch_id || null,
        employee_id_code: employee_id_code || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (insertError) throw insertError

    // 4. Save permissions overrides if provided
    if (permissions && Array.isArray(permissions) && permissions.length > 0) {
      const inserts = permissions.map((p: any) => ({
        employee_id: employee.id,
        category: p.category,
        action: p.action,
      }))
      await adminDb.from("employee_permissions").insert(inserts)
    }

    // 5. Log activity
    await adminDb.from("activity_logs").insert({
      business_id: business.id,
      type: "employee_created",
      description: `Added "${name}" as a ${employee_type || "FINANCE"} member in workspace.`,
      metadata: { employee_id: employee.id },
    })

    return NextResponse.json({ success: true, employee })
  } catch (err: any) {
    console.error("POST /api/employees error:", err)
    return NextResponse.json({ error: err.message || "Failed to create employee" }, { status: 500 })
  }
}
