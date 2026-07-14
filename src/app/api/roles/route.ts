import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"
import { requireBusinessUser } from "@/lib/auth/checkRole"

export async function GET(request: NextRequest) {
  const { error, user, business } = await requireBusinessUser(request)
  if (error) return error

  try {
    const adminDb = getSupabaseServiceRoleClient()

    // Fetch custom roles for this business
    const { data: roles, error: rolesError } = await adminDb
      .from("custom_roles")
      .select("*")
      .eq("business_id", business.id)
      .order("name", { ascending: true })

    if (rolesError) throw rolesError

    // Fetch all permissions for those roles
    if (roles && roles.length > 0) {
      const roleIds = roles.map(r => r.id)
      const { data: perms, error: permsError } = await adminDb
        .from("role_permissions")
        .select("role_id, category, action")
        .in("role_id", roleIds)

      if (permsError) throw permsError

      const rolesWithPerms = roles.map(r => ({
        ...r,
        permissions: perms?.filter(p => p.role_id === r.id) || []
      }))

      return NextResponse.json({ success: true, roles: rolesWithPerms })
    }

    return NextResponse.json({ success: true, roles: [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load roles" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { error, user, business } = await requireBusinessUser(request)
  if (error) return error

  try {
    const body = await request.json()
    const { name, description, permissions } = body // permissions is array of { category: string, action: string }

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Role name is required" }, { status: 400 })
    }

    const adminDb = getSupabaseServiceRoleClient()

    // Verify name doesn't exist
    const { data: existing } = await adminDb
      .from("custom_roles")
      .select("id")
      .eq("business_id", business.id)
      .eq("name", name.trim())
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: "A custom role with this name already exists" }, { status: 400 })
    }

    // Insert role
    const { data: newRole, error: insertError } = await adminDb
      .from("custom_roles")
      .insert({
        business_id: business.id,
        name: name.trim(),
        description: description || null
      })
      .select()
      .single()

    if (insertError) throw insertError

    // Insert permissions if provided
    if (permissions && Array.isArray(permissions) && permissions.length > 0) {
      const permsToInsert = permissions.map((p: any) => ({
        role_id: newRole.id,
        category: p.category,
        action: p.action
      }))

      const { error: permsError } = await adminDb
        .from("role_permissions")
        .insert(permsToInsert)

      if (permsError) throw permsError
    }

    // Log action
    await adminDb.from("activity_logs").insert({
      business_id: business.id,
      type: "role_created",
      description: `Custom role "${name.trim()}" was created with ${permissions?.length || 0} permissions.`,
    })

    return NextResponse.json({ success: true, role: newRole })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create role" }, { status: 500 })
  }
}
