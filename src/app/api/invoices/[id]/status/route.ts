import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"
import { requireBusinessUser } from "@/lib/auth/checkRole"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: authError, business } = await requireBusinessUser(request)
  if (authError) return authError

  try {
    const { id } = await params
    const adminDb = getSupabaseServiceRoleClient()

    const body = await request.json()
    const { status, reminder_paused } = body

    // Fetch existing invoice
    const { data: invoice, error: findError } = await adminDb
      .from("invoices")
      .select("status, invoice_number, total, client_id, amount_paid, balance_due")
      .eq("id", id)
      .eq("business_id", business.id)
      .maybeSingle()

    if (findError || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    const updates: any = {}
    
    // Toggle reminder pause if present
    if (reminder_paused !== undefined) {
      updates.reminder_paused = reminder_paused
    }

    // Status transition rules
    if (status) {
      if (status === "paid") {
        updates.status = "paid"
        updates.amount_paid = invoice.total
        updates.balance_due = 0
        updates.paid_at = new Date().toISOString()

        // 1. Create a payment record
        const { error: payError } = await adminDb.from("payments").insert({
          invoice_id: id,
          business_id: business.id,
          amount: Number(invoice.balance_due || invoice.total),
          payment_method: "manual",
          status: "success",
          paid_at: new Date().toISOString(),
          notes: "Marked as paid manually via status update",
        })

        if (payError) console.error("Payment insert error during status update:", payError)

        // 2. Update client's total_paid
        if (invoice.client_id) {
          const { data: client } = await adminDb
            .from("clients")
            .select("total_paid")
            .eq("id", invoice.client_id)
            .maybeSingle()
          if (client) {
            const currentPaid = Number(client.total_paid) || 0
            await adminDb
              .from("clients")
              .update({ total_paid: currentPaid + Number(invoice.balance_due || invoice.total) })
              .eq("id", invoice.client_id)
          }
        }
      } else if (status === "cancelled") {
        updates.status = "cancelled"
        updates.reminder_paused = true

        // Subtract from client's total_invoiced since it's cancelled
        if (invoice.client_id) {
          const { data: client } = await adminDb
            .from("clients")
            .select("total_invoiced")
            .eq("id", invoice.client_id)
            .maybeSingle()
          if (client) {
            const currentTotal = Number(client.total_invoiced) || 0
            await adminDb
              .from("clients")
              .update({ total_invoiced: Math.max(0, currentTotal - invoice.total) })
              .eq("id", invoice.client_id)
          }
        }
      } else {
        updates.status = status
      }
    }

    // Execute update
    const { data: updatedInvoice, error: updateError } = await adminDb
      .from("invoices")
      .update(updates)
      .eq("id", id)
      .select()
      .single()

    if (updateError) throw updateError

    // Log Activity
    await adminDb.from("activity_logs").insert({
      business_id: business.id,
      type: "invoice_status_changed",
      description: `Invoice ${invoice.invoice_number} status updated to "${status || invoice.status}"`,
      metadata: { invoice_id: id, updates },
    })

    return NextResponse.json({ success: true, invoice: updatedInvoice })
  } catch (err: any) {
    console.error("POST /api/invoices/[id]/status error:", err)
    return NextResponse.json({ error: err.message || "Something went wrong" }, { status: 500 })
  }
}
