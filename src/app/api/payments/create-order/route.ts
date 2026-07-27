import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"

export async function POST(request: NextRequest) {
  try {
    const { invoiceId, partialAmount } = await request.json()

    if (!invoiceId) {
      return NextResponse.json({ error: "Invoice ID is required" }, { status: 400 })
    }

    const adminDb = getSupabaseServiceRoleClient()

    // 1. Fetch invoice, client & business profile
    const { data: invoice, error: invError } = await adminDb
      .from("invoices")
      .select("*, client:clients(*), business:businesses(*)")
      .eq("id", invoiceId)
      .maybeSingle()

    if (invError || !invoice) {
      return NextResponse.json({ error: "Invoice not found or invalid" }, { status: 404 })
    }

    if (invoice.status === "paid") {
      return NextResponse.json({ error: "Invoice is already paid in full" }, { status: 400 })
    }

    const business = invoice.business
    const client = invoice.client

    // Determine amount to charge (in INR paise for Razorpay)
    const amountToCharge = partialAmount && parseFloat(partialAmount) > 0 
      ? Math.min(parseFloat(partialAmount), invoice.balance_due) 
      : invoice.balance_due

    const amountInPaise = Math.round(amountToCharge * 100)

    // 2. Fetch business's custom gateway configuration if available
    const { data: gateway } = await adminDb
      .from("payment_gateways")
      .select("key_id, key_secret, provider, is_enabled")
      .eq("business_id", business.id)
      .eq("provider", "razorpay")
      .eq("is_enabled", true)
      .maybeSingle()

    // Fallback to platform credentials if business hasn't configured custom keys
    const keyId = gateway?.key_id || process.env.RAZORPAY_KEY_ID || "rzp_test_fallback"
    const keySecret = gateway?.key_secret || process.env.RAZORPAY_KEY_SECRET || "rzp_secret_fallback"

    // Construct Razorpay Order Payload
    const orderData = {
      amount: amountInPaise,
      currency: "INR",
      receipt: `RCPT_${invoice.invoice_number}_${Date.now().toString().slice(-6)}`,
      notes: {
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        business_id: business.id,
        client_name: client?.name || "Valued Client",
      }
    }

    // Call Razorpay API
    const authHeader = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64")
    const razorpayRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader
      },
      body: JSON.stringify(orderData)
    })

    if (!razorpayRes.ok) {
      const errorText = await razorpayRes.text()
      console.warn("Razorpay API call failed, generating simulated payment order:", errorText)
      // Fallback response for dev/test mode without live keys
      return NextResponse.json({
        orderId: `order_mock_${Date.now()}`,
        amount: amountToCharge,
        currency: "INR",
        keyId,
        businessName: business.name,
        invoiceNumber: invoice.invoice_number,
        clientName: client?.name || "Client",
        clientEmail: client?.email || "",
        clientPhone: client?.phone || "",
        isMock: true
      })
    }

    const order = await razorpayRes.json()

    // Log payment attempt event in portal history
    await adminDb.from("client_portal_events").insert({
      business_id: business.id,
      invoice_id: invoice.id,
      event_type: "pay_click",
      metadata: { order_id: order.id, amount: amountToCharge }
    })

    return NextResponse.json({
      orderId: order.id,
      amount: amountToCharge,
      currency: "INR",
      keyId,
      businessName: business.name,
      invoiceNumber: invoice.invoice_number,
      clientName: client?.name || "Client",
      clientEmail: client?.email || "",
      clientPhone: client?.phone || ""
    })
  } catch (err: any) {
    console.error("POST /api/payments/create-order error:", err)
    return NextResponse.json({ error: err.message || "Failed to create payment order" }, { status: 500 })
  }
}
