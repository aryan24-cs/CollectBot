import { NextRequest, NextResponse } from "next/server"
import getSupabaseServerClient from "@/lib/supabase/server"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"
import { requireBusinessUser } from "@/lib/auth/checkRole"

export async function GET(request: NextRequest) {
  const { error, user, business } = await requireBusinessUser(request)
  if (error) return error

  try {
    const supabase = await getSupabaseServerClient()
    const { data: tasks, error: queryError } = await supabase
      .from("tasks")
      .select("*, assignee:employees(id, name)")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false })

    if (queryError) throw queryError

    // Also fetch workspace employees to list as assignees
    const { data: employees } = await supabase
      .from("employees")
      .select("id, name")
      .eq("business_id", business.id)
      .eq("status", "active")

    return NextResponse.json({ tasks: tasks || [], employees: employees || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load tasks" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { error, user, business, employee } = await requireBusinessUser(request)
  if (error) return error

  try {
    const body = await request.json()
    const { title, description, status, due_date, assignee_id } = body

    if (!title) {
      return NextResponse.json({ error: "Missing required fields: title" }, { status: 400 })
    }

    const adminDb = getSupabaseServiceRoleClient()

    const { data: task, error: insertError } = await adminDb
      .from("tasks")
      .insert({
        business_id: business.id,
        creator_id: employee?.id || null, // null if created by owner
        assignee_id: assignee_id || null,
        title,
        description: description || null,
        status: status || "todo",
        due_date: due_date || null,
      })
      .select()
      .single()

    if (insertError) throw insertError

    // Log activity
    await adminDb.from("activity_logs").insert({
      business_id: business.id,
      type: "task_created",
      description: `Task "${title}" created and assigned to teammate.`,
      metadata: { task_id: task.id }
    })

    return NextResponse.json({ success: true, task }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create task" }, { status: 500 })
  }
}
