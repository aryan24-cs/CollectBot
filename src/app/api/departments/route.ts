import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"
import { requireBusinessUser } from "@/lib/auth/checkRole"

export async function GET(request: NextRequest) {
  const { error, user, business } = await requireBusinessUser(request)
  if (error) return error

  try {
    const supabase = getSupabaseServiceRoleClient()
    const { data: departments, error: depError } = await supabase
      .from("departments")
      .select("*")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false })

    if (depError) throw depError

    return NextResponse.json(departments)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load departments" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { error, user, business } = await requireBusinessUser(request)
  if (error) return error

  try {
    const body = await request.json()
    const { name, description } = body

    if (!name) {
      return NextResponse.json({ error: "Department name is required" }, { status: 400 })
    }

    const adminDb = getSupabaseServiceRoleClient()

    const { data: department, error: insertError } = await adminDb
      .from("departments")
      .insert({
        business_id: business.id,
        name,
        description: description || null,
        status: "active"
      })
      .select()
      .single()

    if (insertError) throw insertError

    // Log activity
    await adminDb.from("activity_logs").insert({
      business_id: business.id,
      type: "department_created",
      description: `Created department "${name}".`,
      metadata: { department_id: department.id }
    })

    return NextResponse.json({ success: true, department }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create department" }, { status: 500 })
  }
}
