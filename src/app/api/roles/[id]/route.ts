import { NextRequest, NextResponse } from "next/server"
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
    const { name, description, permissions } = body // permissions is array of { category: string, action: string }

    const adminDb = getSupabaseServiceRoleClient()

    // Verify role belongs to business
    const { data: roleCheck } = await adminDb
      .from("custom_roles")
      .select("id")
      .eq("id", id)
      .eq("business_id", business.id)
      .maybeSingle()

    if (!roleCheck) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 })
    }

    // Check name uniqueness if changed
    if (name) {
      const { data: nameCheck } = await adminDb
        .from("custom_roles")
        .select("id")
        .eq("business_id", business.id)
        .eq("name", name.trim())
        .neq("id", id)
        .maybeSingle()

      if (nameCheck) {
        return NextResponse.json({ error: "Another role with this name already exists" }, { status: 400 })
      }
    }

    const updates: any = {}
    if (name !== undefined) updates.name = name.trim()
    if (description !== undefined) updates.description = description || null
    updates.updated_at = new Date().toISOString()

    // Update role metadata
    const { error: updateError } = await adminDb
      .from("custom_roles")
      .update(updates)
      .eq("id", id)

    if (updateError) throw updateError

    // Sync permissions: Delete old, Insert new
    if (permissions && Array.isArray(permissions)) {
      const { error: deletePermsError } = await adminDb
        .from("role_permissions")
        .delete()
        .eq("role_id", id)

      if (deletePermsError) throw deletePermsError

      if (permissions.length > 0) {
        const permsToInsert = permissions.map((p: any) => ({
          role_id: id,
          category: p.category,
          action: p.action
        }))

        const { error: insertPermsError } = await adminDb
          .from("role_permissions")
          .insert(permsToInsert)

        if (insertPermsError) throw insertPermsError
      }
    }

    // Log action
    await adminDb.from("activity_logs").insert({
      business_id: business.id,
      type: "role_updated",
      description: `Custom role "${name || 'unnamed'}" permissions matrix synced.`,
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update role" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user, business } = await requireBusinessUser(request)
  if (error) return error

  try {
    const { id } = await params
    const adminDb = getSupabaseServiceRoleClient()

    // Verify role belongs to business
    const { data: roleCheck } = await adminDb
      .from("custom_roles")
      .select("id, name")
      .eq("id", id)
      .eq("business_id", business.id)
      .maybeSingle()

    if (!roleCheck) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 })
    }

    // Delete role (cascade deletes role_permissions, updates employees role to NULL)
    const { error: deleteError } = await adminDb
      .from("custom_roles")
      .delete()
      .eq("id", id)

    if (deleteError) throw deleteError

    // Log action
    await adminDb.from("activity_logs").insert({
      business_id: business.id,
      type: "role_deleted",
      description: `Custom role "${roleCheck.name}" was permanently removed.`,
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete role" }, { status: 500 })
  }
}
