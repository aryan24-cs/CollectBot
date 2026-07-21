import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"
import { requireBusinessUser } from "@/lib/auth/checkRole"
import { clientSchema } from "@/lib/validations/client"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: authErr, business } = await requireBusinessUser(request)
  if (authErr) return authErr

  try {
    const { id } = await params
    const supabase = getSupabaseServiceRoleClient()

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

    const totalInvoicesCount = invoices?.length || 0
    const paidInvoices = (invoices || []).filter((inv) => inv.status === "paid")
    const totalPaidCount = paidInvoices.length

    // Calculate average payment days (paid_at - issue_date)
    let totalPaymentDays = 0
    let countPaidWithDates = 0
    paidInvoices.forEach((inv) => {
      if (inv.paid_at && inv.issue_date) {
        const days = Math.round(
          (new Date(inv.paid_at).getTime() - new Date(inv.issue_date).getTime()) / (1000 * 3600 * 24)
        )
        if (days >= 0) {
          totalPaymentDays += days
          countPaidWithDates++
        }
      }
    })

    const avgPaymentDays = countPaidWithDates > 0 ? Math.round(totalPaymentDays / countPaidWithDates) : 0

    const mappedInvoices = (invoices || []).map((inv) => {
      let isOverdue = false
      if (["sent", "viewed", "partial"].includes(inv.status)) {
        if (new Date(inv.due_date) < new Date()) {
          isOverdue = true
        }
      }
      return {
        ...inv,
        displayStatus: isOverdue ? "overdue" : inv.status,
      }
    })

    return NextResponse.json({
      client,
      invoices: mappedInvoices,
      stats: {
        totalInvoicesCount,
        totalPaidCount,
        avgPaymentDays,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Something went wrong" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: authErr, business } = await requireBusinessUser(request)
  if (authErr) return authErr

  try {
    const { id } = await params
    const supabase = getSupabaseServiceRoleClient()

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
  const { error: authErr, business } = await requireBusinessUser(request)
  if (authErr) return authErr

  try {
    const { id } = await params
    const adminDb = getSupabaseServiceRoleClient()

    // Verify the client belongs to this business
    const { data: client } = await adminDb
      .from("clients")
      .select("id, name")
      .eq("id", id)
      .eq("business_id", business.id)
      .maybeSingle()

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    // 1. Get all invoice IDs for this client
    const { data: invoices } = await adminDb
      .from("invoices")
      .select("id")
      .eq("client_id", id)

    const invoiceIds = (invoices || []).map((inv: any) => inv.id)

    if (invoiceIds.length > 0) {
      // 2. Delete invoice_items for all invoices
      await adminDb
        .from("invoice_items")
        .delete()
        .in("invoice_id", invoiceIds)

      // 3. Delete payments for all invoices
      await adminDb
        .from("payments")
        .delete()
        .in("invoice_id", invoiceIds)

      // 4. Delete reminder_logs for all invoices
      await adminDb
        .from("reminder_logs")
        .delete()
        .in("invoice_id", invoiceIds)

      // 5. Delete recurring_schedules linked to this client
      try {
        await adminDb
          .from("recurring_schedules")
          .delete()
          .eq("client_id", id)
      } catch (_) {
        // Table may not exist, safe to skip
      }

      // 6. Delete all invoices for this client
      await adminDb
        .from("invoices")
        .delete()
        .eq("client_id", id)
    }

    // 7. Delete the client record itself
    const { error: deleteError } = await adminDb
      .from("clients")
      .delete()
      .eq("id", id)
      .eq("business_id", business.id)

    if (deleteError) throw deleteError

    // Log the deletion
    await adminDb.from("activity_logs").insert({
      business_id: business.id,
      type: "client_deleted",
      description: `Client "${client.name}" and all associated data (${invoiceIds.length} invoices) were permanently erased.`,
      metadata: { client_id: id, invoices_deleted: invoiceIds.length },
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("Client deletion error:", err)
    return NextResponse.json({ error: err.message || "Something went wrong" }, { status: 500 })
  }
}
