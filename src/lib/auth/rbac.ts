import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"
import { NextResponse } from "next/server"

export async function verifyUserPermission(
  userId: string,
  category: string,
  action: string,
  businessId?: string
): Promise<boolean> {
  const supabase = getSupabaseServiceRoleClient()

  // 1. Check if user is the direct owner of the business
  let bizQuery = supabase
    .from("businesses")
    .select("id")
    .eq("user_id", userId)

  if (businessId) {
    bizQuery = bizQuery.eq("id", businessId)
  }

  const { data: business } = await bizQuery.maybeSingle()

  if (business) {
    return true // Business Owner has unrestricted access to their business
  }

  // 2. Check if user is an active employee of this business
  let empQuery = supabase
    .from("employees")
    .select("id, status, custom_role_id, business_id")
    .eq("user_id", userId)
    .eq("status", "active")

  if (businessId) {
    empQuery = empQuery.eq("business_id", businessId)
  }

  const { data: employeeRaw } = await empQuery.maybeSingle()
  const employee = employeeRaw as any

  if (!employee) {
    return false // Not a registered active employee
  }

  // 3. Check role permissions
  if (employee.custom_role_id) {
    const { data: rolePerm } = await supabase
      .from("role_permissions")
      .select("id")
      .eq("role_id", employee.custom_role_id)
      .eq("category", category)
      .eq("action", action)
      .maybeSingle()

    if (rolePerm) {
      return true
    }
  }

  // 4. Check direct employee permission overrides
  const { data: empPerm } = await supabase
    .from("employee_permissions")
    .select("id")
    .eq("employee_id", employee.id)
    .eq("category", category)
    .eq("action", action)
    .maybeSingle()

  if (empPerm) {
    return true
  }

  return false
}

export async function requirePermission(
  category: string,
  action: string,
  userId: string,
  businessId?: string
) {
  const hasPermission = await verifyUserPermission(userId, category, action, businessId)
  if (!hasPermission) {
    return {
      error: NextResponse.json(
        { error: `Forbidden: Missing required permission ${action} on ${category}` },
        { status: 403 }
      ),
    }
  }
  return { error: null }
}
