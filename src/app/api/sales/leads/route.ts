import { NextRequest, NextResponse } from "next/server"
import getSupabaseServerClient from "@/lib/supabase/server"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"
import { requireBusinessUser } from "@/lib/auth/checkRole"

export async function GET(request: NextRequest) {
  const { error, user, business, employee, role } = await requireBusinessUser(request)
  if (error) return error

  // Security guard: Only OWNER and SALES can access CRM leads
  if (role !== "OWNER" && role !== "SALES") {
    return NextResponse.json({ error: "Access denied: Sales CRM scope only." }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const stage = searchParams.get("stage")
    const search = searchParams.get("search")

    const supabase = await getSupabaseServerClient()
    let query = supabase
      .from("sales_leads")
      .select("*, employee:employees(id, name)")
      .eq("business_id", business.id)
      .is("deleted_at", null)

    if (stage) {
      query = query.eq("status", stage)
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,company.ilike.%${search}%`)
    }

    const { data: leads, error: fetchError } = await query.order("created_at", { ascending: false })
    if (fetchError) throw fetchError

    return NextResponse.json({ leads })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load CRM leads." }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { error, user, business, employee, role } = await requireBusinessUser(request)
  if (error) return error

  // Security guard: Only OWNER and SALES can edit leads
  if (role !== "OWNER" && role !== "SALES") {
    return NextResponse.json({ error: "Access denied: Sales CRM scope only." }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { name, email, phone, company, source, value, assigned_to, status } = body

    if (!name) {
      return NextResponse.json({ error: "Lead name is required." }, { status: 400 })
    }

    const adminDb = getSupabaseServiceRoleClient()
    const creatorId = employee ? employee.id : null

    // Insert lead record
    const { data: lead, error: insertError } = await adminDb
      .from("sales_leads")
      .insert({
        business_id: business.id,
        name,
        email: email || null,
        phone: phone || null,
        company: company || null,
        source: source || "Direct",
        value: value ? parseFloat(value) : 0.00,
        assigned_to: assigned_to || null,
        status: status || "new",
        created_by: user.id
      })
      .select()
      .single()

    if (insertError) throw insertError

    // Log pipeline stage change history record
    await adminDb.from("sales_pipeline").insert({
      business_id: business.id,
      lead_id: lead.id,
      stage: lead.status,
      notes: "Lead registered in pipeline.",
      created_by: user.id
    })

    // Log workspace activity log
    await adminDb.from("activity_logs").insert({
      business_id: business.id,
      type: "lead_created",
      description: `Lead "${name}" (${company || "No Company"}) created with value ₹${value || 0}.`,
      created_by: user.id
    })

    return NextResponse.json({ success: true, lead }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create CRM lead." }, { status: 500 })
  }
}
