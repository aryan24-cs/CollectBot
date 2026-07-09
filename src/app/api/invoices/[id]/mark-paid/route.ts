import { NextRequest, NextResponse } from "next/server"
import getSupabaseServerClient from "@/lib/supabase/server"
import { generateReceipt } from "@/lib/pdf/generateReceipt"

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
      return NextResponse.json({ error: "Business profile not found" }, { status: 400 })
    }

    // Fetch invoice to check ownership and details
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*, client:clients(id, total_paid)")
      .eq("id", id)
      .eq("business_id", business.id)
      .maybeSingle()

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    if (invoice.status === "paid") {
      return NextResponse.json({ error: "Invoice is already marked as paid." }, { status: 400 })
    }

    const body = await request.json()
    const { amount, payment_method, payment_date, notes } = body

    if (!amount) {
      return NextResponse.json({ error: "Payment amount is required" }, { status: 400 })
    }

    const parsedAmount = Number(amount)
    const paidAt = payment_date ? new Date(payment_date).toISOString() : new Date().toISOString()

    // 1. Insert manual payment record
    // Note: DB payment_method is restricted to: 'upi','card','netbanking','wallet','manual','online'
    // So we use 'manual' and include the details (e.g. Cash/Cheque) in notes
    const methodDetails = payment_method ? ` (${payment_method})` : ""
    const paymentNotes = notes ? `${notes}${methodDetails}` : `Manual payment cleared${methodDetails}`

    const { data: paymentRecord, error: paymentError } = await supabase
      .from("payments")
      .insert({
        invoice_id: id,
        business_id: business.id,
        amount: parsedAmount,
        payment_method: "manual",
        status: "success",
        paid_at: paidAt,
        notes: paymentNotes,
      })
      .select()
      .single()

    if (paymentError) throw paymentError

    // 2. Update Invoice: status='paid', amount_paid, balance_due, paid_at
    const { data: updatedInvoice, error: updateError } = await supabase
      .from("invoices")
      .update({
        status: "paid",
        amount_paid: parsedAmount,
        balance_due: Math.max(0, Number(invoice.total) - parsedAmount),
        paid_at: paidAt,
        reminder_paused: true,
      })
      .eq("id", id)
      .select()
      .single()

    if (updateError) throw updateError

    // 3. Update client total_paid
    if (invoice.client?.id) {
      const currentClientPaid = Number(invoice.client.total_paid) || 0
      await supabase
        .from("clients")
        .update({ total_paid: currentClientPaid + parsedAmount })
        .eq("id", invoice.client.id)
    }

    // 4. Log activity
    await supabase.from("activity_logs").insert({
      business_id: business.id,
      type: "payment_received",
      description: `Payment of ₹${parsedAmount.toLocaleString("en-IN")} manually cleared for ${invoice.invoice_number}`,
      metadata: { 
        invoice_id: id,
        payment_id: paymentRecord.id,
        manual: true 
      },
    })

    // 5. Generate receipt PDF
    try {
      await generateReceipt(id)
    } catch (pdfErr) {
      console.error("Receipt compilation failed on manual clearance:", pdfErr)
    }

    return NextResponse.json({ success: true, invoice: updatedInvoice })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Something went wrong" }, { status: 500 })
  }
}
