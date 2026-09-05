import { NextRequest, NextResponse } from "next/server"
import getSupabaseServerClient from "@/lib/supabase/server"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"
import { requireBusinessUser } from "@/lib/auth/checkRole"

export async function GET(request: NextRequest) {
  try {
    const { error: authError, user, business, employee } = await requireBusinessUser(request)
    if (authError) return authError

    const adminDb = getSupabaseServiceRoleClient()
    const subRes = await adminDb
      .from("subscriptions")
      .select("*")
      .eq("business_id", business!.id)
      .maybeSingle()

    const sub = subRes.data || null
    const responseData: any = { ...business }
    
    responseData.subscription = sub ? {
      plan: sub.plan_name || sub.plan || "free",
      billing_cycle: sub.billing_cycle || "monthly",
      status: sub.status || "active",
      current_period_end: sub.current_period_end || new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString()
    } : {
      plan: "free",
      billing_cycle: "monthly",
      status: "active",
      current_period_end: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString()
    }

    // Load active user permission credentials
    if (!employee) {
      responseData.isOwner = true
      responseData.permissions = ["all"]
    } else {
      responseData.isOwner = false
      
      // Fetch role permissions
      let rolePerms: any[] = []
      if (employee.custom_role_id) {
        const { data: rp } = await adminDb
          .from("role_permissions")
          .select("category, action")
          .eq("role_id", employee.custom_role_id)
        rolePerms = rp || []
      }

      // Fetch direct employee permissions overrides
      const { data: ep } = await adminDb
        .from("employee_permissions")
        .select("category, action")
        .eq("employee_id", employee.id)
      const empPerms = ep || []

      // Merge unique permissions
      const permSet = new Set<string>()
      rolePerms.forEach((p: any) => permSet.add(`${p.category}:${p.action}`))
      empPerms.forEach((p: any) => permSet.add(`${p.category}:${p.action}`))

      responseData.permissions = Array.from(permSet)
      responseData.employee = {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        custom_role_id: employee.custom_role_id,
        department_id: employee.department_id,
        employee_type: employee.employee_type,
      }
    }

    return NextResponse.json(responseData)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load profile settings." }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 1. Get business of this user
    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()

    if (!business) {
      return NextResponse.json({ error: "Business profile not found." }, { status: 400 })
    }

    const body = await request.json()

    // 2. Allowed columns for update in businesses table
    const allowedColumns = [
      "name",
      "email",
      "phone",
      "address",
      "city",
      "state",
      "pincode",
      "gstin",
      "pan",
      "bank_name",
      "account_number",
      "ifsc_code",
      "upi_id",
      "currency",
      "timezone",
      "whatsapp_number",
      "invoice_prefix",
      "invoice_counter",
      "default_payment_terms",
      "default_tax_rate",
      "default_notes",
      "default_terms",
      "invoice_template",
      "primary_color",
      "font_family",
    ]

    const updates: any = {}
    for (const key of allowedColumns) {
      if (body[key] !== undefined) {
        updates[key] = body[key]
      }
    }

    // GSTIN simple formatting checks if supplied
    if (updates.gstin && updates.gstin.trim().length !== 15) {
      return NextResponse.json({ error: "GSTIN must be exactly 15 characters long." }, { status: 400 })
    }

    // 3. Perform update
    const { data: updatedBusiness, error: updateError } = await supabase
      .from("businesses")
      .update(updates)
      .eq("id", business.id)
      .select()
      .single()

    if (updateError) throw updateError

    return NextResponse.json(updatedBusiness)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update profile settings." }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, email, phone, address, city, state, pincode, businessType } = body

    if (!name || name.trim().length < 2) {
      return NextResponse.json({ error: "Business name must be at least 2 characters" }, { status: 400 })
    }

    const adminDb = getSupabaseServiceRoleClient()

    // Create the business record
    const { data: business, error: insertError } = await adminDb
      .from("businesses")
      .insert({
        user_id: user.id,
        name: name.trim(),
        email: email || user.email || null,
        phone: phone || null,
        address: address || null,
        city: city || null,
        state: state || null,
        pincode: pincode || null,
        logo_url: businessType || null,
      })
      .select()
      .single()

    if (insertError) throw insertError

    // Initialize free subscription
    await adminDb
      .from("subscriptions")
      .insert({
        business_id: business.id,
        plan: "free",
        plan_name: "free",
        billing_cycle: "monthly",
        status: "active",
      })

    // Log activity
    await adminDb.from("activity_logs").insert({
      business_id: business.id,
      type: "business_created",
      description: `Business workspace "${name}" created.`,
      metadata: { business_id: business.id }
    })

    const response = NextResponse.json({ success: true, business }, { status: 201 })

    // Set active business cookie
    response.cookies.set("cb_active_business_id", business.id, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    })

    return response
  } catch (err: any) {
    console.error("POST /api/settings/business error:", err)
    return NextResponse.json({ error: err.message || "Failed to create business." }, { status: 500 })
  }
}
