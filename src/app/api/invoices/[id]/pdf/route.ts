import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"
import { requireBusinessUser } from "@/lib/auth/checkRole"
import { renderToBuffer } from "@react-pdf/renderer"
import React from "react"
import InvoiceDocument from "@/lib/pdf/InvoiceDocument"
import ReceiptDocument from "@/lib/pdf/ReceiptDocument"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: authError, business } = await requireBusinessUser(request)
  if (authError) return authError

  try {
    const { id } = await params
    const adminDb = getSupabaseServiceRoleClient()

    // Fetch Invoice details
    const { data: invoice, error: invoiceError } = await adminDb
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

    const docType = invoice.status === "paid" ? "receipts" : "invoices"
    const fileName = `${docType}/${business.id}/${invoice.id}.pdf`

    const { error: uploadError } = await adminDb.storage
      .from("invoices")
      .upload(fileName, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      })

    if (uploadError) {
      console.error("Storage upload failed:", uploadError)
      throw new Error(`Failed to upload generated PDF: ${uploadError.message}`)
    }

    const { data: { publicUrl } } = adminDb.storage
      .from("invoices")
      .getPublicUrl(fileName)

    await adminDb
      .from("invoices")
      .update({ pdf_url: publicUrl, updated_at: new Date().toISOString() })
      .eq("id", id)

    return NextResponse.json({
      success: true,
      url: publicUrl,
      type: docType,
    })
  } catch (err: any) {
    console.error("POST /api/invoices/[id]/pdf error:", err)
    return NextResponse.json({ error: err.message || "Failed to generate PDF" }, { status: 500 })
  }
}
