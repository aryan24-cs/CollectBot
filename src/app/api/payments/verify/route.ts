import { NextRequest, NextResponse } from "next/server"
import { razorpay } from "@/lib/razorpay/client"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"
import crypto from "crypto"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      razorpay_payment_id, 
      razorpay_payment_link_id, 
      razorpay_payment_link_reference_id,
      razorpay_payment_link_status,
      razorpay_signature, 
      invoice_id 
    } = body

    if (!razorpay_payment_id || !invoice_id) {
      return NextResponse.json({ error: "Missing required verification fields." }, { status: 400 })
    }

    const supabase = getSupabaseServiceRoleClient()

    // 1. Fetch Invoice
    const { data: invoice } = await supabase
      .from("invoices")
      .select("total, status")
      .eq("id", invoice_id)
      .maybeSingle()

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found." }, { status: 404 })
    }

    // 2. Fetch payment details from Razorpay API
    let payment
    try {
      payment = await razorpay.payments.fetch(razorpay_payment_id)
    } catch (err: any) {
      console.error("Failed to fetch payment details from Razorpay:", err)
      return NextResponse.json({ verified: false, error: "Payment not found on Razorpay." })
    }

    // 3. Confirm amount matches invoice amount (Razorpay amount is in paise)
    const expectedAmountPaise = Math.round(Number(invoice.total) * 100)
    const isAmountMatch = Number(payment.amount) === expectedAmountPaise

    // 4. Verify notes link
    const isInvoiceMatch = payment.notes?.invoice_id === invoice_id

    // 5. Check payment status is successful
    const isSuccessStatus = ["captured", "authorized"].includes(payment.status)

    // Optional: Signature verification if details are available
    let isSignatureValid = true
    if (razorpay_signature && razorpay_payment_link_id && razorpay_payment_link_status) {
      const refId = razorpay_payment_link_reference_id || ""
      const signString = `${razorpay_payment_link_id}|${refId}|${razorpay_payment_link_status}|${razorpay_payment_id}`
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
        .update(signString)
        .digest("hex")
      
      isSignatureValid = crypto.timingSafeEqual(
        Buffer.from(razorpay_signature, "utf-8"),
        Buffer.from(expectedSignature, "utf-8")
      )
    }

    const isVerified = isAmountMatch && isInvoiceMatch && isSuccessStatus && isSignatureValid

    return NextResponse.json({ 
      verified: isVerified,
      details: {
        status: payment.status,
        amount: Number(payment.amount) / 100,
        method: payment.method,
      }
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Verification failed." }, { status: 500 })
  }
}
