import { NextRequest, NextResponse } from "next/server"
import getSupabaseServerClient from "@/lib/supabase/server"
import { renderToBuffer } from "@react-pdf/renderer"
import React from "react"
import InvoiceDocument from "@/lib/pdf/InvoiceDocument"
import ReceiptDocument from "@/lib/pdf/ReceiptDocument"

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

    // Fetch Invoice details
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

    let pdfBuffer: any
    if (invoice.status === "paid") {
      pdfBuffer = await renderToBuffer(
        React.createElement(ReceiptDocument, {
          invoice,
          client: invoice.client,
          business: invoice.business,
        }) as any
      )
    } else {
      pdfBuffer = await renderToBuffer(
        React.createElement(InvoiceDocument, {
          invoice,
          client: invoice.client,
          items: invoice.items,
          business: invoice.business,
        }) as any
      )
    }

    // Upload path in bucket: invoices/{business_id}/{invoice_id}.pdf
    const fileName = `invoices/${business.id}/${invoice.id}.pdf`

    const { error: uploadError } = await supabase.storage
      .from("invoices")
      .upload(fileName, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      })

    if (uploadError) {
      // Friendly message helping guide storage bucket creation
      throw new Error(
        `Failed to upload PDF to storage. Please ensure a public storage bucket named "invoices" is created in Supabase. Detailed error: ${uploadError.message}`
      )
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from("invoices")
      .getPublicUrl(fileName)

    // Update pdf_url in invoices table
    await supabase
      .from("invoices")
      .update({ pdf_url: publicUrl })
      .eq("id", invoice.id)

    return NextResponse.json({ url: publicUrl })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to generate PDF" }, { status: 500 })
  }
}
