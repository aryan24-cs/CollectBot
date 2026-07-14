import { NextRequest, NextResponse } from "next/server"
import getSupabaseServerClient from "@/lib/supabase/server"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"
import { requireBusinessUser } from "@/lib/auth/checkRole"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user, business } = await requireBusinessUser(request)
  if (error) return error

  try {
    const { id } = await params
    const body = await request.json()
    const { 
      name, 
      phone, 
      department_id, 
      custom_role_id, 
      employee_id_code, 
      branch_id, 
      status, 
      permissions,
      designation,
      employee_type,
      notes,
      profile_picture_url,
      new_password
    } = body

    const adminDb = getSupabaseServiceRoleClient()

    // Verify employee belongs to this business
    const { data: employeeCheck } = await adminDb
      .from("employees")
      .select("id, name, user_id")
      .eq("id", id)
      .eq("business_id", business.id)
      .maybeSingle()

    if (!employeeCheck) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    // Handle password reset
    if (new_password && new_password.trim().length >= 6) {
      if (!employeeCheck.user_id) {
        return NextResponse.json({ error: "Cannot reset password: Employee account has no linked login credentials." }, { status: 400 })
      }
      const { error: resetError } = await adminDb.auth.admin.updateUserById(employeeCheck.user_id, {
        password: new_password.trim()
      })
      if (resetError) {
        return NextResponse.json({ error: `Password Reset Failed: ${resetError.message}` }, { status: 400 })
      }
    }

    const updates: any = {}
    if (name !== undefined) updates.name = name
    if (phone !== undefined) updates.phone = phone || null
    if (department_id !== undefined) updates.department_id = department_id || null
    if (custom_role_id !== undefined) updates.custom_role_id = custom_role_id || null
    if (employee_id_code !== undefined) updates.employee_id_code = employee_id_code || null
    if (branch_id !== undefined) updates.branch_id = branch_id || null
    if (status !== undefined && ["pending", "active", "suspended"].includes(status)) updates.status = status
    if (designation !== undefined) updates.designation = designation || null
    if (employee_type !== undefined && ["OWNER", "FINANCE", "SALES", "MARKETING"].includes(employee_type)) updates.employee_type = employee_type
    if (notes !== undefined) updates.notes = notes || null
    if (profile_picture_url !== undefined) updates.profile_picture_url = profile_picture_url || null

    updates.updated_at = new Date().toISOString()

    const { data: employee, error: updateError } = await adminDb
      .from("employees")
      .update(updates)
      .eq("id", id)
      .select()
      .single()

    if (updateError) throw updateError

    // Sync direct overrides if provided
    if (permissions !== undefined && Array.isArray(permissions)) {
      await adminDb
        .from("employee_permissions")
        .delete()
        .eq("employee_id", id)

      if (permissions.length > 0) {
        const inserts = permissions.map((p: any) => ({
          employee_id: id,
          category: p.category,
          action: p.action,
        }))
        const { error: insError } = await adminDb
          .from("employee_permissions")
          .insert(inserts)
        if (insError) throw insError
      }
    }

    // Log activity
    await adminDb.from("activity_logs").insert({
      business_id: business.id,
      type: "employee_updated",
      description: `Updated employee profile details for "${employee.name}".`,
      metadata: { employee_id: id, updates }
    })

    return NextResponse.json({ success: true, employee })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update employee" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user, business } = await requireBusinessUser(request)
  if (error) return error

  // Only the business owner can delete employees
  const supabase = await getSupabaseServerClient()
  const { data: ownerCheck } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", business.id)
    .eq("user_id", user.id)
    .maybeSingle()

  if (!ownerCheck) {
    return NextResponse.json({ error: "Only the business owner can delete employees" }, { status: 403 })
  }

  try {
    const { id } = await params
    const adminDb = getSupabaseServiceRoleClient()

    // Verify employee belongs to this business
    const { data: employeeCheck } = await adminDb
      .from("employees")
      .select("id, name, user_id")
      .eq("id", id)
      .eq("business_id", business.id)
      .maybeSingle()

    if (!employeeCheck) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    // Delete auth user via admin supabase if registered
    if (employeeCheck.user_id) {
      await adminDb.auth.admin.deleteUser(employeeCheck.user_id)
    }

    // Delete employee record
    const { error: deleteError } = await adminDb
      .from("employees")
      .delete()
      .eq("id", id)

    if (deleteError) throw deleteError

    // Log activity
    await adminDb.from("activity_logs").insert({
      business_id: business.id,
      type: "employee_deleted",
      description: `Permanently removed employee "${employeeCheck.name}" from workspace.`,
      metadata: { employee_id: id }
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete employee" }, { status: 500 })
  }
}
