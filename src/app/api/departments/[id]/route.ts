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
    const { name, description, status, action, target_department_id } = body

    const adminDb = getSupabaseServiceRoleClient()

    // Verify department belongs to this business
    const { data: deptCheck } = await adminDb
      .from("departments")
      .select("id, name")
      .eq("id", id)
      .eq("business_id", business.id)
      .maybeSingle()

    if (!deptCheck) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 })
    }

    if (action === "merge") {
      if (!target_department_id) {
        return NextResponse.json({ error: "Target department ID is required for merging" }, { status: 400 })
      }

      // Verify target department belongs to this business
      const { data: targetDeptCheck } = await adminDb
        .from("departments")
        .select("id, name")
        .eq("id", target_department_id)
        .eq("business_id", business.id)
        .maybeSingle()

      if (!targetDeptCheck) {
        return NextResponse.json({ error: "Target department not found" }, { status: 404 })
      }

      if (id === target_department_id) {
        return NextResponse.json({ error: "Cannot merge a department into itself" }, { status: 400 })
      }

      // 1. Move all employees to target department
      const { error: moveError } = await adminDb
        .from("employees")
        .update({ department_id: target_department_id })
        .eq("department_id", id)
        .eq("business_id", business.id)

      if (moveError) throw moveError

      // 2. Archive source department
      const { error: archiveError } = await adminDb
        .from("departments")
        .update({ status: "archived", updated_at: new Date().toISOString() })
        .eq("id", id)

      if (archiveError) throw archiveError

      // 3. Log activity
      await adminDb.from("activity_logs").insert({
        business_id: business.id,
        type: "department_merged",
        description: `Merged department "${deptCheck.name}" into "${targetDeptCheck.name}".`,
        metadata: { source_id: id, target_id: target_department_id }
      })

      return NextResponse.json({ success: true, message: `Successfully merged into ${targetDeptCheck.name}` })
    }

    // Standard updates
    const updates: any = {}
    if (name !== undefined) updates.name = name
    if (description !== undefined) updates.description = description || null
    if (status !== undefined && ["active", "archived"].includes(status)) updates.status = status

    updates.updated_at = new Date().toISOString()

    const { data: department, error: updateError } = await adminDb
      .from("departments")
      .update(updates)
      .eq("id", id)
      .select()
      .single()

    if (updateError) throw updateError

    // Log activity
    await adminDb.from("activity_logs").insert({
      business_id: business.id,
      type: "department_updated",
      description: `Updated department info for "${department.name}".`,
      metadata: { department_id: id, updates }
    })

    return NextResponse.json({ success: true, department })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update department" }, { status: 500 })
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

    // Verify department belongs to this business
    const { data: deptCheck } = await adminDb
      .from("departments")
      .select("id, name")
      .eq("id", id)
      .eq("business_id", business.id)
      .maybeSingle()

    if (!deptCheck) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 })
    }

    // Set department_id to null for employees in this department
    await adminDb
      .from("employees")
      .update({ department_id: null })
      .eq("department_id", id)

    // Delete department record
    const { error: deleteError } = await adminDb
      .from("departments")
      .delete()
      .eq("id", id)

    if (deleteError) throw deleteError

    // Log activity
    await adminDb.from("activity_logs").insert({
      business_id: business.id,
      type: "department_deleted",
      description: `Deleted department "${deptCheck.name}".`,
      metadata: { department_id: id }
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete department" }, { status: 500 })
  }
}
