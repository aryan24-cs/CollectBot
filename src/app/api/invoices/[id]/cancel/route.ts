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

    // Fetch existing invoice to check belonging
    const { data: invoice, error: findError } = await supabase
      .from("invoices")
      .select("status, invoice_number, total, client_id")
      .eq("id", id)
      .eq("business_id", business.id)
      .maybeSingle()

    if (findError || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    // Update status to 'cancelled' and pause reminders
    const { data: updatedInvoice, error: updateError } = await supabase
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
      const { data: client } = await supabase
        .from("clients")
        .select("total_invoiced")
        .eq("id", invoice.client_id)
        .maybeSingle()
      if (client) {
        const currentTotal = Number(client.total_invoiced) || 0
        await supabase
          .from("clients")
          .update({ total_invoiced: Math.max(0, currentTotal - invoice.total) })
          .eq("id", invoice.client_id)
      }
    }

    // Log Activity
    await supabase.from("activity_logs").insert({
      business_id: business.id,
      type: "invoice_cancelled",
      description: `Invoice "${invoice.invoice_number}" was cancelled. Auto-reminders were stopped.`,
      metadata: { invoice_id: id },
    })

    return NextResponse.json(updatedInvoice)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Something went wrong" }, { status: 500 })
  }
}
