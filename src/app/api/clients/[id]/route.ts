import { NextRequest, NextResponse } from "next/server"
import getSupabaseServerClient from "@/lib/supabase/server"
import { clientSchema } from "@/lib/validations/client"

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

    // Fetch client details
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("*")
      .eq("id", id)
      .eq("business_id", business.id)
      .maybeSingle()

    if (clientError || !client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    // Fetch invoice history for statistics
    const { data: invoices, error: invoiceError } = await supabase
      .from("invoices")
      .select("id, invoice_number, status, total, balance_due, due_date, paid_at, issue_date, created_at")
      .eq("client_id", id)
      .order("created_at", { ascending: false })

    if (invoiceError) throw invoiceError

    const totalInvoicesCount = invoices.length
    const paidInvoices = invoices.filter((inv) => inv.status === "paid")
    const totalPaidCount = paidInvoices.length

    // Calculate average payment days (paid_at - issue_date)
    let totalPaymentDays = 0
    let countPaidWithDates = 0
    paidInvoices.forEach((inv) => {
      if (inv.paid_at && inv.issue_date) {
        const days = Math.round(
          (new Date(inv.paid_at).getTime() - new Date(inv.issue_date).getTime()) / (1000 * 3600 * 24)
        )
        totalPaymentDays += Math.max(0, days)
        countPaidWithDates++
      }
    })

    const averagePaymentDays = countPaidWithDates > 0 ? Math.round(totalPaymentDays / countPaidWithDates) : 0
    const onTimePaymentRate = totalPaidCount > 0
      ? Math.round(
          (paidInvoices.filter((inv) => {
            if (inv.paid_at && inv.due_date) {
              return new Date(inv.paid_at) <= new Date(inv.due_date)
            }
            return true
          }).length /
            totalPaidCount) *
            100
        )
      : 100

    // Fetch reminder history
    let reminderHistory: any[] = []
    if (invoices.length > 0) {
      const invoiceIds = invoices.map((i) => i.id)
      const { data: remLogs } = await supabase
        .from("reminder_logs")
        .select("id, invoice_id, reminder_type, channel, status, sent_at, message_content")
        .in("invoice_id", invoiceIds)
        .order("sent_at", { ascending: false })

      reminderHistory = remLogs || []
    }

    return NextResponse.json({
      client: {
        ...client,
        outstanding_amount: Math.max(0, (Number(client.total_invoiced) || 0) - (Number(client.total_paid) || 0)),
      },
      stats: {
        totalInvoiced: Number(client.total_invoiced) || 0,
        totalPaid: Number(client.total_paid) || 0,
        outstandingBalance: Math.max(0, (Number(client.total_invoiced) || 0) - (Number(client.total_paid) || 0)),
        averagePaymentDays,
        onTimePaymentRate,
      },
      invoices: invoices || [],
      reminders: reminderHistory,
    })
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

    const body = await request.json()
    const validation = clientSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.format() }, { status: 400 })
    }

    const clientData = validation.data
    let cleanedPhone = clientData.phone.replace(/\s+/g, "")
    if (cleanedPhone.startsWith("+91")) {
      cleanedPhone = cleanedPhone.substring(3)
    } else if (cleanedPhone.startsWith("0")) {
      cleanedPhone = cleanedPhone.substring(1)
    }

    const { data: client, error: updateError } = await supabase
      .from("clients")
      .update({
        name: clientData.name,
        email: clientData.email || null,
        phone: cleanedPhone,
        company_name: clientData.company_name || null,
        address: clientData.address || null,
        gstin: clientData.gstin || null,
        payment_terms: clientData.payment_terms,
        notes: clientData.notes || null,
        tags: clientData.tags || [],
      })
      .eq("id", id)
      .eq("business_id", business.id)
      .select()
      .single()

    if (updateError) throw updateError

    // Log activity
    await supabase.from("activity_logs").insert({
      business_id: business.id,
      type: "client_updated",
      description: `Client details for "${clientData.name}" were updated.`,
      metadata: { client_id: id },
    })

    return NextResponse.json(client)
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

    // Check if client has unpaid invoices
    const { data: unpaidInvoices } = await supabase
      .from("invoices")
      .select("id, invoice_number")
      .eq("client_id", id)
      .in("status", ["sent", "viewed", "overdue", "partial"])

    if (unpaidInvoices && unpaidInvoices.length > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete client. This client has unpaid invoices. Please resolve or cancel them first.",
          unpaidCount: unpaidInvoices.length,
        },
        { status: 400 }
      )
    }

    // Delete client record (invoices will stay, but client_id sets to NULL due to ON DELETE SET NULL constraint)
    const { error: deleteError } = await supabase
      .from("clients")
      .delete()
      .eq("id", id)
      .eq("business_id", business.id)

    if (deleteError) throw deleteError

    // Log activity
    await supabase.from("activity_logs").insert({
      business_id: business.id,
      type: "client_deleted",
      description: `Client ID ${id} was deleted.`,
      metadata: { client_id: id },
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Something went wrong" }, { status: 500 })
  }
}
