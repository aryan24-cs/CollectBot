import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"
import { requireBusinessUser } from "@/lib/auth/checkRole"
import { invoiceSchema } from "@/lib/validations/invoice"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: authError, business } = await requireBusinessUser(request)
  if (authError) return authError

  try {
    const { id } = await params
    const adminDb = getSupabaseServiceRoleClient()

    // Fetch invoice details
    const { data: invoice, error: invoiceError } = await adminDb
      .from("invoices")
      .select(`
        *,
        client:clients(*),
        items:invoice_items(*),
        business:businesses(*),
        payments:payments(*),
        recurring_schedules:recurring_schedules(*)
      `)
      .eq("id", id)
      .eq("business_id", business.id)
      .maybeSingle()

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    return NextResponse.json(invoice)
  } catch (err: any) {
    console.error("GET /api/invoices/[id] error:", err)
    return NextResponse.json({ error: err.message || "Something went wrong" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: authError, business } = await requireBusinessUser(request)
  if (authError) return authError

  try {
    const { id } = await params
    const adminDb = getSupabaseServiceRoleClient()

    // 1. Fetch existing invoice
    const { data: existingInvoice } = await adminDb
      .from("invoices")
      .select("*, items:invoice_items(*)")
      .eq("id", id)
      .eq("business_id", business.id)
      .maybeSingle()

    if (!existingInvoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    // Block edit if invoice is paid or cancelled
    if (existingInvoice.status === "paid" || existingInvoice.status === "cancelled") {
      return NextResponse.json(
        { error: `Cannot edit an invoice that is already marked as ${existingInvoice.status}.` },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validation = invoiceSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.format() }, { status: 400 })
    }

    const { client_id, invoice_number, issue_date, due_date, discount, notes, terms, is_recurring, items } = validation.data

    // Check uniqueness of invoice number if changed
    if (invoice_number !== existingInvoice.invoice_number) {
      const { data: dupCheck } = await adminDb
        .from("invoices")
        .select("id")
        .eq("business_id", business.id)
        .eq("invoice_number", invoice_number)
        .neq("id", id)
        .maybeSingle()

      if (dupCheck) {
        return NextResponse.json(
          { error: "Invoice number already exists. Please choose a different one." },
          { status: 400 }
        )
      }
    }

    // 2. Recalculate totals
    let subtotal = 0
    let tax_amount = 0

    const preparedItems = items.map((item, index) => {
      const qty = Number(item.quantity) || 0
      const rate = Number(item.rate) || 0
      const taxRate = Number(item.tax_rate) || 0
      const amount = qty * rate
      const taxVal = amount * (taxRate / 100)

      subtotal += amount
      tax_amount += taxVal

      return {
        description: item.description,
        quantity: qty,
        rate: rate,
        amount: amount,
        tax_rate: taxRate,
        tax_amount: taxVal,
        sort_order: item.sort_order || index,
      }
    })

    const total = Math.max(0, subtotal + tax_amount - Number(discount || 0))
    const amount_paid = Number(existingInvoice.amount_paid) || 0
    const balance_due = Math.max(0, total - amount_paid)

    // 3. Update Invoice record
    const { data: updatedInvoice, error: updateError } = await adminDb
      .from("invoices")
      .update({
        client_id,
        invoice_number,
        issue_date,
        due_date,
        subtotal,
        tax_amount,
        discount: Number(discount || 0),
        total,
        balance_due,
        notes: notes || null,
        terms: terms || null,
        is_recurring: is_recurring || false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (updateError) throw updateError

    // 4. Replace line items: Delete old -> Insert new
    await adminDb
      .from("invoice_items")
      .delete()
      .eq("invoice_id", id)

    const itemsToInsert = preparedItems.map((item) => ({
      ...item,
      invoice_id: id,
    }))

    const { error: itemsInsertError } = await adminDb
      .from("invoice_items")
      .insert(itemsToInsert)

    if (itemsInsertError) throw itemsInsertError

    // 5. Update client's total_invoiced delta
    const delta = total - Number(existingInvoice.total)
    if (delta !== 0 && client_id) {
      const { data: client } = await adminDb
        .from("clients")
        .select("total_invoiced")
        .eq("id", client_id)
        .single()

      if (client) {
        await adminDb
          .from("clients")
          .update({
            total_invoiced: Number(client.total_invoiced || 0) + delta,
          })
          .eq("id", client_id)
      }
    }

    // Log Activity
    await adminDb.from("activity_logs").insert({
      business_id: business.id,
      type: "invoice_updated",
      description: `Invoice ${invoice_number} was updated. New total: ${total}`,
      metadata: { invoice_id: id, total },
    })

    return NextResponse.json({
      ...updatedInvoice,
      items: itemsToInsert,
    })
  } catch (err: any) {
    console.error("PUT /api/invoices/[id] error:", err)
    return NextResponse.json({ error: err.message || "Something went wrong" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: authError, business } = await requireBusinessUser(request)
  if (authError) return authError

  try {
    const { id } = await params
    const adminDb = getSupabaseServiceRoleClient()

    // Fetch existing invoice to check status
    const { data: invoice } = await adminDb
      .from("invoices")
      .select("status, client_id, total")
      .eq("id", id)
      .eq("business_id", business.id)
      .maybeSingle()

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    // ONLY allow delete if 'draft' or 'cancelled'
    if (invoice.status !== "draft" && invoice.status !== "cancelled") {
      return NextResponse.json(
        { error: "Only invoices in 'draft' or 'cancelled' status can be deleted." },
        { status: 400 }
      )
    }

    // Subtract from client's total_invoiced
    if (invoice.client_id) {
      const { data: client } = await adminDb
        .from("clients")
        .select("total_invoiced")
        .eq("id", invoice.client_id)
        .maybeSingle()
      if (client) {
        const currentTotal = Number(client.total_invoiced) || 0
        await adminDb
          .from("clients")
          .update({ total_invoiced: Math.max(0, currentTotal - invoice.total) })
          .eq("id", invoice.client_id)
      }
    }

    // Hard delete (cascade deletes invoice_items)
    const { error: deleteError } = await adminDb
      .from("invoices")
      .delete()
      .eq("id", id)

    if (deleteError) throw deleteError

    // Log Activity
    await adminDb.from("activity_logs").insert({
      business_id: business.id,
      type: "invoice_deleted",
      description: `Invoice ID ${id} was deleted.`,
      metadata: { invoice_id: id },
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("DELETE /api/invoices/[id] error:", err)
    return NextResponse.json({ error: err.message || "Something went wrong" }, { status: 500 })
  }
}
