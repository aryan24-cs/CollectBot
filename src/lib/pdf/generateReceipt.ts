import React from "react"
import { renderToBuffer } from "@react-pdf/renderer"
import { getSupabaseServiceRoleClient } from "../supabase/serviceRole"
import ReceiptDocument from "./ReceiptDocument"

export async function generateReceipt(invoiceId: string): Promise<string> {
  const supabase = getSupabaseServiceRoleClient()

  // 1. Fetch full details (bypass RLS as this is server-only context)
  const { data: invoiceRaw, error: fetchError } = await (supabase as any)
    .from("invoices")
    .select(`
      *,
      client:clients(*),
      items:invoice_items(*),
      business:businesses(*)
    `)
    .eq("id", invoiceId)
    .maybeSingle()

  const invoice = invoiceRaw as any

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
    console.error("PDF Receipt generation failed:", renderError)
    throw new Error(`PDF Render error: ${renderError?.message || "Unknown error"}`)
  }

  // 3. Upload to Supabase Storage
  const fileName = `receipt-${invoice.invoice_number}-${Date.now()}.pdf`
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
  const { error: updateError } = await (supabase as any)
    .from("invoices")
    .update({ pdf_url: publicUrl })
    .eq("id", invoiceId)


  if (updateError) {
    console.error("Failed to update invoice URLs after receipt upload:", updateError.message)
    // Non-blocking error since PDF was uploaded
  }

  return publicUrl
}
