import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"
import { requireBusinessUser } from "@/lib/auth/checkRole"
import { invoiceSchema } from "@/lib/validations/invoice"

export async function POST(request: NextRequest) {
  const { error: authError, business } = await requireBusinessUser(request)
  if (authError) return authError

  try {
    const adminDb = getSupabaseServiceRoleClient()

    const body = await request.json()
    const validation = invoiceSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.format() }, { status: 400 })
    }

    const { client_id, invoice_number, issue_date, due_date, discount, notes, terms, is_recurring, items } = validation.data

    // Check uniqueness of invoice number
    const { data: existingInv } = await adminDb
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
    const { data: invoice, error: invoiceError } = await adminDb
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

    // Insert Line Items
    const itemsToInsert = preparedItems.map((item) => ({
      ...item,
      invoice_id: invoice.id,
    }))

    const { error: itemsError } = await adminDb
      .from("invoice_items")
      .insert(itemsToInsert)

    if (itemsError) throw itemsError

    // Increment business invoice_counter
    const currentCounter = business.invoice_counter || 1
    await adminDb
      .from("businesses")
      .update({ invoice_counter: currentCounter + 1 })
      .eq("id", business.id)

    // Update client total_invoiced
    const { data: clientData } = await adminDb
      .from("clients")
      .select("total_invoiced")
      .eq("id", client_id)
      .single()

    if (clientData) {
      await adminDb
        .from("clients")
        .update({
          total_invoiced: Number(clientData.total_invoiced || 0) + total,
        })
        .eq("id", client_id)
    }

    // Log Activity
    await adminDb.from("activity_logs").insert({
      business_id: business.id,
      type: "invoice_created",
      description: `Invoice ${invoice_number} created for ${total}`,
      metadata: { invoice_id: invoice.id, total },
    })

    return NextResponse.json({
      ...invoice,
      items: itemsToInsert,
    })
  } catch (err: any) {
    console.error("POST /api/invoices error:", err)
    return NextResponse.json({ error: err.message || "Something went wrong" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const { error: authError, business } = await requireBusinessUser(request)
  if (authError) return authError

  try {
    const adminDb = getSupabaseServiceRoleClient()

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") || "all"
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")

    const offset = (page - 1) * limit

    // Invoices list joining clients to get client details
    let query = adminDb
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

    // Calculate business summary stats across all non-cancelled invoices
    let totalInvoiced = 0
    let collected = 0
    let outstanding = 0
    let overdue = 0
    const todayStr = new Date().toISOString().split("T")[0]

    for (const inv of invoices) {
      const totalVal = Number(inv.total) || 0
      const paidVal = Number(inv.amount_paid) || 0
      const dueVal = Number(inv.balance_due) || 0

      if (inv.status !== "cancelled") {
        totalInvoiced += totalVal
        collected += paidVal

        if (["sent", "viewed", "overdue", "partial"].includes(inv.status)) {
          outstanding += dueVal
        }

        if (inv.status === "overdue" || (["sent", "viewed", "partial"].includes(inv.status) && inv.due_date && inv.due_date < todayStr)) {
          overdue += dueVal
        }
      }
    }

    // Apply Search
    let filteredInvoices = invoices
    if (search) {
      const s = search.toLowerCase()
      filteredInvoices = invoices.filter((inv) => {
        const numMatch = inv.invoice_number?.toLowerCase().includes(s)
        const clientNameMatch = inv.client?.name?.toLowerCase().includes(s)
        const companyMatch = inv.client?.company_name?.toLowerCase().includes(s)
        return numMatch || clientNameMatch || companyMatch
      })
    }

    const totalCount = filteredInvoices.length
    const paginatedInvoices = filteredInvoices.slice(offset, offset + limit)

    return NextResponse.json({
      invoices: paginatedInvoices,
      totalCount,
      stats: {
        totalInvoiced,
        collected,
        outstanding,
        overdue,
      },
    })
  } catch (err: any) {
    console.error("GET /api/invoices error:", err)
    return NextResponse.json({ error: err.message || "Something went wrong" }, { status: 500 })
  }
}
