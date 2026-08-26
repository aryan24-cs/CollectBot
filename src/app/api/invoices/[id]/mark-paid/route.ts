import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"
import { requireBusinessUser } from "@/lib/auth/checkRole"
import { generateReceipt } from "@/lib/pdf/generateReceipt"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: authError, business } = await requireBusinessUser(request)
  if (authError) return authError

  try {
    const { id } = await params
    const adminDb = getSupabaseServiceRoleClient()

    // Fetch invoice to check ownership and details
    const { data: invoice, error: invoiceError } = await adminDb
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
    const methodDetails = payment_method ? ` (${payment_method})` : ""
    const paymentNotes = notes ? `${notes}${methodDetails}` : `Manual payment cleared${methodDetails}`

    const rawMode = (payment_method || "other").toLowerCase()
    const validModes = ["upi", "bank_transfer", "cash", "cheque", "card", "razorpay", "other"]
    const paymentMode = validModes.includes(rawMode) ? rawMode : "other"

    const { data: paymentRecord, error: paymentError } = await adminDb
      .from("payments")
      .insert({
        invoice_id: id,
        business_id: business.id,
        client_id: invoice.client_id || null,
        amount: parsedAmount,
        payment_mode: paymentMode,
        payment_date: paidAt.split("T")[0],
        notes: paymentNotes,
      })
      .select()
      .single()

    if (paymentError) throw paymentError

    // 2. Compute new totals
    const currentPaid = Number(invoice.amount_paid) || 0
    const newAmountPaid = currentPaid + parsedAmount
    const totalAmount = Number(invoice.total) || 0
    const newBalanceDue = Math.max(0, totalAmount - newAmountPaid)

    const isFullyPaid = newBalanceDue <= 0
    const newStatus = isFullyPaid ? "paid" : "partial"

    // 3. Update Invoice
    const { data: updatedInvoice, error: updateInvoiceError } = await adminDb
      .from("invoices")
      .update({
        amount_paid: newAmountPaid,
        balance_due: newBalanceDue,
        status: newStatus,
        paid_at: isFullyPaid ? paidAt : invoice.paid_at,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (updateInvoiceError) throw updateInvoiceError

    // 4. Update Client's total_paid
    if (invoice.client?.id) {
      const currentClientPaid = Number(invoice.client.total_paid) || 0
      await adminDb
        .from("clients")
        .update({ total_paid: currentClientPaid + parsedAmount })
        .eq("id", invoice.client.id)
    }

    // 5. Generate Receipt in background if fully paid
    if (isFullyPaid) {
      try {
        await generateReceipt(id)
      } catch (receiptErr) {
        console.error("Receipt generation warning:", receiptErr)
      }
    }

    // 6. Log Activity
    await adminDb.from("activity_logs").insert({
      business_id: business.id,
      type: "payment_recorded",
      description: `Recorded payment of ${parsedAmount} for invoice #${invoice.invoice_number}`,
      metadata: { invoice_id: id, payment_id: paymentRecord.id, amount: parsedAmount },
    })

    return NextResponse.json({
      success: true,
      invoice: updatedInvoice,
      payment: paymentRecord,
    })
  } catch (err: any) {
    console.error("POST /api/invoices/[id]/mark-paid error:", err)
    return NextResponse.json({ error: err.message || "Something went wrong" }, { status: 500 })
  }
}
