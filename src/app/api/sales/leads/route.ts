import { NextRequest, NextResponse } from "next/server"
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

    const supabase = getSupabaseServiceRoleClient()
    let query = supabase
      .from("sales_leads")
      .select("*, employee:employees!assigned_to(id, name)")
      .eq("business_id", business.id)
      .is("deleted_at", null)

    if (stage) {
      query = query.eq("status", stage)
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,company.ilike.%${search}%,email.ilike.%${search}%`)
    }

    let { data: leads, error: queryError } = await query.order("created_at", { ascending: false })

    if (queryError) {
      console.warn("Sales leads FK join query failed, falling back to manual join:", queryError.message)
      let fallbackQuery = supabase
        .from("sales_leads")
        .select("*")
        .eq("business_id", business.id)
        .is("deleted_at", null)

      if (stage) fallbackQuery = fallbackQuery.eq("status", stage)
      if (search) fallbackQuery = fallbackQuery.or(`name.ilike.%${search}%,company.ilike.%${search}%,email.ilike.%${search}%`)

      const { data: rawLeads, error: rawError } = await fallbackQuery.order("created_at", { ascending: false })

      if (rawError) throw rawError

      const { data: employees } = await supabase
        .from("employees")
        .select("id, name")
        .eq("business_id", business.id)

      const empMap = new Map((employees || []).map((e) => [e.id, e]))
      leads = (rawLeads || []).map((lead) => ({
        ...lead,
        employee: lead.assigned_to ? empMap.get(lead.assigned_to) || null : null,
      }))
    }

    return NextResponse.json({ success: true, leads: leads || [] })
  } catch (err: any) {
    console.error("GET /api/sales/leads error:", err)
    return NextResponse.json({ error: err.message || "Failed to load sales leads" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { error, user, business, employee, role } = await requireBusinessUser(request)
  if (error) return error

  if (role !== "OWNER" && role !== "SALES") {
    return NextResponse.json({ error: "Access denied: Sales CRM scope only." }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { name, email, phone, company, source, status, value, assigned_to } = body

    if (!name) {
      return NextResponse.json({ error: "Lead name is required." }, { status: 400 })
    }

    const adminDb = getSupabaseServiceRoleClient()

    const { data: lead, error: insertError } = await adminDb
      .from("sales_leads")
      .insert({
        business_id: business.id,
        name,
        email: email || null,
        phone: phone || null,
        company: company || null,
        source: source || "direct",
        status: status || "new",
        value: value ? Number(value) : 0,
        assigned_to: assigned_to || employee?.id || null,
        created_by: employee?.id || null,
      })
      .select()
      .single()

    if (insertError) throw insertError

    // Initial pipeline entry
    await adminDb.from("sales_pipeline").insert({
      business_id: business.id,
      lead_id: lead.id,
      stage: status || "new",
      notes: "Lead registered in pipeline.",
    })

    return NextResponse.json({ success: true, lead }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create lead" }, { status: 500 })
  }
}
