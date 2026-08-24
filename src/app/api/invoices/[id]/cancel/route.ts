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

    // Fetch existing invoice to check belonging
    const { data: invoice, error: findError } = await adminDb
      .from("invoices")
      .select("status, invoice_number, total, client_id")
      .eq("id", id)
      .eq("business_id", business.id)
      .maybeSingle()

    if (findError || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    // Update status to 'cancelled' and pause reminders
    const { data: updatedInvoice, error: updateError } = await adminDb
      .from("invoices")
      .update({
        status: "cancelled",
        reminder_paused: true,
      })
      .eq("id", id)
      .select()
      .single()

    if (updateError) throw updateError

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

    // Log in activity_logs
    await adminDb.from("activity_logs").insert({
      business_id: business.id,
      type: "invoice_cancelled",
      description: `Invoice ${invoice.invoice_number} was marked as cancelled.`,
      metadata: { invoice_id: id },
    })

    return NextResponse.json({ success: true, invoice: updatedInvoice })
  } catch (err: any) {
    console.error("POST /api/invoices/[id]/cancel error:", err)
    return NextResponse.json({ error: err.message || "Something went wrong" }, { status: 500 })
  }
}
