import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"

export async function POST(request: NextRequest) {
  try {
    const bodyText = await request.text()
    const signature = request.headers.get("x-razorpay-signature")

    let payload: any = {}
    try {
      payload = JSON.parse(bodyText)
    } catch (_) {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
    }

    const eventType = payload.event || "unknown"
    const eventEntity = payload.payload?.payment?.entity || payload.payload?.payment_link?.entity || {}
    const notes = eventEntity.notes || {}
    const invoiceId = notes.invoice_id
    const businessId = notes.business_id

    const adminDb = getSupabaseServiceRoleClient()

    // Log raw webhook event for audit trail
    await adminDb.from("payment_webhooks").insert({
      business_id: businessId || null,
      gateway_provider: "razorpay",
      event_type: eventType,
      payload,
      signature: signature || null,
      status: "processed",
    })

    // Ignore non-payment events
    if (eventType !== "payment.captured" && eventType !== "payment_link.paid" && eventType !== "order.paid") {
      return NextResponse.json({ received: true, status: "ignored" })
    }

    if (!invoiceId) {
      console.warn("Razorpay Webhook missing invoice_id in notes:", eventEntity.id)
      return NextResponse.json({ received: true, note: "Missing invoice_id" })
    }

    // ─────────────────────────────────────────
    // 1. Signature Verification (Security)
    // ─────────────────────────────────────────
    let webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || ""

    if (businessId) {
      const { data: gateway } = await adminDb
        .from("payment_gateways")
        .select("webhook_secret")
        .eq("business_id", businessId)
        .eq("provider", "razorpay")
        .eq("is_enabled", true)
        .maybeSingle()

      if (gateway?.webhook_secret) {
        webhookSecret = gateway.webhook_secret
      }
    }

    if (webhookSecret && signature) {
      try {
        const expectedSignature = crypto
          .createHmac("sha256", webhookSecret)
          .update(bodyText)
          .digest("hex")

        const isValid = crypto.timingSafeEqual(
          Buffer.from(signature, "utf-8"),
          Buffer.from(expectedSignature, "utf-8")
        )

        if (!isValid) {
          console.error("Razorpay webhook signature verification failed.")
          return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 })
        }
      } catch (sigErr) {
        console.error("Error during signature verification:", sigErr)
      }
    }

    const razorpayPaymentId = eventEntity.id || `pay_${Date.now()}`

    // ─────────────────────────────────────────
    // 2. Idempotency Check (Prevent Double Crediting)
    // ─────────────────────────────────────────
    const { data: existingPayment } = await adminDb
      .from("payments")
      .select("id")
      .eq("razorpay_payment_id", razorpayPaymentId)
      .maybeSingle()

    if (existingPayment) {
      return NextResponse.json({ received: true, status: "already_processed" })
    }

    // ─────────────────────────────────────────
    // 3. Fetch Target Invoice
    // ─────────────────────────────────────────
    const { data: invoice } = await adminDb
      .from("invoices")
      .select("*, business:businesses(*), client:clients(*)")
      .eq("id", invoiceId)
      .maybeSingle()

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found for webhook" }, { status: 404 })
    }

    const amountPaidInPaise = eventEntity.amount || Math.round(Number(invoice.balance_due || invoice.total) * 100)
    const amountPaidInRupees = amountPaidInPaise / 100

    const newAmountPaid = (Number(invoice.amount_paid) || 0) + amountPaidInRupees
    const newBalanceDue = Math.max(0, Number(invoice.total) - newAmountPaid)
    const isFullyPaid = newBalanceDue <= 0.01

    const nowIso = new Date().toISOString()
    const todayDate = nowIso.split("T")[0]

    // ─────────────────────────────────────────
    // 4. Update Invoice Status & Paid Amount
    // ─────────────────────────────────────────
    await adminDb
      .from("invoices")
      .update({
        status: isFullyPaid ? "paid" : "partial",
        amount_paid: newAmountPaid,
        balance_due: newBalanceDue,
        paid_at: isFullyPaid ? nowIso : invoice.paid_at,
        updated_at: nowIso,
      })
      .eq("id", invoiceId)

    // ─────────────────────────────────────────
    // 5. Create Payment Transaction Record (Schema Aligned)
    // ─────────────────────────────────────────
    const { data: payment } = await adminDb
      .from("payments")
      .insert({
        invoice_id: invoice.id,
        business_id: invoice.business_id,
        client_id: invoice.client_id || null,
        amount: amountPaidInRupees,
        payment_mode: "razorpay",
        payment_date: todayDate,
        reference_number: razorpayPaymentId,
        razorpay_payment_id: razorpayPaymentId,
        razorpay_order_id: eventEntity.order_id || null,
        notes: `Automated webhook settlement via Razorpay (${razorpayPaymentId})`,
      })
      .select()
      .single()

    // ─────────────────────────────────────────
    // 6. Generate Official Receipt Record
    // ─────────────────────────────────────────
    const receiptNo = `RCPT-${invoice.invoice_number}-${Date.now().toString().slice(-4)}`
    await adminDb.from("payment_receipts").insert({
      business_id: invoice.business_id,
      payment_id: payment?.id || null,
      invoice_id: invoice.id,
      receipt_number: receiptNo,
      sent_at: nowIso,
    })

    // ─────────────────────────────────────────
    // 7. Update Client Totals
    // ─────────────────────────────────────────
    if (invoice.client_id) {
      const { data: client } = await adminDb
        .from("clients")
        .select("total_paid")
        .eq("id", invoice.client_id)
        .single()

      if (client) {
        await adminDb
          .from("clients")
          .update({
            total_paid: (Number(client.total_paid) || 0) + amountPaidInRupees,
            updated_at: nowIso,
          })
          .eq("id", invoice.client_id)
      }
    }

    // ─────────────────────────────────────────
    // 8. Log Workspace Activity & Notification
    // ─────────────────────────────────────────
    await adminDb.from("activity_logs").insert({
      business_id: invoice.business_id,
      type: "payment_settled",
      description: `Payment of ₹${amountPaidInRupees.toLocaleString()} received for Invoice "${invoice.invoice_number}".`,
      metadata: { invoice_id: invoice.id, payment_id: payment?.id, razorpay_id: razorpayPaymentId },
    })

    await adminDb.from("notifications").insert({
      business_id: invoice.business_id,
      title: "Payment Received",
      message: `Invoice #${invoice.invoice_number} paid ₹${amountPaidInRupees.toLocaleString()} via Razorpay.`,
      is_read: false,
    })

    return NextResponse.json({
      success: true,
      invoice_id: invoiceId,
      status: isFullyPaid ? "paid" : "partial",
    })
  } catch (err: any) {
    console.error("POST /api/webhooks/razorpay error:", err)
    return NextResponse.json({ error: err.message || "Webhook processing failed" }, { status: 500 })
  }
}
