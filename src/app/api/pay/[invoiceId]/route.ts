import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const { invoiceId } = await params
    if (!invoiceId) {
      return NextResponse.json({ error: "Invoice ID is required" }, { status: 400 })
    }

    const supabase = getSupabaseServiceRoleClient()

    const { data: invoice, error: fetchError } = await supabase
      .from("invoices")
      .select(`
        id,
        invoice_number,
        status,
        issue_date,
        due_date,
        subtotal,
        tax_amount,
        discount,
        total,
        amount_paid,
        balance_due,
        notes,
        terms,
        pdf_url,
        paid_at,
        created_at,
        client:clients(id, name, email, phone, company_name, gstin),
        items:invoice_items(id, description, quantity, rate, amount, tax_rate, tax_amount),
        business:businesses(id, name, email, phone, logo_url, currency, address, city, state, gstin)
      `)
      .eq("id", invoiceId)
      .maybeSingle()

    if (fetchError || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    return NextResponse.json(invoice)
  } catch (err: any) {
    console.error("GET /api/pay/[invoiceId] error:", err)
    return NextResponse.json({ error: err.message || "Failed to fetch invoice" }, { status: 500 })
  }
}

