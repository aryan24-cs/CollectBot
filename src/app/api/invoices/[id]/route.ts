import { NextRequest, NextResponse } from "next/server"
import getSupabaseServerClient from "@/lib/supabase/server"
import { invoiceSchema } from "@/lib/validations/invoice"

export async function GET(
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

    // Fetch invoice details
    const { data: invoice, error: invoiceError } = await supabase
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
    return NextResponse.json({ error: err.message || "Something went wrong" }, { status: 500 })
  }
}

export async function PUT(
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

    // Fetch existing invoice to verify status
    const { data: existingInvoice, error: fetchError } = await supabase
      .from("invoices")
      .select("status, client_id, total")
      .eq("id", id)
      .eq("business_id", business.id)
      .maybeSingle()

    if (fetchError || !existingInvoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    // ONLY allow editing drafts
    if (existingInvoice.status !== "draft") {
      return NextResponse.json({ error: "Only invoices in 'draft' status can be modified." }, { status: 400 })
    }

    const body = await request.json()
    const validation = invoiceSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.format() }, { status: 400 })
    }

    const { client_id, invoice_number, issue_date, due_date, discount, notes, terms, is_recurring, items } = validation.data

    // Check duplicate invoice numbers
    const { data: duplicateNum } = await supabase
      .from("invoices")
      .select("id")
      .eq("business_id", business.id)
      .eq("invoice_number", invoice_number)
      .neq("id", id)
      .maybeSingle()

    if (duplicateNum) {
      return NextResponse.json({ error: "Invoice number already in use." }, { status: 400 })
    }

    // Recalculate totals server-side
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
        invoice_id: id,
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
    const balance_due = total

    // Update Invoice record
    const { data: updatedInvoice, error: updateError } = await supabase
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
      })
      .eq("id", id)
      .select()
      .single()

    if (updateError) throw updateError

    // Recreate Invoice Items: Delete old and insert new
    await supabase.from("invoice_items").delete().eq("invoice_id", id)
    const { error: itemsError } = await supabase.from("invoice_items").insert(preparedItems)

    if (itemsError) throw itemsError

    // Manage Recurring Schedules
    if (is_recurring) {
      const scheduleFreq = body.recurring_frequency || "monthly"
      const scheduleStart = body.recurring_start_date || issue_date
      const scheduleEnd = body.recurring_end_date || null

      const templateData = {
        discount: Number(discount || 0),
        notes: notes || "",
        terms: terms || "",
        items: preparedItems.map(it => ({
          description: it.description,
          quantity: it.quantity,
          rate: it.rate,
          tax_rate: it.tax_rate
        }))
      }

      // Check if schedule already exists for this invoice
      const { data: existingSchedule } = await supabase
        .from("recurring_schedules")
        .select("id")
        .eq("invoice_id", id)
        .maybeSingle()

      if (existingSchedule) {
        // Update existing schedule
        await supabase
          .from("recurring_schedules")
          .update({
            client_id: client_id,
            frequency: scheduleFreq,
            next_invoice_date: scheduleStart,
            end_date: scheduleEnd,
            template_data: templateData,
          })
          .eq("id", existingSchedule.id)
      } else {
        // Insert new schedule
        await supabase
          .from("recurring_schedules")
          .insert({
            business_id: business.id,
            client_id: client_id,
            frequency: scheduleFreq,
            next_invoice_date: scheduleStart,
            end_date: scheduleEnd,
            template_data: templateData,
            is_active: true,
            invoice_id: id
          })
      }
    } else {
      // Delete any existing schedule if toggled off
      await supabase
        .from("recurring_schedules")
        .delete()
        .eq("invoice_id", id)
    }

    // Adjust client aggregates total_invoiced statistic
    if (existingInvoice.client_id) {
      const { data: oldClient } = await supabase
        .from("clients")
        .select("total_invoiced")
        .eq("id", existingInvoice.client_id)
        .maybeSingle()
      if (oldClient) {
        const oldVal = Number(oldClient.total_invoiced) || 0
        await supabase
          .from("clients")
          .update({ total_invoiced: Math.max(0, oldVal - existingInvoice.total) })
          .eq("id", existingInvoice.client_id)
      }
    }

    const { data: newClient } = await supabase
      .from("clients")
      .select("total_invoiced")
      .eq("id", client_id)
      .maybeSingle()

    if (newClient) {
      const newVal = Number(newClient.total_invoiced) || 0
      await supabase
        .from("clients")
        .update({ total_invoiced: newVal + total })
        .eq("id", client_id)
    }

    // Log Activity
    await supabase.from("activity_logs").insert({
      business_id: business.id,
      type: "invoice_updated",
      description: `Invoice "${invoice_number}" details were updated.`,
      metadata: { invoice_id: id },
    })

    return NextResponse.json({
      ...updatedInvoice,
      items: preparedItems,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Something went wrong" }, { status: 500 })
  }
}

export async function DELETE(
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

    // Fetch existing invoice to check status
    const { data: invoice } = await supabase
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
      return NextResponse.json({ error: "Only invoices in 'draft' or 'cancelled' status can be deleted." }, { status: 400 })
    }

    // Subtract from client's total_invoiced
    if (invoice.client_id) {
      const { data: client } = await supabase
        .from("clients")
        .select("total_invoiced")
        .eq("id", invoice.client_id)
        .maybeSingle()
      if (client) {
        const currentTotal = Number(client.total_invoiced) || 0
        await supabase
          .from("clients")
          .update({ total_invoiced: Math.max(0, currentTotal - invoice.total) })
          .eq("id", invoice.client_id)
      }
    }

    // Hard delete (cascade deletes invoice_items)
    const { error: deleteError } = await supabase
      .from("invoices")
      .delete()
      .eq("id", id)

    if (deleteError) throw deleteError

    // Log Activity
    await supabase.from("activity_logs").insert({
      business_id: business.id,
      type: "invoice_deleted",
      description: `Invoice ID ${id} was deleted.`,
      metadata: { invoice_id: id },
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Something went wrong" }, { status: 500 })
  }
}
