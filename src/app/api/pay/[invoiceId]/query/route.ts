import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const { invoiceId } = await params
    const body = await request.json()
    const { message, email, phone } = body

    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: "Query message is required." }, { status: 400 })
    }

    const adminDb = getSupabaseServiceRoleClient()

    // Verify invoice
    const { data: invoice } = await adminDb
      .from("invoices")
      .select("id, business_id, client_id, invoice_number")
      .eq("id", invoiceId)
      .maybeSingle()

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found." }, { status: 404 })
    }

    // Insert query into client_portal_queries
    const { data: query, error: insertErr } = await adminDb
      .from("client_portal_queries")
      .insert({
        business_id: invoice.business_id,
        invoice_id: invoice.id,
        client_id: invoice.client_id || null,
        message: message.trim(),
        status: "open"
      })
      .select()
      .single()

    if (insertErr) throw insertErr

    // Log client portal query event
    await adminDb.from("client_portal_events").insert({
      business_id: invoice.business_id,
      invoice_id: invoice.id,
      event_type: "query_raised",
      metadata: { message: message.trim(), email, phone }
    })

    // Log workspace activity
    await adminDb.from("activity_logs").insert({
      business_id: invoice.business_id,
      type: "client_query_raised",
      description: `Client raised a query for Invoice "${invoice.invoice_number}": "${message.trim().slice(0, 60)}..."`
    })

    // Create workspace notification
    await adminDb.from("notifications").insert({
      business_id: invoice.business_id,
      title: "New Client Query",
      message: `Query received for Invoice #${invoice.invoice_number}: ${message.trim().slice(0, 50)}...`,
      is_read: false
    })

    return NextResponse.json({ success: true, query }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to submit query." }, { status: 500 })
  }
}
