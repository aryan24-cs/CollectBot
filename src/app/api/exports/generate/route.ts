import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"
import { requireBusinessUser } from "@/lib/auth/checkRole"

export async function POST(request: NextRequest) {
  const { error, user, business } = await requireBusinessUser(request)
  if (error) return error

  try {
    const body = await request.json()
    const { format, entity_type, startDate, endDate, status } = body

    if (!format || !entity_type) {
      return NextResponse.json({ error: "Format and entity type are required." }, { status: 400 })
    }

    const adminDb = getSupabaseServiceRoleClient()

    // 1. Fetch Invoices or Data based on entity_type
    let query = adminDb
      .from("invoices")
      .select("*, client:clients(*), items:invoice_items(*)")
      .eq("business_id", business.id)

    if (startDate) query = query.gte("issue_date", startDate)
    if (endDate) query = query.lte("issue_date", endDate)
    if (status && status !== "all") query = query.eq("status", status)

    const { data: invoices, error: fetchErr } = await query.order("issue_date", { ascending: true })

    if (fetchErr) throw fetchErr

    const invoiceList = invoices || []
    let outputContent = ""
    let mimeType = "text/plain"
    let fileExtension = "txt"

    // 2. Format Execution
    if (format === "tally_xml") {
      mimeType = "application/xml"
      fileExtension = "xml"
      
      // Tally XML Voucher Schema Generator
      const xmlVouchers = invoiceList.map((inv: any) => {
        const clientName = inv.client?.name || inv.client?.company_name || "Cash Customer"
        const gstin = inv.client?.gstin || ""
        const dateFormatted = inv.issue_date ? inv.issue_date.replace(/-/g, "") : "20260101"

        return `
    <VOUCHER VCHTYPE="Sales" ACTION="Create">
      <DATE>${dateFormatted}</DATE>
      <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
      <VOUCHERNUMBER>${inv.invoice_number}</VOUCHERNUMBER>
      <PARTYLEDGERNAME>${escapeXml(clientName)}</PARTYLEDGERNAME>
      <PERSISTEDVIEW>Invoice Voucher View</PERSISTEDVIEW>
      <ALLLEDGERENTRIES.LIST>
        <LEDGERNAME>${escapeXml(clientName)}</LEDGERNAME>
        <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
        <AMOUNT>-${inv.total}</AMOUNT>
      </ALLLEDGERENTRIES.LIST>
      <ALLLEDGERENTRIES.LIST>
        <LEDGERNAME>Sales Account</LEDGERNAME>
        <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
        <AMOUNT>${inv.subtotal}</AMOUNT>
      </ALLLEDGERENTRIES.LIST>
      ${inv.tax_amount > 0 ? `
      <ALLLEDGERENTRIES.LIST>
        <LEDGERNAME>Output GST</LEDGERNAME>
        <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
        <AMOUNT>${inv.tax_amount}</AMOUNT>
      </ALLLEDGERENTRIES.LIST>` : ""}
    </VOUCHER>`
      }).join("")

      outputContent = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          ${xmlVouchers}
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`

    } else if (format === "tally_csv" || format === "custom_csv" || format === "quickbooks_csv") {
      mimeType = "text/csv"
      fileExtension = "csv"

      // CSV Header
      const headers = ["Invoice Number", "Date", "Due Date", "Client Name", "GSTIN", "Status", "Subtotal", "Tax Amount", "Discount", "Total", "Amount Paid", "Balance Due"]
      const rows = invoiceList.map((inv: any) => [
        `"${inv.invoice_number}"`,
        `"${inv.issue_date}"`,
        `"${inv.due_date}"`,
        `"${inv.client?.name || inv.client?.company_name || 'Cash Customer'}"`,
        `"${inv.client?.gstin || ''}"`,
        `"${inv.status}"`,
        inv.subtotal,
        inv.tax_amount || 0,
        inv.discount || 0,
        inv.total,
        inv.amount_paid || 0,
        inv.balance_due || 0
      ].join(","))

      outputContent = [headers.join(","), ...rows].join("\n")
    }

    // 3. Log Export Job (safely if table exists)
    try {
      await adminDb.from("export_jobs").insert({
        business_id: business.id,
        format,
        entity_type,
        filters: { startDate, endDate, status },
        item_count: invoiceList.length,
        status: "completed",
        created_by: user.id
      })
    } catch (_) {
      // export_jobs is an optional audit log table; ignore if not migrated
    }

    // Log Activity
    try {
      await adminDb.from("activity_logs").insert({
        business_id: business.id,
        type: "data_exported",
        description: `Exported ${invoiceList.length} ${entity_type} records as ${format.toUpperCase()}.`,
        metadata: { format, count: invoiceList.length }
      })
    } catch (e) {
      console.error("Failed to log activity for export:", e)
    }

    return new NextResponse(outputContent, {
      status: 200,
      headers: {
        "Content-Type": `${mimeType}; charset=utf-8`,
        "Content-Disposition": `attachment; filename="CollectBot_${entity_type}_${format}_${Date.now()}.${fileExtension}"`
      }
    })
  } catch (err: any) {
    console.error("POST /api/exports/generate error:", err)
    return NextResponse.json({ error: err.message || "Failed to generate export" }, { status: 500 })
  }
}

function escapeXml(unsafe: string) {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}
