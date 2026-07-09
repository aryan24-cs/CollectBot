import { NextRequest, NextResponse } from "next/server"
import getSupabaseServerClient from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: business, error } = await supabase
      .from("businesses")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()

    if (error) throw error

    if (!business) {
      return NextResponse.json({ error: "Business profile not found" }, { status: 404 })
    }

    return NextResponse.json(business)
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
