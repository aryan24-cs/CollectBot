import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"

export interface UserWorkspace {
  businessId: string
  businessName: string
  businessLogo?: string | null
  role: "OWNER" | "FINANCE" | "SALES" | "MARKETING"
  designation?: string | null
  isOwner: boolean
  city?: string | null
  currency?: string | null
  targetDashboard: string
  createdAt: string
}

export function determineRoleDashboard(role: string): string {
  const r = (role || "").toUpperCase()
  switch (r) {
    case "SALES":
      return "/dashboard/sales"
    case "MARKETING":
      return "/dashboard/marketing"
    case "FINANCE":
      return "/dashboard/finance"
    case "OWNER":
    default:
      return "/dashboard"
  }
}

/**
 * Retrieves all valid, active business workspaces that a user belongs to.
 * Checks both direct business ownership and active employee memberships.
 */
export async function getUserWorkspaces(userId: string, email?: string): Promise<UserWorkspace[]> {
  const adminDb = getSupabaseServiceRoleClient()
  const workspacesMap = new Map<string, UserWorkspace>()

  // 1. Fetch Owned Businesses
  if (userId) {
    const { data: ownedBusinesses, error: ownerErr } = await adminDb
      .from("businesses")
      .select("id, name, logo_url, city, currency, created_at")
      .eq("user_id", userId)

    if (!ownerErr && ownedBusinesses) {
      for (const biz of (ownedBusinesses as any[])) {
        workspacesMap.set(biz.id, {
          businessId: biz.id,
          businessName: biz.name || "My Business",
          businessLogo: biz.logo_url || null,
          role: "OWNER",
          designation: "Business Owner",
          isOwner: true,
          city: biz.city || null,
          currency: biz.currency || "INR",
          targetDashboard: "/dashboard",
          createdAt: biz.created_at || new Date().toISOString(),
        })
      }
    }
  }

  // 2. Fetch Employee Memberships
  let employeeQuery = adminDb
    .from("employees")
    .select(`
      id,
      business_id,
      user_id,
      email,
      employee_type,
      designation,
      status,
      created_at,
      business:businesses(id, name, logo_url, city, currency, created_at)
    `)
    .eq("status", "active")

  if (userId && email) {
    employeeQuery = employeeQuery.or(`user_id.eq.${userId},email.ilike.${email.trim()}`)
  } else if (userId) {
    employeeQuery = employeeQuery.eq("user_id", userId)
  } else if (email) {
    employeeQuery = employeeQuery.ilike("email", email.trim())
  }

  const { data: employeeMemberships, error: empErr } = await employeeQuery

  if (!empErr && employeeMemberships) {
    for (const emp of (employeeMemberships as any[])) {
      const biz: any = emp.business
      if (!biz || !biz.id) continue

      // If user is already registered as OWNER for this business, Owner status takes precedence
      if (workspacesMap.has(biz.id) && workspacesMap.get(biz.id)?.isOwner) {
        continue
      }

      // Auto-link user_id on the employee record if missing
      if (userId && (!emp.user_id || emp.user_id !== userId)) {
        await (adminDb as any)
          .from("employees")
          .update({ user_id: userId, status: "active" })
          .eq("id", emp.id)
      }

      const role = (emp.employee_type || "FINANCE").toUpperCase() as "OWNER" | "FINANCE" | "SALES" | "MARKETING"
      workspacesMap.set(biz.id, {
        businessId: biz.id,
        businessName: biz.name || "Workspace",
        businessLogo: biz.logo_url || null,
        role: role,
        designation: emp.designation || (role === "SALES" ? "Sales Executive" : role === "MARKETING" ? "Marketing Lead" : "Finance Specialist"),
        isOwner: role === "OWNER",
        city: biz.city || null,
        currency: biz.currency || "INR",
        targetDashboard: determineRoleDashboard(role),
        createdAt: emp.created_at || biz.created_at || new Date().toISOString(),
      })
    }
  }

  return Array.from(workspacesMap.values())
}

/**
 * Resolves the active workspace from cookie/preference, or picks the default.
 */
export async function resolveActiveWorkspace(
  userId: string,
  email?: string,
  preferredBusinessId?: string | null
): Promise<{
  activeWorkspace: UserWorkspace | null
  allWorkspaces: UserWorkspace[]
}> {
  const allWorkspaces = await getUserWorkspaces(userId, email)

  if (allWorkspaces.length === 0) {
    return { activeWorkspace: null, allWorkspaces: [] }
  }

  // If a preferred business ID was specified and user has valid membership
  if (preferredBusinessId) {
    const matched = allWorkspaces.find((w) => w.businessId === preferredBusinessId)
    if (matched) {
      return { activeWorkspace: matched, allWorkspaces }
    }
  }

  // Default to first workspace (Owned business prioritized, or first employee workspace)
  const defaultWorkspace = allWorkspaces.find((w) => w.isOwner) || allWorkspaces[0]
  return { activeWorkspace: defaultWorkspace, allWorkspaces }
}
