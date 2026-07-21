import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"
import { requireBusinessUser } from "@/lib/auth/checkRole"

export async function GET(request: NextRequest) {
  const { error, user, business } = await requireBusinessUser(request)
  if (error) return error

  try {
    const supabase = getSupabaseServiceRoleClient()

    // 1. Primary query with explicit foreign key relationship hint for PostgREST
    let { data: expenses, error: expError } = await supabase
      .from("expenses")
      .select("*, employee:employees!employee_id(id, name)")
      .eq("business_id", business.id)
      .order("date", { ascending: false })

    // 2. Fallback to manual join if relational embedding fails
    if (expError) {
      console.warn("Expenses FK join query failed, falling back to manual join:", expError.message)
      const { data: rawExpenses, error: rawError } = await supabase
        .from("expenses")
        .select("*")
        .eq("business_id", business.id)
        .order("date", { ascending: false })

      if (rawError) throw rawError

      const { data: employees } = await supabase
        .from("employees")
        .select("id, name")
        .eq("business_id", business.id)

      const empMap = new Map((employees || []).map((e) => [e.id, e]))
      expenses = (rawExpenses || []).map((exp) => ({
        ...exp,
        employee: exp.employee_id ? empMap.get(exp.employee_id) || null : null,
      }))
    }

    return NextResponse.json(expenses || [])
  } catch (err: any) {
    console.error("GET /api/expenses error:", err)
    return NextResponse.json({ error: err.message || "Failed to load expenses" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { error, user, business, employee } = await requireBusinessUser(request)
  if (error) return error

  try {
    const body = await request.json()
    const { category, amount, date, description } = body

    if (!category || !amount || !date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const adminDb = getSupabaseServiceRoleClient()

    // If logged by Owner, it's auto-approved. If employee, it starts as pending.
    const isOwner = !employee
    const status = isOwner ? "approved" : "pending"

    const { data: expense, error: insertError } = await adminDb
      .from("expenses")
      .insert({
        business_id: business.id,
        employee_id: employee?.id || null,
        category,
        amount: Number(amount),
        date,
        description: description || null,
        status,
        approved_by: isOwner ? null : null,
      })
      .select()
      .single()

    if (insertError) throw insertError

    // If employee logged it, register an approval request
    if (!isOwner && employee) {
      const { data: approvalRequest, error: appError } = await adminDb
        .from("approval_requests")
        .insert({
          business_id: business.id,
          requester_id: employee.id,
          type: "expense",
          target_id: expense.id,
          status: "pending",
        })
        .select()
        .single()

      if (!appError && approvalRequest) {
        await adminDb.from("approval_steps").insert({
          approval_request_id: approvalRequest.id,
          step_order: 1,
          status: "pending",
        })
      }
    }

    // Log activity
    await adminDb.from("activity_logs").insert({
      business_id: business.id,
      type: "expense_created",
      description: `Logged expense of ${amount} for "${category}" (status: ${status}).`,
      metadata: { expense_id: expense.id },
    })

    return NextResponse.json({ success: true, expense }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to log expense" }, { status: 500 })
  }
}
