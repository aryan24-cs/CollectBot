import { NextRequest, NextResponse } from "next/server"
import { verifyWebhookSignature } from "@/lib/razorpay/verifyWebhook"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"
import { generateReceipt } from "@/lib/pdf/generateReceipt"
import { sendPaymentThankYou, sendOwnerPaymentAlert as sendOwnerPaymentAlertWhatsApp } from "@/lib/whatsapp/templates"
import { sendReceiptEmail, sendOwnerPaymentAlert as sendOwnerPaymentAlertEmail } from "@/lib/email/send"

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get("x-razorpay-signature") || ""
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || ""

  // 1. Verify webhook signature
  if (!verifyWebhookSignature({ body: rawBody, signature, secret })) {
    console.error("Razorpay webhook signature verification failed.")
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  let event
  try {
    event = JSON.parse(rawBody)
  } catch (err) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  const allowedEvents = ["payment_link.paid", "payment.captured"]
  if (!allowedEvents.includes(event.event)) {
    return NextResponse.json({ status: `Ignored event: ${event.event}` }, { status: 200 })
  }

  try {
    const supabase = getSupabaseServiceRoleClient()
    let invoiceId = ""
    let businessId = ""
    let amount = 0
    let paymentMethod = "online"
    let razorpayPaymentId = ""
    let razorpayOrderId: string | null = null

    // Extract payload details based on event type
    if (event.event === "payment_link.paid") {
      const paymentLinkData = event.payload.payment_link.entity
      const paymentEntity = event.payload.payment.entity
      
      invoiceId = paymentLinkData.notes?.invoice_id
      businessId = paymentLinkData.notes?.business_id
      amount = Number(paymentEntity.amount) / 100
      paymentMethod = paymentEntity.method || "online"
      razorpayPaymentId = paymentEntity.id
      razorpayOrderId = paymentEntity.order_id || null
    } else if (event.event === "payment.captured") {
      const paymentEntity = event.payload.payment.entity
      
      invoiceId = paymentEntity.notes?.invoice_id
      businessId = paymentEntity.notes?.business_id
      amount = Number(paymentEntity.amount) / 100
      paymentMethod = paymentEntity.method || "online"
      razorpayPaymentId = paymentEntity.id
      razorpayOrderId = paymentEntity.order_id || null
    }

    if (!invoiceId) {
      console.warn(`Webhook received for event ${event.event} but was missing invoice_id note.`)
      return NextResponse.json({ error: "Missing invoice_id in notes" }, { status: 200 })
    }

    // 2. Check for duplicate payment transaction ID
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id")
      .eq("razorpay_id", razorpayPaymentId)
      .maybeSingle()

    if (existingPayment) {
      console.log(`Payment duplicate detected: razorpay_id ${razorpayPaymentId} already processed.`)
      return NextResponse.json({ status: "Duplicate event already processed" }, { status: 200 })
    }

    // Fetch Invoice details to verify amounts and retrieve client info
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("id, business_id, client_id, total, status, invoice_number")
      .eq("id", invoiceId)
      .maybeSingle()

    if (invoiceError || !invoice) {
      console.error(`Invoice ID ${invoiceId} not found in database for webhook processing.`)
      return NextResponse.json({ error: "Associated invoice not found" }, { status: 200 })
    }

    // Fallback IDs if they weren't in notes
    businessId = businessId || invoice.business_id

    // 3. Update Database (RLS bypassed using service role key)
    const nowStr = new Date().toISOString()

    // 3a. Insert payment record
    const { error: insertPayError } = await supabase
      .from("payments")
      .insert({
        invoice_id: invoiceId,
        business_id: businessId,
        amount: amount,
        payment_method: paymentMethod,
        razorpay_id: razorpayPaymentId,
        razorpay_order_id: razorpayOrderId,
        status: "success",
        paid_at: nowStr,
        notes: `Processed automatically via Razorpay Webhook [Event: ${event.event}]`
      })

    if (insertPayError) throw insertPayError

    // 3b. Update invoice details
    const { error: updateInvoiceError } = await supabase
      .from("invoices")
      .update({
        status: "paid",
        amount_paid: amount,
        balance_due: 0,
        paid_at: nowStr,
        reminder_paused: true,
      })
      .eq("id", invoiceId)

    if (updateInvoiceError) throw updateInvoiceError

    // 3c. Update client total paid
    if (invoice.client_id) {
      const { data: client } = await supabase
        .from("clients")
        .select("total_paid")
        .eq("id", invoice.client_id)
        .maybeSingle()
      
      if (client) {
        const currentPaid = Number(client.total_paid) || 0
        const { error: clientUpdateErr } = await supabase
          .from("clients")
          .update({ total_paid: currentPaid + amount })
          .eq("id", invoice.client_id)
        
        if (clientUpdateErr) {
          console.error("Failed to update client paid statistics:", clientUpdateErr.message)
        }
      }
    }

    // 3d. Log activity
    await supabase
      .from("activity_logs")
      .insert({
        business_id: businessId,
        type: "payment_received",
        description: `Payment of ₹${amount.toLocaleString("en-IN")} received online for INV-${invoice.invoice_number.substring(invoice.invoice_number.indexOf("-") + 1)}`,
        metadata: { 
          invoice_id: invoiceId, 
          razorpay_payment_id: razorpayPaymentId,
          notifications_pending: true 
        },
      })

    // 4. Generate receipt PDF & upload to storage
    try {
      await generateReceipt(invoiceId)
      console.log(`Receipt PDF compiled and saved for Invoice: ${invoiceId}`)
    } catch (pdfErr) {
      console.error("Receipt generation failed in webhook callback:", pdfErr)
      // Do not fail the webhook request because payment record was successfully logged
    }

    // 5. Fetch completed details for post-payment notifications
    try {
      const { data: fullInvoice } = await supabase
        .from("invoices")
        .select(`
          *,
          client:clients(*),
          business:businesses(*, notification_settings(*))
        `)
        .eq("id", invoiceId)
        .maybeSingle()

      if (fullInvoice) {
        const rawSettings = fullInvoice.business?.notification_settings
        const settings = Array.isArray(rawSettings) ? rawSettings[0] : rawSettings

        const promises = []
        const formattedAmount = `₹${Number(amount).toLocaleString("en-IN")}`
        const todayStr = new Date(nowStr).toLocaleDateString("en-IN")

        // 5a. Client thank-you WhatsApp (Forced false to disable WhatsApp)
        if (false && fullInvoice.client?.phone) {
          promises.push(
            sendPaymentThankYou({
              phone: fullInvoice.client.phone,
              clientName: fullInvoice.client.name,
              amount: formattedAmount,
              businessName: fullInvoice.business.name,
              invoiceNumber: fullInvoice.invoice_number,
              date: todayStr,
            })
          )
        }

        // 5b. Client receipt email (Forced true to ensure receipt is always sent to email)
        if (true && fullInvoice.client?.email) {
          promises.push(
            sendReceiptEmail({
              to: fullInvoice.client.email,
              businessName: fullInvoice.business.name,
              clientName: fullInvoice.client.name,
              invoiceNumber: fullInvoice.invoice_number,
              amount: formattedAmount,
              paymentDate: todayStr,
              paymentMethod: paymentMethod,
              razorpayId: razorpayPaymentId,
              receiptUrl: fullInvoice.receipt_url || fullInvoice.pdf_url,
            })
          )
        }

        // 5c. Owner alert WhatsApp (Forced false to disable WhatsApp)
        if (false && fullInvoice.business?.phone) {
          promises.push(
            sendOwnerPaymentAlertWhatsApp({
              phone: fullInvoice.business.phone,
              ownerName: fullInvoice.business.name,
              clientName: fullInvoice.client.name,
              amount: formattedAmount,
              invoiceNumber: fullInvoice.invoice_number,
              paymentMethod: paymentMethod,
            })
          )
        }

        // 5d. Owner alert email (Forced true to ensure owner notification is sent)
        if (true && fullInvoice.business?.email) {
          promises.push(
            sendOwnerPaymentAlertEmail({
              to: fullInvoice.business.email,
              ownerName: fullInvoice.business.name,
              clientName: fullInvoice.client.name,
              amount: formattedAmount,
              invoiceNumber: fullInvoice.invoice_number,
              paymentMethod: paymentMethod,
            })
          )
        }

        // Execute in parallel (fire-and-forget but awaited to guarantee serverless completion)
        await Promise.allSettled(promises)
        console.log("Webhook post-payment notifications successfully completed.")
      }
    } catch (notifErr: any) {
      console.error("Post-payment notifications failed inside webhook:", notifErr.message)
    }

    return NextResponse.json({ status: "Payment logged successfully" }, { status: 200 })
  } catch (err: any) {
    console.error("Webhook processing error:", err.message)
    return NextResponse.json({ error: err.message || "Internal webhook handler error" }, { status: 500 })
  }
}
