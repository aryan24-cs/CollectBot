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
      .select("*, assignee:employees!assignee_id(id, name)")
      .eq("business_id", business.id)

    // For employees, isolate personal work (tasks assigned to or created by them)
    if (employee) {
      query = query.or(`assignee_id.eq.${employee.id},creator_id.eq.${employee.id}`)
    }

    let { data: tasks, error: queryError } = await query.order("created_at", { ascending: false })

    // Fetch active workspace employees for assignee selector
    const { data: employees } = await supabase
      .from("employees")
      .select("id, name")
      .eq("business_id", business.id)
      .eq("status", "active")

    if (queryError) {
      console.warn("Tasks FK join query failed, falling back to manual join:", queryError.message)
      let fallbackQuery = supabase
        .from("tasks")
        .select("*")
        .eq("business_id", business.id)

      if (employee) {
        fallbackQuery = fallbackQuery.or(`assignee_id.eq.${employee.id},creator_id.eq.${employee.id}`)
      }

      const { data: rawTasks, error: rawError } = await fallbackQuery.order("created_at", { ascending: false })

      if (rawError) throw rawError

      const empMap = new Map((employees || []).map((e) => [e.id, e]))
      tasks = (rawTasks || []).map((t) => ({
        ...t,
        assignee: t.assignee_id ? empMap.get(t.assignee_id) || null : null,
      }))
    }

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

    const { data: task, error: insertError } = await adminDb
      .from("tasks")
      .insert({
        business_id: business.id,
        creator_id: employee?.id || null,
        assignee_id: assignee_id || employee?.id || null,
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
      description: `Task "${title}" created.`,
      metadata: { task_id: task.id },
    })

    return NextResponse.json({ success: true, task }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create task" }, { status: 500 })
  }
}
