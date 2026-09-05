import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"
import { requireBusinessUser } from "@/lib/auth/checkRole"

export async function GET(request: NextRequest) {
  const { error, user, business, employee } = await requireBusinessUser(request)
  if (error) return error

  try {
    const supabase = getSupabaseServiceRoleClient()

    let query = supabase
      .from("tasks")
      .select("*")
      .eq("business_id", business.id)

    // For employees, show tasks assigned to them or unassigned
    if (employee) {
      query = query.or(`assignee_id.eq.${employee.id},assignee_id.is.null`)
    }

    const { data: rawTasks, error: rawError } = await query.order("created_at", { ascending: false })

    if (rawError) throw rawError

    // Fetch active workspace employees for assignee mapping
    const { data: employees } = await supabase
      .from("employees")
      .select("id, name")
      .eq("business_id", business.id)
      .eq("status", "active")

    const empMap = new Map((employees || []).map((e) => [e.id, e]))
    const tasks = (rawTasks || []).map((t) => ({
      ...t,
      assignee: t.assignee_id ? empMap.get(t.assignee_id) || null : null,
    }))

    return NextResponse.json({ tasks: tasks || [], employees: employees || [] })
  } catch (err: any) {
    console.error("GET /api/tasks error:", err)
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

    const validStatuses = ["todo", "in_progress", "completed"]
    const taskStatus = validStatuses.includes(status) ? status : "todo"

    const { data: task, error: insertError } = await adminDb
      .from("tasks")
      .insert({
        business_id: business.id,
        assignee_id: assignee_id || employee?.id || null,
        title,
        description: description || null,
        status: taskStatus,
        due_date: due_date || null,
      })
      .select()
      .single()

    if (insertError) throw insertError

    // Log activity
    await adminDb.from("activity_logs").insert({
      business_id: business.id,
      type: "task_created",
      description: `Task "${title}" created.`,
      metadata: { task_id: task.id },
    })

    return NextResponse.json({ success: true, task }, { status: 201 })
  } catch (err: any) {
    console.error("POST /api/tasks error:", err)
    return NextResponse.json({ error: err.message || "Failed to create task" }, { status: 500 })
  }
}
