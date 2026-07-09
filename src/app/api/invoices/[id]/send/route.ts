import { NextRequest, NextResponse } from "next/server"
import getSupabaseServerClient from "@/lib/supabase/server"
import { createPaymentLink } from "@/lib/razorpay/createPaymentLink"
import { renderToBuffer } from "@react-pdf/renderer"
import React from "react"
import InvoiceDocument from "@/lib/pdf/InvoiceDocument"

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

    // Get the business associated with this user
    const { data: business } = await supabase
      .from("businesses")
      .select("id, name")
      .eq("user_id", user.id)
      .maybeSingle()

    if (!business) {
      return NextResponse.json({ error: "Business profile not found" }, { status: 400 })
    }

    // Fetch the invoice with client, items, and business details
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select(`
        *,
        client:clients(*),
        items:invoice_items(*),
        business:businesses(*)
      `)
      .eq("id", id)
      .eq("business_id", business.id)
      .maybeSingle()

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    // Check status: only allow draft or allow resending (sent, viewed, overdue, partial)
    if (invoice.status === "paid" || invoice.status === "cancelled") {
      return NextResponse.json(
        { error: `Cannot send an invoice that is already ${invoice.status}` },
        { status: 400 }
      )
    }

    // Create the Razorpay payment link
    const paymentDetails = {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      amount: Number(invoice.total),
      clientName: invoice.client.name,
      clientEmail: invoice.client.email,
      clientPhone: invoice.client.phone,
      businessName: invoice.business.name,
      businessId: invoice.business.id,
      dueDate: invoice.due_date,
    }

    let paymentLinkData
    try {
      paymentLinkData = await createPaymentLink(paymentDetails)
    } catch (payError: any) {
      return NextResponse.json(
        { error: `Razorpay connection failed: ${payError.message}` },
        { status: 502 }
      )
    }

    const { url, id: paymentLinkId } = paymentLinkData

    // Update the invoice status and details
    const { error: updateError } = await supabase
      .from("invoices")
      .update({
        payment_link: url,
        payment_link_id: paymentLinkId,
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (updateError) throw updateError

    // Re-fetch invoice with updated values for PDF generation if needed
    invoice.payment_link = url
    invoice.payment_link_id = paymentLinkId
    invoice.status = "sent"

    // Generate and upload PDF if not already generated
    if (!invoice.pdf_url) {
      try {
        const pdfBuffer = await renderToBuffer(
          React.createElement(InvoiceDocument, {
            invoice,
            client: invoice.client,
            items: invoice.items,
            business: invoice.business,
          }) as any
        )

        const fileName = `invoices/${invoice.business.id}/${invoice.id}.pdf`
        const { error: uploadError } = await supabase.storage
          .from("invoices")
          .upload(fileName, pdfBuffer, {
            contentType: "application/pdf",
            upsert: true,
          })

        if (uploadError) {
          console.error("Storage upload failed during Send:", uploadError.message)
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from("invoices")
            .getPublicUrl(fileName)
          
          await supabase
            .from("invoices")
            .update({ pdf_url: publicUrl })
            .eq("id", id)
        }
      } catch (pdfErr) {
        console.error("PDF generation failed during Send:", pdfErr)
      }
    }

    // Trigger Notifications (Phase 4 - skip for now, log placeholder)
    console.log(`[Phase 4 Notification Trigger] Triggering Whatsapp & Email dispatch for invoice ${invoice.invoice_number}`)

    // Log in activity_logs
    await supabase.from("activity_logs").insert({
      business_id: invoice.business.id,
      type: "invoice_sent",
      description: `Invoice "${invoice.invoice_number}" was sent to ${invoice.client.name}. Payment link created.`,
      metadata: { 
        invoice_id: invoice.id,
        payment_link: url,
        notifications_pending: true 
      },
    })

    return NextResponse.json({ success: true, paymentLink: url })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Something went wrong" }, { status: 500 })
  }
}
