import { NextRequest, NextResponse } from "next/server"
import getSupabaseServerClient from "@/lib/supabase/server"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()

    if (!business) {
      return NextResponse.json({ error: "Business profile not found." }, { status: 400 })
    }

    const body = await request.json()
    const { status, reminder_paused } = body

    // Fetch existing invoice
    const { data: invoice, error: findError } = await supabase
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
        const { error: payError } = await supabase.from("payments").insert({
          invoice_id: id,
          business_id: business.id,
          amount: invoice.total,
          payment_method: "manual",
          status: "success",
          paid_at: new Date().toISOString(),
          notes: "Marked as paid manually by merchant.",
        })
        if (payError) throw payError

        // 2. Update client's total_paid
        if (invoice.client_id) {
          const { data: client } = await supabase
            .from("clients")
            .select("total_paid")
            .eq("id", invoice.client_id)
            .maybeSingle()
          if (client) {
            const currentPaid = Number(client.total_paid) || 0
            await supabase
              .from("clients")
              .update({ total_paid: currentPaid + invoice.total })
              .eq("id", invoice.client_id)
          }
        }

        // 3. Log Activity
        await supabase.from("activity_logs").insert({
          business_id: business.id,
          type: "payment_received",
          description: `Received payment of ₹${invoice.total.toLocaleString("en-IN")} for Invoice "${invoice.invoice_number}".`,
          metadata: { invoice_id: id },
        })
      } else if (status === "sent") {
        updates.status = "sent"
        updates.sent_at = new Date().toISOString()
        
        // Log Activity
        await supabase.from("activity_logs").insert({
          business_id: business.id,
          type: "invoice_sent",
          description: `Invoice "${invoice.invoice_number}" was marked as sent to client.`,
          metadata: { invoice_id: id },
        })
      } else {
        updates.status = status
      }
    }

    const { data: updatedInvoice, error: updateError } = await supabase
      .from("invoices")
      .update(updates)
      .eq("id", id)
      .select()
      .single()

    if (updateError) throw updateError

    return NextResponse.json(updatedInvoice)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Something went wrong" }, { status: 500 })
  }
}
