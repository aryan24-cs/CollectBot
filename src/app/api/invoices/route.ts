import { NextRequest, NextResponse } from "next/server"
import getSupabaseServerClient from "@/lib/supabase/server"
import { invoiceSchema } from "@/lib/validations/invoice"

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: business, error: bizError } = await supabase
      .from("businesses")
      .select("id, invoice_prefix, invoice_counter")
      .eq("user_id", user.id)
      .maybeSingle()

    if (bizError || !business) {
      return NextResponse.json({ error: "Business profile not found. Please complete onboarding first." }, { status: 400 })
    }

    const body = await request.json()
    const validation = invoiceSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.format() }, { status: 400 })
    }

    const { client_id, invoice_number, issue_date, due_date, discount, notes, terms, is_recurring, items } = validation.data

    // Check uniqueness of invoice number
    const { data: existingInv } = await supabase
      .from("invoices")
      .select("id")
      .eq("business_id", business.id)
      .eq("invoice_number", invoice_number)
      .maybeSingle()

    if (existingInv) {
      return NextResponse.json(
        { error: "Invoice number already exists. Please choose a different one." },
        { status: 400 }
      )
    }

    // Calculate totals server-side (do not trust client inputs)
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
    const balance_due = total

    // Insert Invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        business_id: business.id,
        client_id: client_id,
        invoice_number: invoice_number,
        status: "draft",
        issue_date,
        due_date,
        subtotal,
        tax_amount,
        discount: Number(discount || 0),
        total,
        amount_paid: 0,
        balance_due,
        notes: notes || null,
        terms: terms || null,
        is_recurring: is_recurring || false,
      })
      .select()
      .single()

    if (invoiceError) throw invoiceError

    // Insert Invoice Items
    const itemsToInsert = preparedItems.map((item) => ({
      ...item,
      invoice_id: invoice.id,
    }))

    const { error: itemsError } = await supabase
      .from("invoice_items")
      .insert(itemsToInsert)

    if (itemsError) {
      // Rollback invoice creation
      await supabase.from("invoices").delete().eq("id", invoice.id)
      throw itemsError
    }

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
          invoice_id: invoice.id
        })
    }

    // Update Client's total_invoiced statistic
    const { data: client } = await supabase
      .from("clients")
      .select("total_invoiced")
      .eq("id", client_id)
      .maybeSingle()

    if (client) {
      const currentTotal = Number(client.total_invoiced) || 0
      await supabase
        .from("clients")
        .update({ total_invoiced: currentTotal + total })
        .eq("id", client_id)
    }

    // Increment business invoice_counter ONLY if it matches the current counter sequence
    const generatedPrefix = business.invoice_prefix || "INV"
    const currentCounter = business.invoice_counter || 1
    const year = new Date().getFullYear()
    const generatedInvoiceNumber = `${generatedPrefix}-${year}-${String(currentCounter).padStart(3, "0")}`

    if (invoice_number === generatedInvoiceNumber) {
      await supabase
        .from("businesses")
        .update({ invoice_counter: currentCounter + 1 })
        .eq("id", business.id)
    }

    // Log Activity
    await supabase.from("activity_logs").insert({
      business_id: business.id,
      type: "invoice_created",
      description: `Invoice "${invoice_number}" created for amount: ₹${total.toLocaleString("en-IN")}.`,
      metadata: { invoice_id: invoice.id },
    })

    return NextResponse.json({
      ...invoice,
      items: itemsToInsert,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Something went wrong" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
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

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") || "all" // all, draft, sent, paid, overdue
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")

    const offset = (page - 1) * limit

    // Invoices list joining clients to get client details
    let query = supabase
      .from("invoices")
      .select(`
        *,
        client:clients(id, name, phone, company_name)
      `)
      .eq("business_id", business.id)

    // Filter status
    if (status !== "all") {
      if (status === "overdue") {
        query = query.or("status.eq.overdue,and(status.in.(sent,viewed),due_date.lt.now())")
      } else {
        query = query.eq("status", status)
      }
    }

    query = query.order("created_at", { ascending: false })

    const { data: invoices, error } = await query

    if (error) throw error

    if (!invoices) {
      return NextResponse.json({ invoices: [], totalCount: 0 })
    }

    // Apply Search in Javascript because client columns are nested
    let filteredInvoices = invoices
    if (search) {
      const s = search.toLowerCase()
      filteredInvoices = invoices.filter((inv) => {
        const numMatch = inv.invoice_number.toLowerCase().includes(s)
        const clientNameMatch = inv.client?.name?.toLowerCase().includes(s)
        const companyMatch = inv.client?.company_name?.toLowerCase().includes(s)
        return numMatch || clientNameMatch || companyMatch
      })
    }

    // Perform JS pagination
    const totalCount = filteredInvoices.length
    const paginatedInvoices = filteredInvoices.slice(offset, offset + limit)

    return NextResponse.json({
      invoices: paginatedInvoices,
      totalCount,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Something went wrong" }, { status: 500 })
  }
}
