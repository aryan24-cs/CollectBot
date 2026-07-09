import React from "react"
import { renderToBuffer } from "@react-pdf/renderer"
import { getSupabaseServiceRoleClient } from "../supabase/serviceRole"
import ReceiptDocument from "./ReceiptDocument"

export async function generateReceipt(invoiceId: string): Promise<string> {
  const supabase = getSupabaseServiceRoleClient()

  // 1. Fetch full details (bypass RLS as this is server-only context)
  const { data: invoice, error: fetchError } = await supabase
    .from("invoices")
    .select(`
      *,
      client:clients(*),
      items:invoice_items(*),
      business:businesses(*)
    `)
    .eq("id", invoiceId)
    .maybeSingle()

  if (fetchError || !invoice) {
    throw new Error(`Invoice not found during receipt generation: ${fetchError?.message || "Record missing"}`)
  }

  // 2. Render PDF receipt document
  let pdfBuffer: Buffer
  try {
    pdfBuffer = await renderToBuffer(
      React.createElement(ReceiptDocument, {
        invoice,
        client: invoice.client,
        business: invoice.business,
      }) as any
    ) as Buffer
  } catch (renderError: any) {
    console.error("React-pdf renderToBuffer failed:", renderError)
    throw new Error(`Receipt rendering failed: ${renderError.message}`)
  }

  // 3. Upload to Supabase Storage (invoices bucket: invoices/{business_id}/{invoice_id}.pdf)
  // Overwriting the invoice URL allows the client's link to show the Paid Receipt
  const fileName = `invoices/${invoice.business.id}/${invoice.id}.pdf`
  const { error: uploadError } = await supabase.storage
    .from("invoices")
    .upload(fileName, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    })

  if (uploadError) {
    throw new Error(`Supabase Storage receipt upload failed: ${uploadError.message}`)
  }

  // 4. Get the public URL
  const { data: { publicUrl } } = supabase.storage
    .from("invoices")
    .getPublicUrl(fileName)

  // 5. Update invoice record
  const updatePayload: Record<string, any> = {
    pdf_url: publicUrl,
    receipt_url: publicUrl,
  }

  const { error: updateError } = await supabase
    .from("invoices")
    .update(updatePayload)
    .eq("id", invoiceId)

  if (updateError) {
    console.error("Failed to update invoice URLs after receipt upload:", updateError.message)
    // Non-blocking error since PDF was uploaded
  }

  return publicUrl
}
