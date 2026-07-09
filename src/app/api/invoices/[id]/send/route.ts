import { NextRequest, NextResponse } from "next/server"
import getSupabaseServerClient from "@/lib/supabase/server"
import { createPaymentLink } from "@/lib/razorpay/createPaymentLink"
import { renderToBuffer } from "@react-pdf/renderer"
import React from "react"
import InvoiceDocument from "@/lib/pdf/InvoiceDocument"
import { sendInvoiceNotification } from "@/lib/whatsapp/templates"
import { sendInvoiceEmail } from "@/lib/email/send"

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

          invoice.pdf_url = publicUrl
        }
      } catch (pdfErr) {
        console.error("PDF generation failed during Send:", pdfErr)
      }
    }

    // Fetch notification settings
    const { data: settings } = await supabase
      .from("notification_settings")
      .select("*")
      .eq("business_id", invoice.business.id)
      .maybeSingle()

    const channelWhatsapp = false // Forced false to disable WhatsApp
    const channelEmail = true // Forced true to ensure email delivery
    const sentVia: string[] = []

    const formattedAmount = `₹${Number(invoice.total).toLocaleString("en-IN")}`

    // 1. Send WhatsApp if enabled
    if (channelWhatsapp && invoice.client.phone) {
      try {
        const waResult = await sendInvoiceNotification({
          phone: invoice.client.phone,
          clientName: invoice.client.name,
          invoiceNumber: invoice.invoice_number,
          businessName: invoice.business.name,
          amount: formattedAmount,
          dueDate: invoice.due_date,
          paymentLink: url,
        })

        if (waResult.success) {
          sentVia.push("whatsapp")
          await supabase.from("reminder_logs").insert({
            invoice_id: invoice.id,
            business_id: invoice.business.id,
            reminder_type: "invoice_sent",
            channel: "whatsapp",
            status: "sent",
            message_content: `WhatsApp notification successfully sent to +91${invoice.client.phone.slice(-10)}`,
          })
        } else {
          await supabase.from("reminder_logs").insert({
            invoice_id: invoice.id,
            business_id: invoice.business.id,
            reminder_type: "invoice_sent",
            channel: "whatsapp",
            status: "failed",
            error_message: waResult.error || "Failed to dispatch WhatsApp message via Interakt",
          })
        }
      } catch (waErr: any) {
        console.error("WhatsApp notification trigger crashed:", waErr)
        await supabase.from("reminder_logs").insert({
          invoice_id: invoice.id,
          business_id: invoice.business.id,
          reminder_type: "invoice_sent",
          channel: "whatsapp",
          status: "failed",
          error_message: waErr.message || "WhatsApp send call crashed internally",
        })
      }
    }

    // 2. Send Email if enabled
    if (channelEmail && invoice.client.email) {
      try {
        const emailItems = (invoice.items || []).map((item: any) => ({
          description: item.description,
          amount: `₹${Number(item.amount).toLocaleString("en-IN")}`,
        }))

        await sendInvoiceEmail({
          to: invoice.client.email,
          businessName: invoice.business.name,
          businessLogo: invoice.business.logo_url,
          clientName: invoice.client.name,
          invoiceNumber: invoice.invoice_number,
          amount: formattedAmount,
          dueDate: invoice.due_date,
          paymentLink: url,
          items: emailItems,
          businessPhone: invoice.business.phone || "",
          businessEmail: invoice.business.email || "",
          pdfUrl: invoice.pdf_url,
        })

        sentVia.push("email")
        await supabase.from("reminder_logs").insert({
          invoice_id: invoice.id,
          business_id: invoice.business.id,
          reminder_type: "invoice_sent",
          channel: "email",
          status: "sent",
          message_content: `Email notification successfully sent to ${invoice.client.email}`,
        })
      } catch (mailErr: any) {
        console.error("Email notification trigger crashed:", mailErr)
        await supabase.from("reminder_logs").insert({
          invoice_id: invoice.id,
          business_id: invoice.business.id,
          reminder_type: "invoice_sent",
          channel: "email",
          status: "failed",
          error_message: mailErr.message || "Resend email dispatch crashed internally",
        })
      }
    }

    // Log in activity_logs
    await supabase.from("activity_logs").insert({
      business_id: invoice.business.id,
      type: "invoice_sent",
      description: `Invoice "${invoice.invoice_number}" was sent to ${invoice.client.name}. Payment link created.`,
      metadata: { 
        invoice_id: invoice.id,
        payment_link: url,
        sent_via: sentVia
      },
    })

    return NextResponse.json({ success: true, paymentLink: url, sentVia })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Something went wrong" }, { status: 500 })
  }
}
