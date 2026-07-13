import { NextRequest, NextResponse } from "next/server"
import getSupabaseServerClient from "@/lib/supabase/server"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"
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

    // 5. Generate Razorpay Payment Link & Auto-Dispatch
    try {
      const { data: fullInvoice } = await supabase
        .from("invoices")
        .select(`
          *,
          client:clients(*),
          business:businesses(*)
        `)
        .eq("id", invoice.id)
        .single()

      if (fullInvoice && fullInvoice.client) {
        const paymentDetails = {
          invoiceId: invoice.id,
          invoiceNumber: invoice_number,
          amount: Number(total),
          clientName: fullInvoice.client.name,
          clientEmail: fullInvoice.client.email || "",
          clientPhone: fullInvoice.client.phone || "",
          businessName: fullInvoice.business.name,
          businessId: fullInvoice.business.id,
          dueDate: due_date,
        }

        const { createPaymentLink } = await import("@/lib/razorpay/createPaymentLink")
        const paymentLinkData = await createPaymentLink(paymentDetails)

        if (paymentLinkData) {
          const paymentLinkUrl = paymentLinkData.url
          const paymentLinkId = paymentLinkData.id

          // Update status to sent with the payment link
          await supabase
            .from("invoices")
            .update({
              payment_link: paymentLinkUrl,
              payment_link_id: paymentLinkId,
              status: "sent",
              sent_at: new Date().toISOString(),
            })
            .eq("id", invoice.id)
          
          invoice.payment_link = paymentLinkUrl
          invoice.payment_link_id = paymentLinkId
          invoice.status = "sent"
          invoice.sent_at = new Date().toISOString()

          // 6. Non-blocking Background PDF Generation & Email Dispatch
          const triggerBackgroundDispatch = async () => {
            try {
              const bgSupabase = getSupabaseServiceRoleClient()
              const { data: invoiceWithItems } = await bgSupabase
                .from("invoices")
                .select(`
                  *,
                  client:clients(*),
                  items:invoice_items(*),
                  business:businesses(*)
                `)
                .eq("id", invoice.id)
                .single()

              if (!invoiceWithItems) return

              // Render PDF
              const { renderToBuffer } = await import("@react-pdf/renderer")
              const React = await import("react")
              const InvoiceDocument = (await import("@/lib/pdf/InvoiceDocument")).default

              const pdfBuffer = await renderToBuffer(
                React.createElement(InvoiceDocument, {
                  invoice: invoiceWithItems,
                  client: invoiceWithItems.client,
                  items: invoiceWithItems.items,
                  business: invoiceWithItems.business,
                }) as any
              )

              const fileName = `invoices/${invoiceWithItems.business.id}/${invoiceWithItems.id}.pdf`
              const { error: uploadError } = await bgSupabase.storage
                .from("invoices")
                .upload(fileName, pdfBuffer, {
                  contentType: "application/pdf",
                  upsert: true,
                })

              let pdfPublicUrl = ""
              if (!uploadError) {
                const { data: { publicUrl } } = bgSupabase.storage
                  .from("invoices")
                  .getPublicUrl(fileName)
                
                await bgSupabase
                  .from("invoices")
                  .update({ pdf_url: publicUrl })
                  .eq("id", invoice.id)

                pdfPublicUrl = publicUrl
              }

              // Send email if client email exists
              if (invoiceWithItems.client.email) {
                const { sendInvoiceEmail } = await import("@/lib/email/send")
                const formattedAmount = `₹${Number(invoiceWithItems.total).toLocaleString("en-IN")}`
                
                await sendInvoiceEmail({
                  to: invoiceWithItems.client.email,
                  businessName: invoiceWithItems.business.name,
                  businessLogo: invoiceWithItems.business.logo_url,
                  clientName: invoiceWithItems.client.name,
                  invoiceNumber: invoiceWithItems.invoice_number,
                  amount: formattedAmount,
                  dueDate: invoiceWithItems.due_date,
                  paymentLink: paymentLinkUrl,
                  items: invoiceWithItems.items.map((item: any) => ({
                    description: item.description,
                    amount: `₹${Number(item.amount).toLocaleString("en-IN")}`,
                  })),
                  businessPhone: invoiceWithItems.business.phone || "",
                  businessEmail: invoiceWithItems.business.email || "",
                  pdfUrl: pdfPublicUrl || null,
                })

                await bgSupabase.from("reminder_logs").insert({
                  invoice_id: invoice.id,
                  business_id: invoiceWithItems.business.id,
                  reminder_type: "invoice_sent",
                  channel: "email",
                  status: "sent",
                  message_content: `Invoice automatically emailed to ${invoiceWithItems.client.email}`,
                })
              }
            } catch (bgErr) {
              console.error("Background invoice dispatch failed:", bgErr)
            }
          }

          triggerBackgroundDispatch().catch(e => console.error("Auto-dispatch runner failed:", e))
        }
      }
    } catch (autoSendErr) {
      console.error("Auto-send links setup failed:", autoSendErr)
    }

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
