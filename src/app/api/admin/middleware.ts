import getSupabaseServerClient from "@/lib/supabase/server"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"
import { cookies } from "next/headers"

export interface AdminUser {
  id: string
  user_id: string
  email: string
  name: string
  role: "super_admin" | "admin" | "support"
  is_active: boolean
  created_at: string
  last_login: string | null
}

export async function verifyAdminAccess(): Promise<{
  admin: AdminUser | null
  error: string | null
  status: number
}> {
  try {
    const serviceClient = getSupabaseServiceRoleClient()
    let user: any = null

    try {
      const supabase = await getSupabaseServerClient()
      const {
        data: { user: serverUser },
      } = await supabase.auth.getUser()
      user = serverUser
    } catch (_) {}

    if (!user) {
      try {
        const cookieStore = await cookies()
        const allCookies = cookieStore.getAll()
        const authCookie = allCookies.find((c) => c.name.includes("auth-token"))
        if (authCookie?.value) {
          const parsed = JSON.parse(authCookie.value)
          const token = Array.isArray(parsed) ? parsed[0] : parsed.access_token
          if (token) {
            const {
              data: { user: tokenUser },
            } = await serviceClient.auth.getUser(token)
            user = tokenUser
          }
        }
      } catch (_) {}
    }

    // Unauthenticated requests are strictly blocked
    if (!user) {
      return {
        admin: null,
        error: "Unauthorized: Super Admin access requires an authenticated session.",
        status: 401,
      }
    }

    // 1. Verify existence in admin_users table by user_id
    const { data: adminUser } = await serviceClient
      .from("admin_users")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle()

    if (adminUser) {
      return { admin: adminUser as AdminUser, error: null, status: 200 }
    }

    // 2. Verify existence in admin_users table by email
    if (user.email) {
      const { data: adminByEmail } = await serviceClient
        .from("admin_users")
        .select("*")
        .ilike("email", user.email.trim())
        .eq("is_active", true)
        .maybeSingle()

      if (adminByEmail) {
        return { admin: adminByEmail as AdminUser, error: null, status: 200 }
      }
    }

    // 3. Platform Root Super Admin designated by system configuration
    const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL || "aryan.nda.2163@gmail.com").toLowerCase().trim()
    if (user.email && user.email.toLowerCase().trim() === superAdminEmail) {
      const rootAdmin: AdminUser = {
        id: user.id,
        user_id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || "Super Admin",
        role: "super_admin",
        is_active: true,
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
      }
      return { admin: rootAdmin, error: null, status: 200 }
    }

    // User is authenticated, but not authorized for Super Admin
    return {
      admin: null,
      error: "Forbidden: You do not possess Super Admin administrative privileges.",
      status: 403,
    }
  } catch (err) {
    console.error("Admin auth check failed:", err)
    return { admin: null, error: "Internal server error", status: 500 }
  }
}

export async function logAdminAction(
  actionOrObj:
    | string
    | {
        adminId?: string
        adminEmail?: string
        action: string
        targetType?: string
        targetId?: string
        description?: string
        details?: Record<string, any>
        oldValue?: any
        newValue?: any
      },
  targetType?: string,
  targetId?: string,
  details?: Record<string, any>,
  adminId?: string
) {
  try {
    const supabase = getSupabaseServiceRoleClient()

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    let act = ""
    let tType: string = "general"
    let tId: string | null = null
    let aId: string | null = null
    let adminEmail = "admin@collectbot.internal"
    let desc = "Admin action executed"
    let oldVal: any = null
    let newVal: any = null

    if (typeof actionOrObj === "object" && actionOrObj !== null) {
      act = actionOrObj.action || "admin_action"
      tType = actionOrObj.targetType || "general"
      tId = actionOrObj.targetId ? String(actionOrObj.targetId) : null
      if (actionOrObj.adminId && UUID_REGEX.test(actionOrObj.adminId)) {
        aId = actionOrObj.adminId
      }
      if (actionOrObj.adminEmail) {
        adminEmail = actionOrObj.adminEmail
      }
      desc = actionOrObj.description || `Admin performed ${act}`
      oldVal = actionOrObj.oldValue || null
      newVal = actionOrObj.newValue || actionOrObj.details || null
    } else {
      act = actionOrObj
      tType = targetType || "general"
      tId = targetId ? String(targetId) : null
      if (adminId && UUID_REGEX.test(adminId)) aId = adminId
      desc = `Admin action ${act} executed`
      newVal = details || null
    }

    await supabase.from("admin_activity_logs").insert({
      admin_id: aId,
      admin_email: adminEmail,
      action: act,
      target_type: tType,
      target_id: tId,
      description: desc,
      changes: newVal || oldVal ? { old: oldVal, new: newVal } : null,
      ip_address: "127.0.0.1",
    })
  } catch (err) {
    console.error("Failed to log admin action:", err)
  }
}
