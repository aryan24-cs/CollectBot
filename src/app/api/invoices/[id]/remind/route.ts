import { NextRequest, NextResponse } from "next/server"
import getSupabaseServerClient from "@/lib/supabase/server"
import { sendFriendlyReminder, sendOverdueReminder } from "@/lib/whatsapp/templates"
import { sendReminderEmail } from "@/lib/email/send"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { channel: rawChannel } = body // 'whatsapp' | 'email' | 'both'
    const channel = "email" // Forced email only for now

    const supabase = await getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 1. Get business of this user
    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()

    if (!business) {
      return NextResponse.json({ error: "Business profile not found" }, { status: 400 })
    }

    // 2. Fetch invoice with details
    const { data: invoice, error: invoiceError } = await supabase
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

    // 3. Verify invoice is unpaid
    if (invoice.status === "paid" || invoice.status === "cancelled") {
      return NextResponse.json(
        { error: `Cannot send reminders for invoice that is already ${invoice.status}` },
        { status: 400 }
      )
    }

    const todayISTString = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date())
    const today = new Date(todayISTString)
    const dueDate = new Date(invoice.due_date)
    const diffMs = today.getTime() - dueDate.getTime()
    const daysDiff = Math.round(diffMs / (1000 * 60 * 60 * 24))

    const isOverdue = daysDiff >= 0
    const formattedAmount = `₹${Number(invoice.total).toLocaleString("en-IN")}`
    const sentVia: string[] = []

    // 4. Send WhatsApp (Disabled for now)
    if (false && invoice.client.phone) {
      try {
        let waResult
        if (!isOverdue) {
          waResult = await sendFriendlyReminder({
            phone: invoice.client.phone,
            clientName: invoice.client.name,
            amount: formattedAmount,
            businessName: invoice.business.name,
            dueDate: invoice.due_date,
            paymentLink: invoice.payment_link || "",
          })
        } else {
          waResult = await sendOverdueReminder({
            phone: invoice.client.phone,
            clientName: invoice.client.name,
            amount: formattedAmount,
            businessName: invoice.business.name,
            daysOverdue: Math.max(1, daysDiff),
            paymentLink: invoice.payment_link || "",
          })
        }

        if (waResult.success) {
          sentVia.push("whatsapp")
          await supabase.from("reminder_logs").insert({
            invoice_id: invoice.id,
            business_id: invoice.business.id,
            reminder_type: "manual",
            channel: "whatsapp",
            status: "sent",
            message_content: `Manual WhatsApp sent to +91${invoice.client.phone.slice(-10)}`,
          })
        } else {
          await supabase.from("reminder_logs").insert({
            invoice_id: invoice.id,
            business_id: invoice.business.id,
            reminder_type: "manual",
            channel: "whatsapp",
            status: "failed",
            error_message: waResult.error || "Interakt API failed",
          })
        }
      } catch (waErr: any) {
        console.error("Manual WhatsApp trigger failed:", waErr)
        await supabase.from("reminder_logs").insert({
          invoice_id: invoice.id,
          business_id: invoice.business.id,
          reminder_type: "manual",
          channel: "whatsapp",
          status: "failed",
          error_message: waErr.message || "WhatsApp send crashed",
        })
      }
    }

    // 5. Send Email (Forced true to always send email manually)
    if (true && invoice.client.email) {
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
          daysOverdue: Math.max(0, daysDiff),
        })

        sentVia.push("email")
        await supabase.from("reminder_logs").insert({
          invoice_id: invoice.id,
          business_id: invoice.business.id,
          reminder_type: "manual",
          channel: "email",
          status: "sent",
          message_content: `Manual Email sent to ${invoice.client.email}`,
        })
      } catch (mailErr: any) {
        console.error("Manual Email trigger failed:", mailErr)
        await supabase.from("reminder_logs").insert({
          invoice_id: invoice.id,
          business_id: invoice.business.id,
          reminder_type: "manual",
          channel: "email",
          status: "failed",
          error_message: mailErr.message || "Resend dispatch crashed",
        })
      }
    }

    // 6. Update reminder count on invoice if at least one was sent successfully
    if (sentVia.length > 0) {
      await supabase
        .from("invoices")
        .update({
          reminder_count: (Number(invoice.reminder_count) || 0) + 1,
        })
        .eq("id", invoice.id)
    }

    return NextResponse.json({ success: true, sentVia })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Something went wrong" }, { status: 500 })
  }
}
