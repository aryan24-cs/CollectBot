import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"
import { requireBusinessUser } from "@/lib/auth/checkRole"
import { sendReminderEmail } from "@/lib/email/send"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: authError, business } = await requireBusinessUser(request)
  if (authError) return authError

  try {
    const { id } = await params
    const adminDb = getSupabaseServiceRoleClient()

    // Fetch invoice with details
    const { data: invoice, error: invoiceError } = await adminDb
      .from("invoices")
      .select(`
        *,
        client:clients(*),
        business:businesses(*)
      `)
      .eq("id", id)
      .eq("business_id", business.id)
      .maybeSingle()

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    // Verify invoice is unpaid
    if (invoice.status === "paid" || invoice.status === "cancelled") {
      return NextResponse.json(
        { error: `Cannot send reminders for invoice that is already ${invoice.status}` },
        { status: 400 }
      )
    }

    const todayISTString = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date())
    const today = new Date(todayISTString)
    const dueDate = new Date(invoice.due_date)

    const diffTime = today.getTime() - dueDate.getTime()
    const daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    const isOverdue = daysOverdue > 0
    const formattedAmount = `₹${Number(invoice.balance_due || invoice.total).toLocaleString("en-IN")}`
    const sentVia: string[] = []

    // Send Email Reminder
    if (invoice.client?.email) {
      try {
        await sendReminderEmail({
          to: invoice.client.email,
          businessName: invoice.business.name,
          clientName: invoice.client.name,
          invoiceNumber: invoice.invoice_number,
          amount: formattedAmount,
          dueDate: invoice.due_date,
          paymentLink: invoice.payment_link || "",
          reminderType: isOverdue ? "overdue" : "friendly",
          daysOverdue: Math.max(0, daysOverdue),
        })

        sentVia.push("email")

        await adminDb.from("reminder_logs").insert({
          invoice_id: invoice.id,
          business_id: invoice.business.id,
          reminder_type: "manual",
          channel: "email",
          status: "sent",
          message_content: `Manual reminder successfully sent to ${invoice.client.email}`,
        })
      } catch (mailErr: any) {
        console.error("Email reminder dispatch failed:", mailErr)
      }
    }

    // Update reminder count and timestamp on invoice
    const currentCount = invoice.reminder_count || 0
    await adminDb
      .from("invoices")
      .update({
        reminder_count: currentCount + 1,
      })
      .eq("id", id)

    // Log Activity
    await adminDb.from("activity_logs").insert({
      business_id: invoice.business.id,
      type: "reminder_sent",
      description: `Manual reminder for Invoice ${invoice.invoice_number} was dispatched.`,
      metadata: { invoice_id: id, sent_via: sentVia },
    })

    return NextResponse.json({
      success: true,
      sentVia,
      message: `Reminder sent to ${sentVia.join(" & ") || "client"}`,
    })
  } catch (err: any) {
    console.error("POST /api/invoices/[id]/remind error:", err)
    return NextResponse.json({ error: err.message || "Something went wrong" }, { status: 500 })
  }
}
