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
    const { title, description, status, due_date, assignee_id } = body

    const adminDb = getSupabaseServiceRoleClient()

    // Verify task belongs to this business
    const { data: taskCheck } = await adminDb
      .from("tasks")
      .select("id")
      .eq("id", id)
      .eq("business_id", business.id)
      .maybeSingle()

    if (!taskCheck) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    const updates: any = {}
    if (title !== undefined) updates.title = title
    if (description !== undefined) updates.description = description || null
    if (status !== undefined) updates.status = status
    if (due_date !== undefined) updates.due_date = due_date || null
    if (assignee_id !== undefined) updates.assignee_id = assignee_id || null

    updates.updated_at = new Date().toISOString()

    const { data: task, error: updateError } = await adminDb
      .from("tasks")
      .update(updates)
      .eq("id", id)
      .select()
      .single()

    if (updateError) throw updateError

    return NextResponse.json({ success: true, task })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update task" }, { status: 500 })
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

    // Verify task belongs to this business
    const { data: taskCheck } = await adminDb
      .from("tasks")
      .select("id, title")
      .eq("id", id)
      .eq("business_id", business.id)
      .maybeSingle()

    if (!taskCheck) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    const { error: deleteError } = await adminDb
      .from("tasks")
      .delete()
      .eq("id", id)

    if (deleteError) throw deleteError

    // Log activity
    await adminDb.from("activity_logs").insert({
      business_id: business.id,
      type: "task_deleted",
      description: `Task "${taskCheck.title}" was permanently removed.`,
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete task" }, { status: 500 })
  }
}
