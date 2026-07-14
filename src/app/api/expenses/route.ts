import { NextRequest, NextResponse } from "next/server"
import getSupabaseServerClient from "@/lib/supabase/server"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"
import { requireBusinessUser } from "@/lib/auth/checkRole"

export async function GET(request: NextRequest) {
  const { error, user, business } = await requireBusinessUser(request)
  if (error) return error

  try {
    const supabase = await getSupabaseServerClient()
    const { data: expenses, error: expError } = await supabase
      .from("expenses")
      .select("*, employee:employees(id, name)")
      .eq("business_id", business.id)
      .order("date", { ascending: false })

    if (expError) throw expError

    return NextResponse.json(expenses)
  } catch (err: any) {
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

    // 1. Insert expense record. If logged by Owner, it's auto-approved. If employee, it starts as pending.
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
        approved_by: isOwner ? null : null, // Set during approval
      })
      .select()
      .single()

    if (insertError) throw insertError

    // 2. If employee logged it, register an approval request
    if (!isOwner) {
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

      if (appError) throw appError

      // Create initial approval step
      await adminDb
        .from("approval_steps")
        .insert({
          approval_request_id: approvalRequest.id,
          step_order: 1,
          status: "pending",
        })
    }

    // Log activity
    await adminDb.from("activity_logs").insert({
      business_id: business.id,
      type: "expense_created",
      description: `Logged expense of ${amount} for "${category}" (status: ${status}).`,
      metadata: { expense_id: expense.id }
    })

    return NextResponse.json({ success: true, expense }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to log expense" }, { status: 500 })
  }
}
