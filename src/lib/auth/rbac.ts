import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"
import { NextResponse } from "next/server"

export async function verifyUserPermission(
  userId: string,
  category: string,
  action: string
): Promise<boolean> {
  const supabase = getSupabaseServiceRoleClient()

  // 1. Check if user is the direct owner of the business
  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle()

  if (business) {
    return true; // Business Owner has unrestricted access to everything
  }

  // 2. Check if user is an active employee
  const { data: employee } = await supabase
    .from("employees")
    .select("id, status, custom_role_id")
    .eq("user_id", userId)
    .maybeSingle()

  if (!employee || employee.status !== "active") {
    return false; // Not a registered active employee
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
      return true;
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
    return true;
  }

  return false;
}

export async function requirePermission(category: string, action: string, userId: string) {
  const hasPermission = await verifyUserPermission(userId, category, action)
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
